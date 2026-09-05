'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createTraceContext, recordErrorEvent } from '@/lib/observability/events'
import { getAdminLocale } from '@/lib/i18n/admin-locale'

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
  const locale = await getAdminLocale()
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
  return { ok: false, message: errorId ? `${message} ${locale === 'fa' ? 'شناسه خطا' : 'Error ID'}: ${errorId}` : message, errorId, nonce: Date.now() }
}

async function translator() { const locale=await getAdminLocale(); return (fa:string,en:string)=>locale==='fa'?fa:en }

export async function createRoleAction(_state: AccessActionState, formData: FormData): Promise<AccessActionState> {
  const l=await translator()
  const scopeType = scope(formData.get('scope_type'))
  const organizationId = optionalUuid(formData.get('organization_id'))
  const siteId = optionalUuid(formData.get('site_id'))
  const permissionKeys = formData.getAll('permission_keys').map(String).filter(Boolean)
  const key = String(formData.get('key') ?? '').trim().toLowerCase()
  const nameFa = String(formData.get('name_fa') ?? '').trim()
  const nameEn = String(formData.get('name_en') ?? '').trim()
  if (!/^[a-z0-9_.:-]{2,80}$/.test(key) || nameFa.length < 2 || nameEn.length < 2) return { ok:false, message:l('کلید و نام نقش معتبر نیست.','The role key and names are invalid.'), nonce:Date.now() }
  const supabase = await createClient()
  const { error } = await supabase.rpc('create_custom_role', {
    p_scope_type: scopeType, p_key: key, p_name_fa: nameFa, p_name_en: nameEn,
    p_description_fa: String(formData.get('description_fa') ?? '').trim(), p_description_en: String(formData.get('description_en') ?? '').trim(),
    p_organization_id: organizationId, p_site_id: siteId, p_permission_keys: permissionKeys,
  })
  if (error) return failure(error, 'access.role.create_failed', l('ساخت نقش انجام نشد.','The role could not be created.'), { scopeType, organizationId, siteId, key })
  revalidatePath('/admin/system/access')
  return { ok:true, message:l('نقش جدید با موفقیت ساخته شد.','The new role was created successfully.'), nonce:Date.now() }
}

export async function updateRolePermissionsAction(_state: AccessActionState, formData: FormData): Promise<AccessActionState> {
  const l=await translator()
  const roleId = String(formData.get('role_id') ?? '')
  const permissionKeys = formData.getAll('permission_keys').map(String).filter(Boolean)
  if (!roleId) return { ok:false, message:l('شناسه نقش معتبر نیست.','The role ID is invalid.'), nonce:Date.now() }
  const supabase = await createClient()
  const { error } = await supabase.rpc('set_role_permissions', { p_role_id: roleId, p_permission_keys: permissionKeys })
  if (error) return failure(error, 'access.role.permissions_failed', l('تغییر مجوزهای نقش انجام نشد.','The role permissions could not be changed.'), { roleId })
  revalidatePath('/admin/system/access')
  return { ok:true, message:l('مجوزهای نقش ذخیره شدند.','The role permissions were saved.'), nonce:Date.now() }
}

export async function addExistingMemberAction(_state: AccessActionState, formData: FormData): Promise<AccessActionState> {
  const l=await translator()
  const userId = String(formData.get('user_id') ?? '')
  const scopeType = scope(formData.get('scope_type'))
  const organizationId = optionalUuid(formData.get('organization_id'))
  const siteId = optionalUuid(formData.get('site_id'))
  const roleIds = formData.getAll('role_ids').map(String).filter(Boolean)
  const isOwner = String(formData.get('is_owner') ?? '') === 'true'
  if (!userId) return { ok:false, message:l('کاربر را انتخاب کنید.','Select a user.'), nonce:Date.now() }
  const supabase = await createClient()
  const { error } = await supabase.rpc('add_existing_member', {
    p_user_id: userId, p_scope_type: scopeType, p_organization_id: organizationId, p_site_id: siteId, p_role_ids: roleIds, p_is_owner: isOwner,
  })
  if (error) return failure(error, 'access.membership.add_failed', l('افزودن کاربر به محدوده انجام نشد.','The user could not be added to the scope.'), { userId, scopeType, organizationId, siteId })
  revalidatePath('/admin/system/access')
  return { ok:true, message:l('کاربر با نقش‌های انتخاب‌شده به محدوده اضافه شد.','The user was added to the scope with the selected roles.'), nonce:Date.now() }
}

export async function assignMembershipRolesAction(_state: AccessActionState, formData: FormData): Promise<AccessActionState> {
  const l=await translator()
  const membershipId = String(formData.get('membership_id') ?? '')
  const roleIds = formData.getAll('role_ids').map(String).filter(Boolean)
  if (!membershipId) return { ok:false, message:l('عضویت معتبر نیست.','The membership is invalid.'), nonce:Date.now() }
  const supabase = await createClient()
  const { error } = await supabase.rpc('assign_membership_roles', { p_membership_id: membershipId, p_role_ids: roleIds })
  if (error) return failure(error, 'access.membership.roles_failed', l('تغییر نقش‌های کاربر انجام نشد.','The user roles could not be changed.'), { membershipId })
  revalidatePath('/admin/system/access')
  return { ok:true, message:l('نقش‌های کاربر ذخیره شدند.','The user roles were saved.'), nonce:Date.now() }
}

export async function setPermissionOverrideAction(_state: AccessActionState, formData: FormData): Promise<AccessActionState> {
  const l=await translator()
  const userId = String(formData.get('user_id') ?? '')
  const permissionKey = String(formData.get('permission_key') ?? '')
  const effect = String(formData.get('effect') ?? 'deny') === 'allow' ? 'allow' : 'deny'
  const scopeType = scope(formData.get('scope_type'))
  const organizationId = optionalUuid(formData.get('organization_id'))
  const siteId = optionalUuid(formData.get('site_id'))
  const expiresText = String(formData.get('expires_at') ?? '').trim()
  if (!userId || !permissionKey) return { ok:false, message:l('انتخاب کاربر و مجوز الزامی است.','A user and permission are required.'), nonce:Date.now() }
  const supabase = await createClient()
  const { error } = await supabase.rpc('set_permission_override', {
    p_user_id: userId, p_permission_key: permissionKey, p_effect: effect, p_scope_type: scopeType,
    p_organization_id: organizationId, p_site_id: siteId, p_reason: String(formData.get('reason') ?? '').trim() || null,
    p_expires_at: expiresText ? new Date(expiresText).toISOString() : null,
  })
  if (error) return failure(error, 'access.override.set_failed', l('ثبت دسترسی اختصاصی انجام نشد.','The access override could not be saved.'), { userId, permissionKey, effect, scopeType })
  revalidatePath('/admin/system/access')
  return { ok:true, message:l('دسترسی اختصاصی کاربر ثبت شد.','The user access override was saved.'), nonce:Date.now() }
}

export async function revokeMembershipAction(_state: AccessActionState, formData: FormData): Promise<AccessActionState> {
  const l=await translator()
  const membershipId = String(formData.get('membership_id') ?? '')
  if (!membershipId) return { ok:false, message:l('عضویت معتبر نیست.','The membership is invalid.'), nonce:Date.now() }
  const supabase = await createClient()
  const { error } = await supabase.rpc('revoke_membership', { p_membership_id: membershipId })
  if (error) return failure(error, 'access.membership.revoke_failed', l('لغو دسترسی کاربر انجام نشد.','The user access could not be revoked.'), { membershipId })
  revalidatePath('/admin/system/access')
  return { ok:true, message:l('دسترسی کاربر لغو شد.','The user access was revoked.'), nonce:Date.now() }
}

export async function createInvitationAction(_state: AccessActionState, formData: FormData): Promise<AccessActionState> {
  const l=await translator()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const scopeType = scope(formData.get('scope_type'))
  const organizationId = optionalUuid(formData.get('organization_id'))
  const siteId = optionalUuid(formData.get('site_id'))
  const roleIds = formData.getAll('role_ids').map(String).filter(Boolean)
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok:false, message:l('ایمیل معتبر نیست.','The email address is invalid.'), nonce:Date.now() }
  const supabase = await createClient()
  const { error } = await supabase.rpc('create_access_invitation', {
    p_email: email, p_scope_type: scopeType, p_organization_id: organizationId, p_site_id: siteId, p_role_ids: roleIds, p_expires_at: null,
  })
  if (error) return failure(error, 'access.invitation.create_failed', l('ثبت دعوت‌نامه انجام نشد.','The invitation could not be created.'), { email, scopeType, organizationId, siteId })
  revalidatePath('/admin/system/access')
  return { ok:true, message:l('دعوت‌نامه دسترسی ثبت شد. ارسال ایمیل پس از اتصال سامانه مرکزی اعلان فعال می‌شود.','The access invitation was created. Email delivery will be enabled when the centralized notification provider is connected.'), nonce:Date.now() }
}
