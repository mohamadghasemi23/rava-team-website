import ActionForm from '@/app/admin/components/ActionForm'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS, requireAnyPermission } from '@/lib/authz/permissions'
import {
  assignMembershipRolesAction,
  createInvitationAction,
  createRoleAction,
  revokeMembershipAction,
  setPermissionOverrideAction,
  updateRolePermissionsAction,
} from './actions'
import {getAdminLocale} from '@/lib/i18n/admin-locale'

type Organization = { id: string; name: string; slug: string }
type Site = { id: string; organization_id: string; name: string; slug: string }
type Profile = { id: string; display_name: string; active: boolean; role: string }
type Permission = { key: string; name_fa: string; name_en: string; risk_level: string; module_key: string | null }
type Role = { id: string; scope_type: 'platform'|'organization'|'site'; organization_id: string|null; site_id: string|null; key: string; name_fa: string; name_en: string; description_fa: string; immutable: boolean }
type RolePermission = { role_id: string; permission_key: string }
type Membership = { id: string; user_id: string; scope_type: 'platform'|'organization'|'site'; organization_id: string|null; site_id: string|null; status: string; is_owner: boolean }
type MembershipRole = { membership_id: string; role_id: string }
type Invitation = { id: string; email: string; scope_type: string; organization_id: string|null; site_id: string|null; status: string; expires_at: string; created_at: string }

function scopeLabel(scope: string, organizationId: string | null, siteId: string | null, organizations: Organization[], sites: Site[],locale:'fa'|'en') {
  if (scope === 'platform') return locale==='fa'?'کل پلتفرم راوا':'Entire RAVA platform'
  if (scope === 'site') return `${locale==='fa'?'سایت':'Site'}: ${sites.find((item) => item.id === siteId)?.name ?? siteId ?? '—'}`
  return `${locale==='fa'?'مشتری':'Customer'}: ${organizations.find((item) => item.id === organizationId)?.name ?? organizationId ?? '—'}`
}

export default async function AccessControlPage() {
  const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
  await requireAnyPermission([PERMISSIONS.PLATFORM_ACCESS_MANAGE, PERMISSIONS.ACCESS_VIEW, PERMISSIONS.ACCESS_MANAGE])
  const supabase = await createClient()
  const [organizationsRes, sitesRes, profilesRes, permissionsRes, rolesRes, rolePermissionsRes, membershipsRes, membershipRolesRes, invitationsRes] = await Promise.all([
    supabase.from('organizations').select('id,name,slug').order('name'),
    supabase.from('sites').select('id,organization_id,name,slug').order('name'),
    supabase.from('profiles').select('id,display_name,active,role').order('display_name'),
    supabase.from('permissions').select('key,name_fa,name_en,risk_level,module_key').order('module_key').order('key'),
    supabase.from('roles').select('id,scope_type,organization_id,site_id,key,name_fa,name_en,description_fa,immutable').order('scope_type').order('name_fa'),
    supabase.from('role_permissions').select('role_id,permission_key'),
    supabase.from('memberships').select('id,user_id,scope_type,organization_id,site_id,status,is_owner').order('created_at', { ascending:false }),
    supabase.from('membership_roles').select('membership_id,role_id'),
    supabase.from('access_invitations').select('id,email,scope_type,organization_id,site_id,status,expires_at,created_at').order('created_at', { ascending:false }).limit(40),
  ])

  const organizations = (organizationsRes.data ?? []) as Organization[]
  const sites = (sitesRes.data ?? []) as Site[]
  const profiles = (profilesRes.data ?? []) as Profile[]
  const permissions = (permissionsRes.data ?? []) as Permission[]
  const roles = (rolesRes.data ?? []) as Role[]
  const rolePermissions = (rolePermissionsRes.data ?? []) as RolePermission[]
  const memberships = (membershipsRes.data ?? []) as Membership[]
  const membershipRoles = (membershipRolesRes.data ?? []) as MembershipRole[]
  const invitations = (invitationsRes.data ?? []) as Invitation[]
  const profileName = (id: string) => profiles.find((profile) => profile.id === id)?.display_name ?? id
  const statusLabel = (status: string) => ({
    active: l('فعال', 'Active'), pending: l('در انتظار', 'Pending'), revoked: l('لغوشده', 'Revoked'),
    accepted: l('پذیرفته‌شده', 'Accepted'), expired: l('منقضی‌شده', 'Expired'),
  }[status] ?? (locale === 'fa' ? 'وضعیت نامشخص' : 'Unknown status'))
  const riskLabel=(risk:string)=>({low:l('کم','Low'),medium:l('متوسط','Medium'),high:l('زیاد','High'),critical:l('بحرانی','Critical')}[risk]??l('نامشخص','Unknown'))

  return <main className="admin-shell">
    <header className="admin-head">
      <div><span className="kicker">{l('دسترسی با اصل اعتماد صفر','ZERO-TRUST ACCESS')}</span><h1>{l('مدیریت کاربران، نقش‌ها و دسترسی‌ها','Users, roles, and access')}</h1><p>{l('دسترسی‌ها بر اساس محدوده و مجوز هستند؛ تغییرات حساس ثبت می‌شوند و منع صریح همیشه بر اجازه اولویت دارد.','Access is scope- and permission-based; sensitive changes are audited, and explicit deny always overrides allow.')}</p></div>
    </header>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>{l('ساخت نقش سفارشی','Create custom role')}</h2><p>{l('نقش را در سطح کل پلتفرم، یک مشتری یا یک سایت ایجاد کنید.','Create the role for the entire platform, a customer, or a site.')}</p></div><span>{permissions.length} {l('مجوز','permissions')}</span></div>
      <ActionForm action={createRoleAction} className="admin-form" confirmTitle={l('ساخت نقش جدید','Create new role')} confirmMessage={l('این نقش با مجوزهای انتخاب‌شده ساخته شود؟','Create this role with the selected permissions?')}>
        <label>{l('محدوده','Scope')}<select name="scope_type" defaultValue="platform"><option value="platform">{l('کل پلتفرم','Platform')}</option><option value="organization">{l('مشتری','Organization')}</option><option value="site">{l('سایت','Site')}</option></select></label>
        <label>{l('مشتری','Customer')}<select name="organization_id" defaultValue=""><option value="">—</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
        <label>{l('سایت','Site')}<select name="site_id" defaultValue=""><option value="">—</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
        <label>{l('شناسه نقش','Role key')}<input name="key" placeholder="site.seo_manager" required /></label>
        <label>{l('نام فارسی نقش','Persian role name')}<input name="name_fa" placeholder="مدیر سئو" required /></label>
        <label>{l('نام انگلیسی نقش','English role name')}<input name="name_en" placeholder="SEO Manager" required /></label>
        <label>{l('توضیح فارسی','Persian description')}<textarea name="description_fa" rows={2} /></label>
        <label>{l('توضیح انگلیسی','English description')}<textarea name="description_en" rows={2} /></label>
        <fieldset className="admin-permission-grid"><legend>{l('مجوزها','Permissions')}</legend>{permissions.map((permission) => <label className="admin-check" key={permission.key}><input type="checkbox" name="permission_keys" value={permission.key}/><span><b>{locale==='fa'?permission.name_fa:permission.name_en}</b><small>{locale==='fa'?riskLabel(permission.risk_level):`${permission.key} · ${riskLabel(permission.risk_level)}`}</small></span></label>)}</fieldset>
        <button className="admin-primary-button" type="submit">{l('ساخت نقش','Create role')}</button>
      </ActionForm>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>{l('نقش‌های موجود','Existing roles')}</h2><p>{l('مجوزهای هر نقش سفارشی را مستقل مدیریت کنید.','Manage the permissions of each custom role independently.')}</p></div><span>{roles.length} {l('نقش','roles')}</span></div>
      <div className="admin-access-grid">{roles.map((role) => {
        const selected = new Set(rolePermissions.filter((entry) => entry.role_id === role.id).map((entry) => entry.permission_key))
        return <article className="admin-access-card" key={role.id}>
          <div><b>{locale==='fa'?role.name_fa:role.name_en}</b>{locale==='en'?<small>{role.key}</small>:null}<small>{scopeLabel(role.scope_type, role.organization_id, role.site_id, organizations, sites,locale)}</small></div>
          {role.immutable ? <p className="admin-warning-text">{l('نقش سیستمی است و برای حفظ امنیت از این صفحه تغییر نمی‌کند.','This system role cannot be changed here to preserve platform security.')}</p> : <ActionForm action={updateRolePermissionsAction} confirmTitle={l('تغییر مجوزهای نقش','Change role permissions')} confirmMessage={l(`مجوزهای «${role.name_fa}» جایگزین شوند؟`,`Replace permissions for “${role.name_en}”?`)}>
            <input type="hidden" name="role_id" value={role.id}/>
            <div className="admin-compact-checks">{permissions.map((permission) => <label className="admin-check" key={permission.key}><input type="checkbox" name="permission_keys" value={permission.key} defaultChecked={selected.has(permission.key)}/><span><b>{locale==='fa'?permission.name_fa:permission.name_en}</b>{locale==='en'?<small>{permission.key}</small>:null}</span></label>)}</div>
            <button className="admin-primary-button" type="submit">{l('ذخیره مجوزها','Save permissions')}</button>
          </ActionForm>}
        </article>
      })}</div>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>{l('کاربران و عضویت‌ها','Users and memberships')}</h2><p>{l('نقش‌های هر کاربر در همان محدوده تعیین می‌شوند و دسترسی مالک از مسیر عادی لغو نمی‌شود.','Each user receives roles within the same scope, and owner access cannot be revoked through the standard flow.')}</p></div><span>{memberships.length} {l('عضویت','memberships')}</span></div>
      <div className="admin-access-grid">{memberships.map((membership) => {
        const scopedRoles = roles.filter((role) => role.scope_type === membership.scope_type && role.organization_id === membership.organization_id && role.site_id === membership.site_id)
        const assigned = new Set(membershipRoles.filter((entry) => entry.membership_id === membership.id).map((entry) => entry.role_id))
        return <article className="admin-access-card" key={membership.id}>
          <div><b>{profileName(membership.user_id)}</b><small>{statusLabel(membership.status)}{membership.is_owner ? ` · ${l('مالک','Owner')}` : ''}</small><small>{scopeLabel(membership.scope_type, membership.organization_id, membership.site_id, organizations, sites,locale)}</small></div>
          <ActionForm action={assignMembershipRolesAction} confirmTitle={l('تغییر نقش‌های کاربر','Change user roles')} confirmMessage={l('نقش‌های این کاربر در محدوده فعلی جایگزین شوند؟','Replace this user’s roles in the current scope?')}>
            <input type="hidden" name="membership_id" value={membership.id}/>
            <div className="admin-compact-checks">{scopedRoles.map((role) => <label className="admin-check" key={role.id}><input type="checkbox" name="role_ids" value={role.id} defaultChecked={assigned.has(role.id)}/><span>{locale==='fa'?role.name_fa:role.name_en}{locale==='en'?<small>{role.key}</small>:null}</span></label>)}</div>
            <button className="admin-primary-button" type="submit">{l('ذخیره نقش‌ها','Save roles')}</button>
          </ActionForm>
          {!membership.is_owner && membership.status !== 'revoked' ? <ActionForm action={revokeMembershipAction} danger confirmTitle={l('لغو دسترسی کاربر','Revoke user access')} confirmMessage={l('این عضویت لغو و عملیات در گزارش ممیزی ثبت شود؟','Revoke this membership and record the operation in the audit log?')}><input type="hidden" name="membership_id" value={membership.id}/><button className="admin-danger-button" type="submit">{l('لغو دسترسی','Revoke access')}</button></ActionForm> : null}
        </article>
      })}</div>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>{l('اجازه یا منع اختصاصی','Explicit allow or deny')}</h2><p>{l('برای استثناهای دقیق استفاده کنید؛ منع صریح برای عملیات حساس اولویت دارد.','Use for precise exceptions; explicit deny takes precedence for sensitive operations.')}</p></div></div>
      <ActionForm action={setPermissionOverrideAction} className="admin-form" confirmTitle={l('ثبت دسترسی اختصاصی','Save access override')} confirmMessage={l('این دسترسی اختصاصی برای کاربر ثبت شود؟','Save this explicit access rule for the user?')}>
        <label>{l('کاربر','User')}<select name="user_id" required defaultValue=""><option value="" disabled>{l('انتخاب کاربر','Select user')}</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name}</option>)}</select></label>
        <label>{l('مجوز','Permission')}<select name="permission_key" required defaultValue=""><option value="" disabled>{l('انتخاب مجوز','Select permission')}</option>{permissions.map((permission) => <option key={permission.key} value={permission.key}>{locale==='fa'?permission.name_fa:`${permission.name_en} — ${permission.key}`}</option>)}</select></label>
        <label>{l('اثر','Effect')}<select name="effect" defaultValue="deny"><option value="deny">{l('منع','Deny')}</option><option value="allow">{l('اجازه','Allow')}</option></select></label>
        <label>{l('محدوده','Scope')}<select name="scope_type" defaultValue="platform"><option value="platform">{l('کل پلتفرم','Platform')}</option><option value="organization">{l('مشتری','Organization')}</option><option value="site">{l('سایت','Site')}</option></select></label>
        <label>{l('مشتری','Customer')}<select name="organization_id" defaultValue=""><option value="">—</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
        <label>{l('سایت','Site')}<select name="site_id" defaultValue=""><option value="">—</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
        <label>{l('انقضا','Expiry')}<input name="expires_at" type="datetime-local" /></label>
        <label>{l('علت','Reason')}<input name="reason" maxLength={500} placeholder={l('دلیل اعطا یا محدودسازی دسترسی','Reason for granting or restricting access')} /></label>
        <button className="admin-primary-button" type="submit">{l('ثبت دسترسی اختصاصی','Save access override')}</button>
      </ActionForm>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>{l('دعوت مدیر','Invite administrator')}</h2><p>{l('رکورد امن دعوت و نقش‌های آن ساخته می‌شود؛ ارسال ایمیل از سامانه مرکزی اعلان انجام خواهد شد.','Creates a secure invitation and role assignment; email delivery will use the centralized notification provider.')}</p></div></div>
      <ActionForm action={createInvitationAction} className="admin-form" confirmTitle={l('ثبت دعوت‌نامه','Create invitation')} confirmMessage={l('دعوت‌نامه با دسترسی‌های انتخاب‌شده ثبت شود؟','Create the invitation with the selected access?')}>
        <label>{l('ایمیل','Email')}<input name="email" type="email" required placeholder="admin@example.com" /></label>
        <label>{l('محدوده','Scope')}<select name="scope_type" defaultValue="site"><option value="platform">{l('کل پلتفرم','Platform')}</option><option value="organization">{l('مشتری','Organization')}</option><option value="site">{l('سایت','Site')}</option></select></label>
        <label>{l('مشتری','Customer')}<select name="organization_id" defaultValue=""><option value="">—</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
        <label>{l('سایت','Site')}<select name="site_id" defaultValue=""><option value="">—</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
        <fieldset className="admin-permission-grid"><legend>{l('نقش‌های دعوت','Invitation roles')}</legend>{roles.map((role) => <label className="admin-check" key={role.id}><input name="role_ids" type="checkbox" value={role.id}/><span><b>{locale==='fa'?role.name_fa:role.name_en}</b><small>{scopeLabel(role.scope_type, role.organization_id, role.site_id, organizations, sites,locale)}</small></span></label>)}</fieldset>
        <button className="admin-primary-button" type="submit">{l('ثبت دعوت','Create invitation')}</button>
      </ActionForm>
      {invitations.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{l('ایمیل','Email')}</th><th>{l('محدوده','Scope')}</th><th>{l('وضعیت','Status')}</th><th>{l('انقضا','Expiry')}</th></tr></thead><tbody>{invitations.map((invite) => <tr key={invite.id}><td>{invite.email}</td><td>{scopeLabel(invite.scope_type, invite.organization_id, invite.site_id, organizations, sites,locale)}</td><td>{statusLabel(invite.status)}</td><td>{new Date(invite.expires_at).toLocaleString(locale==='fa'?'fa-IR':'en-GB')}</td></tr>)}</tbody></table></div> : null}
    </section>
  </main>
}
