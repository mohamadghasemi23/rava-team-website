'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS } from '@/lib/authz/permissions'
import { authorizeSiteFeature, FeatureAccessError } from '@/lib/entitlements/runtime'
import { createTraceContext, recordErrorEvent } from '@/lib/observability/events'

export type DesignActionState = { ok?: boolean; message?: string; errorId?: string; nonce?: number }

const DESIGN_MODULE = 'design'

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function jsonObject(raw: FormDataEntryValue | null, fallback: Record<string, unknown> = {}) {
  const text = String(raw ?? '').trim()
  if (!text) return fallback
  const parsed = JSON.parse(text) as unknown
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('invalid_json_object')
  return parsed as Record<string, unknown>
}

function publicFailureMessage(error: unknown, fallback: string) {
  if (!(error instanceof FeatureAccessError)) return fallback
  if (error.code === 'permission_denied') return 'این حساب Permission لازم برای این عملیات طراحی را ندارد.'
  if (['not_entitled','disabled','suspended','expired','not_started'].includes(error.code)) {
    return 'ماژول طراحی برای این سایت در وضعیت قابل استفاده نیست. قرارداد و Entitlement سایت را بررسی کنید.'
  }
  if (error.code === 'scope_denied') return 'این حساب به Scope این سایت دسترسی ندارد.'
  return 'بررسی دسترسی تجاری این قابلیت کامل نشد. شناسه خطا را برای بررسی نگه دارید.'
}

async function failure(error: unknown, eventType: string, siteId: string, message: string): Promise<DesignActionState> {
  const trace = createTraceContext()
  const publicMessage = publicFailureMessage(error, message)
  const logged = await recordErrorEvent({
    error,
    category: 'design.engine',
    eventType,
    publicMessage,
    siteId,
    route: `/admin/platform/sites/${siteId}/design`,
    context: { siteId, accessCode: error instanceof FeatureAccessError ? error.code : null },
    requestId: trace.requestId,
    correlationId: trace.correlationId,
    severity: error instanceof FeatureAccessError ? 'warning' : 'error',
    explanationFa: error instanceof FeatureAccessError
      ? 'عملیات قبل از اجرا توسط Permission یا Entitlement Runtime Gate متوقف شده است.'
      : 'عملیات طراحی به دلیل ورودی نامعتبر یا خطای پایگاه داده کامل نشده است.',
    explanationEn: error instanceof FeatureAccessError
      ? 'The operation was stopped by the permission or entitlement runtime gate before execution.'
      : 'The design operation did not complete because of invalid input or a database error.',
  })
  const first = Array.isArray(logged.data) ? logged.data[0] : logged.data
  const errorId = first && typeof first === 'object' && 'error_id' in first ? String(first.error_id) : undefined
  return { ok:false, message:errorId ? `${publicMessage} شناسه خطا: ${errorId}` : publicMessage, errorId, nonce:Date.now() }
}

function refresh(siteId: string) {
  revalidatePath(`/admin/platform/sites/${siteId}`)
  revalidatePath(`/admin/platform/sites/${siteId}/design`)
}

async function authorize(siteId: string, permissions: readonly (typeof PERMISSIONS)[keyof typeof PERMISSIONS][], operation: string) {
  return authorizeSiteFeature({
    siteId,
    moduleKey: DESIGN_MODULE,
    permissions,
    route: `/admin/platform/sites/${siteId}/design`,
    operation,
  })
}

export async function applyTemplateAction(_state: DesignActionState, formData: FormData): Promise<DesignActionState> {
  const siteId=String(formData.get('site_id')??'')
  const templateVersionId=String(formData.get('template_version_id')??'')
  if(!validUuid(siteId)||!validUuid(templateVersionId)) return {ok:false,message:'شناسه سایت یا نسخه قالب معتبر نیست.',nonce:Date.now()}
  try {
    await authorize(siteId,[PERMISSIONS.PLATFORM_SITES_MANAGE,PERMISSIONS.DESIGN_MANAGE],'template.apply')
    const overrides=jsonObject(formData.get('theme_overrides'))
    const supabase=await createClient()
    const {data,error}=await supabase.rpc('apply_template_to_site',{p_site_id:siteId,p_template_version_id:templateVersionId,p_theme_overrides:overrides,p_note:String(formData.get('note')??'').trim()||null})
    if(error) return failure(error,'design.template.apply_failed',siteId,'اعمال قالب انجام نشد.')
    const first=Array.isArray(data)?data[0]:data
    refresh(siteId)
    return {ok:true,message:`قالب به Draft اعمال شد${first&&typeof first==='object'&&'revision' in first?` · Revision ${String(first.revision)}`:''}. برای نمایش عمومی باید Publish شود.`,nonce:Date.now()}
  } catch(error) { return failure(error,'design.template.apply_failed',siteId,'اعمال قالب انجام نشد.') }
}

export async function saveDesignDraftAction(_state: DesignActionState, formData: FormData): Promise<DesignActionState> {
  const siteId=String(formData.get('site_id')??'')
  if(!validUuid(siteId)) return {ok:false,message:'شناسه سایت معتبر نیست.',nonce:Date.now()}
  try {
    await authorize(siteId,[PERMISSIONS.PLATFORM_SITES_MANAGE,PERMISSIONS.DESIGN_MANAGE],'draft.save')
    const theme=jsonObject(formData.get('theme_config'))
    const layout=jsonObject(formData.get('layout_config'))
    const supabase=await createClient()
    const {data,error}=await supabase.rpc('save_site_design_draft',{p_site_id:siteId,p_theme_config:theme,p_layout_config:layout,p_note:String(formData.get('note')??'').trim()||null})
    if(error) return failure(error,'design.draft.save_failed',siteId,'ذخیره Draft انجام نشد.')
    const first=Array.isArray(data)?data[0]:data
    refresh(siteId)
    return {ok:true,message:`Draft ذخیره شد${first&&typeof first==='object'&&'revision' in first?` · Revision ${String(first.revision)}`:''}.`,nonce:Date.now()}
  } catch(error) { return failure(error,'design.draft.save_failed',siteId,'JSON طراحی معتبر نیست یا ذخیره Draft انجام نشد.') }
}

export async function publishDesignAction(_state: DesignActionState, formData: FormData): Promise<DesignActionState> {
  const siteId=String(formData.get('site_id')??'')
  if(!validUuid(siteId)) return {ok:false,message:'شناسه سایت معتبر نیست.',nonce:Date.now()}
  try {
    await authorize(siteId,[PERMISSIONS.PLATFORM_SITES_MANAGE,PERMISSIONS.DESIGN_PUBLISH],'release.publish')
    const supabase=await createClient()
    const {data,error}=await supabase.rpc('publish_site_design',{p_site_id:siteId,p_release_note:String(formData.get('release_note')??'').trim()||null})
    if(error) return failure(error,'design.release.publish_failed',siteId,'Publish طراحی انجام نشد.')
    const first=Array.isArray(data)?data[0]:data
    refresh(siteId)
    return {ok:true,message:`Release منتشر شد${first&&typeof first==='object'&&'release_number' in first?` · Release #${String(first.release_number)}`:''}.`,nonce:Date.now()}
  } catch(error) { return failure(error,'design.release.publish_failed',siteId,'Publish طراحی انجام نشد.') }
}

export async function rollbackDesignAction(_state: DesignActionState, formData: FormData): Promise<DesignActionState> {
  const siteId=String(formData.get('site_id')??'')
  const targetReleaseId=String(formData.get('target_release_id')??'')
  if(!validUuid(siteId)||!validUuid(targetReleaseId)) return {ok:false,message:'شناسه سایت یا Release معتبر نیست.',nonce:Date.now()}
  try {
    await authorize(siteId,[PERMISSIONS.PLATFORM_SITES_MANAGE,PERMISSIONS.DESIGN_ROLLBACK],'release.rollback')
    const supabase=await createClient()
    const {data,error}=await supabase.rpc('rollback_site_design',{p_site_id:siteId,p_target_release_id:targetReleaseId,p_release_note:String(formData.get('release_note')??'').trim()||null})
    if(error) return failure(error,'design.release.rollback_failed',siteId,'Rollback انجام نشد.')
    const first=Array.isArray(data)?data[0]:data
    refresh(siteId)
    return {ok:true,message:`Rollback با ساخت Release جدید انجام شد${first&&typeof first==='object'&&'release_number' in first?` · Release #${String(first.release_number)}`:''}.`,nonce:Date.now()}
  } catch(error) { return failure(error,'design.release.rollback_failed',siteId,'Rollback انجام نشد.') }
}
