'use server'

import { provisionOrganizationSite } from '@/lib/platform/provisioning'

export type ProvisionActionState = {
  ok?: boolean
  message?: string
  redirectTo?: string
  nonce?: number
}

const messages: Record<string, string> = {
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
  invalid_provisioning_result: 'ساخت سایت کامل نشد. عملیات را دوباره اجرا نکن و لاگ سیستم را بررسی کن.',
  provisioning_failed: 'ساخت سایت انجام نشد. جزئیات فنی برای کاربر نمایش داده نمی‌شود.',
}

export async function provisionSiteAction(_state: ProvisionActionState, formData: FormData): Promise<ProvisionActionState> {
  try {
    const result = await provisionOrganizationSite({
      organizationName: String(formData.get('organization_name') ?? ''),
      organizationSlug: String(formData.get('organization_slug') ?? ''),
      siteName: String(formData.get('site_name') ?? ''),
      siteSlug: String(formData.get('site_slug') ?? ''),
      primaryLocale: String(formData.get('primary_locale') ?? 'fa'),
      defaultCurrency: String(formData.get('default_currency') ?? 'IRR'),
      timezone: String(formData.get('timezone') ?? 'Asia/Tehran'),
    })

    return {
      ok: true,
      message: `مشتری و سایت با موفقیت ساخته شدند. Site ID: ${result.siteId}`,
      redirectTo: `/admin/platform/sites/${result.siteId}`,
      nonce: Date.now(),
    }
  } catch (error) {
    const key = error instanceof Error ? error.message : 'provisioning_failed'
    return { ok: false, message: messages[key] ?? messages.provisioning_failed, nonce: Date.now() }
  }
}
