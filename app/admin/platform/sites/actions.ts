'use server'

import { provisionOrganizationSite } from '@/lib/platform/provisioning'
import { createTraceContext, recordAuditEvent, recordErrorEvent } from '@/lib/observability/events'
import {getAdminLocale} from '@/lib/i18n/admin-locale'

export type ProvisionActionState = {
  ok?: boolean
  message?: string
  redirectTo?: string
  nonce?: number
  errorId?: string
}

const messagesFa: Record<string, string> = {
  authentication_required: 'برای ساخت سایت باید دوباره وارد حساب مدیریتی شوید.',
  permission_denied: 'این حساب اجازه ساخت مشتری یا سایت جدید را ندارد.',
  invalid_organization_name: 'نام مشتری معتبر نیست.',
  invalid_organization_slug: 'شناسه مشتری معتبر نیست.',
  invalid_site_name: 'نام سایت معتبر نیست.',
  invalid_site_slug: 'شناسه سایت معتبر نیست.',
  invalid_locale: 'زبان اصلی معتبر نیست.',
  invalid_currency: 'واحد پول معتبر نیست.',
  invalid_timezone: 'منطقه زمانی معتبر نیست.',
  invalid_provisioning_input: 'اطلاعات ساخت سایت معتبر نیست.',
  organization_or_site_already_exists: 'شناسه مشتری یا سایت قبلاً استفاده شده است.',
  invalid_provisioning_result: 'ساخت سایت کامل نشد. شناسه خطا را برای بررسی نگه دارید.',
  provisioning_failed: 'ساخت سایت انجام نشد. جزئیات فنی برای کاربر نمایش داده نمی‌شود.',
}
const messagesEn:Record<string,string>={authentication_required:'Sign in again before creating a site.',permission_denied:'This account cannot create customers or sites.',invalid_organization_name:'The customer name is invalid.',invalid_organization_slug:'The customer identifier is invalid.',invalid_site_name:'The site name is invalid.',invalid_site_slug:'The site identifier is invalid.',invalid_locale:'The primary language is invalid.',invalid_currency:'The currency is invalid.',invalid_timezone:'The time zone is invalid.',invalid_provisioning_input:'The site provisioning details are invalid.',organization_or_site_already_exists:'The customer or site identifier is already in use.',invalid_provisioning_result:'Site provisioning did not complete. Keep the Error ID for investigation.',provisioning_failed:'The site could not be created. Technical details are not exposed to users.'}

export async function provisionSiteAction(_state: ProvisionActionState, formData: FormData): Promise<ProvisionActionState> {
  const locale=await getAdminLocale(),messages=locale==='fa'?messagesFa:messagesEn
  const trace = createTraceContext()
  const requested = {
    organizationName: String(formData.get('organization_name') ?? ''),
    organizationSlug: String(formData.get('organization_slug') ?? ''),
    siteName: String(formData.get('site_name') ?? ''),
    siteSlug: String(formData.get('site_slug') ?? ''),
    primaryLocale: String(formData.get('primary_locale') ?? 'fa'),
    defaultCurrency: String(formData.get('default_currency') ?? 'IRR'),
    timezone: String(formData.get('timezone') ?? 'Asia/Tehran'),
  }

  try {
    const result = await provisionOrganizationSite(requested)

    await recordAuditEvent({
      action: 'platform.site.provisioned',
      entityType: 'site',
      entityId: result.siteId,
      organizationId: result.organizationId,
      siteId: result.siteId,
      after: { organizationSlug: result.organizationSlug, siteSlug: result.siteSlug },
      context: { source: 'owner_control', primaryLocale: requested.primaryLocale, defaultCurrency: requested.defaultCurrency },
      requestId: trace.requestId,
      correlationId: trace.correlationId,
      severity: 'notice',
    })

    return {
      ok: true,
      message: locale==='fa'?`مشتری و سایت با موفقیت ساخته شدند. شناسه سایت: ${result.siteId}`:`Customer and site created successfully. Site ID: ${result.siteId}`,
      redirectTo: `/admin/platform/sites/${result.siteId}`,
      nonce: Date.now(),
    }
  } catch (error) {
    const key = error instanceof Error ? error.message : 'provisioning_failed'
    const logged = await recordErrorEvent({
      error,
      category: 'platform.provisioning',
      eventType: 'platform.site.provision_failed',
      publicMessage: messages[key] ?? messages.provisioning_failed,
      route: '/admin/platform/sites/new',
      context: { organizationSlug: requested.organizationSlug, siteSlug: requested.siteSlug },
      requestId: trace.requestId,
      correlationId: trace.correlationId,
      severity: key === 'permission_denied' ? 'warning' : 'error',
      explanationFa: key === 'permission_denied'
        ? 'حساب فعلی Permission لازم برای ساخت سایت را ندارد.'
        : 'ساخت سایت در یکی از مراحل اعتبارسنجی، مجوز یا تراکنش Provisioning کامل نشده است.',
      explanationEn: key === 'permission_denied'
        ? 'The current account does not have the required permission to provision a site.'
        : 'Site provisioning did not complete during validation, authorization, or the provisioning transaction.',
      probableCauses: key === 'organization_or_site_already_exists'
        ? ['شناسه مشتری یا سایت تکراری است.']
        : ['ورودی نامعتبر', 'مجوز ناکافی', 'خطای تراکنش دیتابیس یا زیرساخت'],
    })

    const first = Array.isArray(logged.data) ? logged.data[0] : logged.data
    const errorId = first && typeof first === 'object' && 'error_id' in first ? String(first.error_id) : undefined
    return {
      ok: false,
      message: errorId ? `${messages[key] ?? messages.provisioning_failed} ${locale==='fa'?'شناسه خطا':'Error ID'}: ${errorId}` : messages[key] ?? messages.provisioning_failed,
      errorId,
      nonce: Date.now(),
    }
  }
}
