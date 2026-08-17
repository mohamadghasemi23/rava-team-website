'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createTraceContext, recordErrorEvent } from '@/lib/observability/events'

export type AccessActionState = { ok?: boolean; message?: string; errorId?: string; nonce?: number }

function optionalUuid(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text || null
}

function scope(value: FormDataEntryValue | null) {
  const text = String(value ?? 'platform')
  return text === 'organization' || text === 'site' ? text : 'platform'
}

async function failure(error: unknown, eventType: string, message: string, context: Record<string, unknown> = {}): Promise<AccessActionState> {
  const trace = createTraceContext()
  const logged = await recordErrorEvent({
    error,
    category: 'access.control',
    eventType,
    publicMessage: message,
    route: '/admin/system/access',
    context,
    requestId: trace.requestId,
    correlationId: trace.correlationId,
    severity: 'warning',
    explanationFa: 'عملیات مدیریت دسترسی به دلیل ورودی نامعتبر، مجوز ناکافی یا خطای پایگاه داده کامل نشده است.',
    explanationEn: 'The access-control operation did not complete because of invalid input, insufficient permission, or a database error.',
  })
  const first = Array.isArray(logged.data) ? logged.data[0] : logged.data
  const errorId = first && typeof first === 'object' && 'error_id' in first ? String(first.error_id) : undefined
  return { ok: false, message: errorId ? `${message} شناسه خطا: ${errorId}` : message, errorId, nonce: Date.now() }
}

export async function createRoleAction(_state: AccessActionState, formData: FormData): Promise<AccessActionState> {
  const scopeType = scope(formData.get('scope_type'))
  const organizationId = optionalUuid(formData.get('organization_id'))
  const siteId = optionalUuid(formData.get('site_id'))
  const permissionKeys = formData.getAll('permission_keys').map(String).filter(Boolean)
  const key = String(formData.get('key') ?? '').trim().toLowerCase()
  const nameFa = String(formData.get('name_fa') ?? '').trim()
  const nameEn = String(formData.get('name_en') ?? '').trim()
  if (!/^[a-z0-9_.:-]{2,80}$/.test(key) || nameFa.length < 2 || nameEn.length < 2) return { ok:false, message:'کلید و نام نقش معتبر نیست.', nonce:Date.now() }

  const supabase = await createClient()
  const { error } = await supabase.rpc('create_custom_role', {
    p_scope_type: scopeType,
    p_key: key,
    p_name_fa: nameFa,
    p_name_en: nameEn,
    p_description_fa: String(formData.get('description_fa') ?? '').trim(),
    p_description_en: String(formData.get('description_en') ?? '').trim(),
    p_organization_id: organizationId,
    p_site_id: siteId,
    p_permission_keys: permissionKeys,
  })
  if (error) return failure(error, 'access.role.create_failed', 'ساخت نقش انجام نشد.', { scopeType, organizationId, siteId, key })
  revalidatePath('/admin/system/access')
  return { ok:true, message:'نقش جدید با موفقیت ساخته شد.', nonce:Date.now() }
}

export async function updateRolePermissionsAction(_state: AccessActionState, formData: FormData): Promise<AccessActionState> {
  const roleId = String(formData.get('role_id') ?? '')
  const permissionKeys = formData.getAll('permission_keys').map(String).filter(Boolean)
  if (!roleId) return { ok:false, message:'شناسه نقش معتبر نیست.', nonce:Date.now() }
  const supabase = await createClient()
  const { error } = await supabase.rpc('set_role_permissions', { p_role_id: roleId, p_permission_keys: permissionKeys })
  if (error) return failure(error, 'access.role.permissions_failed', 'تغییر Permissionهای نقش انجام نشد.', { roleId })
  revalidatePath('/admin/system/access')
  return { ok:true, message:'Permissionهای نقش ذخیره شدند.', nonce:Date.now() }
}

export async function assignMembershipRolesAction(_state: AccessActionState, formData: FormData): Promise<AccessActionState> {
  const membershipId = String(formData.get('membership_id') ?? '')
  const roleIds = formData.getAll('role_ids').map(String).filter(Boolean)
  if (!membershipId) return { ok:false, message:'عضویت معتبر نیست.', nonce:Date.now() }
  const supabase = await createClient()
  const { error } = await supabase.rpc('assign_membership_roles', { p_membership_id: membershipId, p_role_ids: roleIds })
  if (error) return failure(error, 'access.membership.roles_failed', 'تغییر نقش‌های کاربر انجام نشد.', { membershipId })
  revalidatePath('/admin/system/access')
  return { ok:true, message:'نقش‌های کاربر ذخیره شدند.', nonce:Date.now() }
}

export async function setPermissionOverrideAction(_state: AccessActionState, formData: FormData): Promise<AccessActionState> {
  const userId = String(formData.get('user_id') ?? '')
  const permissionKey = String(formData.get('permission_key') ?? '')
  const effect = String(formData.get('effect') ?? 'deny') === 'allow' ? 'allow' : 'deny'
  const scopeType = scope(formData.get('scope_type'))
  const organizationId = optionalUuid(formData.get('organization_id'))
  const siteId = optionalUuid(formData.get('site_id'))
  const expiresText = String(formData.get('expires_at') ?? '').trim()
  if (!userId || !permissionKey) return { ok:false, message:'کاربر و Permission الزامی هستند.', nonce:Date.now() }
  const supabase = await createClient()
  const { error } = await supabase.rpc('set_permission_override', {
    p_user_id: userId,
    p_permission_key: permissionKey,
    p_effect: effect,
    p_scope_type: scopeType,
    p_organization_id: organizationId,
    p_site_id: siteId,
    p_reason: String(formData.get('reason') ?? '').trim() || null,
    p_expires_at: expiresText ? new Date(expiresText).toISOString() : null,
  })
  if (error) return failure(error, 'access.override.set_failed', 'ثبت دسترسی اختصاصی انجام نشد.', { userId, permissionKey, effect, scopeType })
  revalidatePath('/admin/system/access')
  return { ok:true, message:'دسترسی اختصاصی کاربر ثبت شد.', nonce:Date.now() }
}

export async function revokeMembershipAction(_state: AccessActionState, formData: FormData): Promise<AccessActionState> {
  const membershipId = String(formData.get('membership_id') ?? '')
  if (!membershipId) return { ok:false, message:'عضویت معتبر نیست.', nonce:Date.now() }
  const supabase = await createClient()
  const { error } = await supabase.rpc('revoke_membership', { p_membership_id: membershipId })
  if (error) return failure(error, 'access.membership.revoke_failed', 'لغو دسترسی کاربر انجام نشد.', { membershipId })
  revalidatePath('/admin/system/access')
  return { ok:true, message:'دسترسی کاربر لغو شد.', nonce:Date.now() }
}

export async function createInvitationAction(_state: AccessActionState, formData: FormData): Promise<AccessActionState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const scopeType = scope(formData.get('scope_type'))
  const organizationId = optionalUuid(formData.get('organization_id'))
  const siteId = optionalUuid(formData.get('site_id'))
  const roleIds = formData.getAll('role_ids').map(String).filter(Boolean)
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok:false, message:'ایمیل معتبر نیست.', nonce:Date.now() }
  const supabase = await createClient()
  const { error } = await supabase.rpc('create_access_invitation', {
    p_email: email,
    p_scope_type: scopeType,
    p_organization_id: organizationId,
    p_site_id: siteId,
    p_role_ids: roleIds,
    p_expires_at: null,
  })
  if (error) return failure(error, 'access.invitation.create_failed', 'ثبت دعوت‌نامه انجام نشد.', { email, scopeType, organizationId, siteId })
  revalidatePath('/admin/system/access')
  return { ok:true, message:'دعوت‌نامه دسترسی ثبت شد. ارسال ایمیل دعوت در فاز Notification/Email Provider متصل می‌شود.', nonce:Date.now() }
}
