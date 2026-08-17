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

type Organization = { id: string; name: string; slug: string }
type Site = { id: string; organization_id: string; name: string; slug: string }
type Profile = { id: string; display_name: string; active: boolean; role: string }
type Permission = { key: string; name_fa: string; name_en: string; risk_level: string; module_key: string | null }
type Role = { id: string; scope_type: 'platform'|'organization'|'site'; organization_id: string|null; site_id: string|null; key: string; name_fa: string; name_en: string; description_fa: string; immutable: boolean }
type RolePermission = { role_id: string; permission_key: string }
type Membership = { id: string; user_id: string; scope_type: 'platform'|'organization'|'site'; organization_id: string|null; site_id: string|null; status: string; is_owner: boolean }
type MembershipRole = { membership_id: string; role_id: string }
type Invitation = { id: string; email: string; scope_type: string; organization_id: string|null; site_id: string|null; status: string; expires_at: string; created_at: string }

function scopeLabel(scope: string, organizationId: string | null, siteId: string | null, organizations: Organization[], sites: Site[]) {
  if (scope === 'platform') return 'کل پلتفرم RAVA'
  if (scope === 'site') return `سایت: ${sites.find((item) => item.id === siteId)?.name ?? siteId ?? '—'}`
  return `مشتری: ${organizations.find((item) => item.id === organizationId)?.name ?? organizationId ?? '—'}`
}

export default async function AccessControlPage() {
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

  return <main className="admin-shell">
    <header className="admin-head">
      <div><span className="kicker">ZERO-TRUST ACCESS</span><h1>مدیریت کاربران، نقش‌ها و دسترسی‌ها</h1><p>دسترسی‌ها Scope-based و Permission-based هستند؛ هر تغییر حساس در Audit Log ثبت می‌شود و Deny صریح می‌تواند Allow را خنثی کند.</p></div>
    </header>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>ساخت Role سفارشی</h2><p>Role را در سطح کل پلتفرم، یک مشتری یا یک سایت ایجاد کن.</p></div><span>{permissions.length} Permission</span></div>
      <ActionForm action={createRoleAction} className="admin-form" confirmTitle="ساخت نقش جدید" confirmMessage="این Role با Permissionهای انتخاب‌شده ساخته شود؟">
        <label>Scope<select name="scope_type" defaultValue="platform"><option value="platform">Platform</option><option value="organization">Organization</option><option value="site">Site</option></select></label>
        <label>مشتری<select name="organization_id" defaultValue=""><option value="">—</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
        <label>سایت<select name="site_id" defaultValue=""><option value="">—</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
        <label>Role Key<input name="key" placeholder="site.seo_manager" required /></label>
        <label>نام فارسی<input name="name_fa" placeholder="مدیر سئو" required /></label>
        <label>English Name<input name="name_en" placeholder="SEO Manager" required /></label>
        <label>توضیح فارسی<textarea name="description_fa" rows={2} /></label>
        <label>English Description<textarea name="description_en" rows={2} /></label>
        <fieldset className="admin-permission-grid"><legend>Permissionها</legend>{permissions.map((permission) => <label className="admin-check" key={permission.key}><input type="checkbox" name="permission_keys" value={permission.key}/><span><b>{permission.name_fa}</b><small>{permission.key} · {permission.risk_level}</small></span></label>)}</fieldset>
        <button className="admin-primary-button" type="submit">ساخت Role</button>
      </ActionForm>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>Roleهای موجود</h2><p>Permissionهای هر Role سفارشی را مستقل مدیریت کن.</p></div><span>{roles.length} نقش</span></div>
      <div className="admin-access-grid">{roles.map((role) => {
        const selected = new Set(rolePermissions.filter((entry) => entry.role_id === role.id).map((entry) => entry.permission_key))
        return <article className="admin-access-card" key={role.id}>
          <div><b>{role.name_fa}</b><small>{role.name_en} · {role.key}</small><small>{scopeLabel(role.scope_type, role.organization_id, role.site_id, organizations, sites)}</small></div>
          {role.immutable ? <p className="admin-warning-text">System Role — برای جلوگیری از شکستن امنیت، از این صفحه قابل تغییر نیست.</p> : <ActionForm action={updateRolePermissionsAction} confirmTitle="تغییر Permissionهای Role" confirmMessage={`Permissionهای «${role.name_fa}» جایگزین شوند؟`}>
            <input type="hidden" name="role_id" value={role.id}/>
            <div className="admin-compact-checks">{permissions.map((permission) => <label className="admin-check" key={permission.key}><input type="checkbox" name="permission_keys" value={permission.key} defaultChecked={selected.has(permission.key)}/><span><b>{permission.name_fa}</b><small>{permission.key}</small></span></label>)}</div>
            <button className="admin-primary-button" type="submit">ذخیره Permissionها</button>
          </ActionForm>}
        </article>
      })}</div>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>کاربران و Membershipها</h2><p>نقش‌های هر کاربر در همان Scope تعیین می‌شوند؛ Owner از مسیر عادی قابل لغو نیست.</p></div><span>{memberships.length} عضویت</span></div>
      <div className="admin-access-grid">{memberships.map((membership) => {
        const scopedRoles = roles.filter((role) => role.scope_type === membership.scope_type && role.organization_id === membership.organization_id && role.site_id === membership.site_id)
        const assigned = new Set(membershipRoles.filter((entry) => entry.membership_id === membership.id).map((entry) => entry.role_id))
        return <article className="admin-access-card" key={membership.id}>
          <div><b>{profileName(membership.user_id)}</b><small>{membership.status}{membership.is_owner ? ' · OWNER' : ''}</small><small>{scopeLabel(membership.scope_type, membership.organization_id, membership.site_id, organizations, sites)}</small></div>
          <ActionForm action={assignMembershipRolesAction} confirmTitle="تغییر نقش‌های کاربر" confirmMessage="Roleهای این کاربر در Scope فعلی جایگزین شوند؟">
            <input type="hidden" name="membership_id" value={membership.id}/>
            <div className="admin-compact-checks">{scopedRoles.map((role) => <label className="admin-check" key={role.id}><input type="checkbox" name="role_ids" value={role.id} defaultChecked={assigned.has(role.id)}/><span>{role.name_fa}<small>{role.key}</small></span></label>)}</div>
            <button className="admin-primary-button" type="submit">ذخیره Roleها</button>
          </ActionForm>
          {!membership.is_owner && membership.status !== 'revoked' ? <ActionForm action={revokeMembershipAction} danger confirmTitle="لغو دسترسی کاربر" confirmMessage="این Membership لغو شود؟ این عملیات Audit می‌شود."><input type="hidden" name="membership_id" value={membership.id}/><button className="admin-danger-button" type="submit">لغو دسترسی</button></ActionForm> : null}
        </article>
      })}</div>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>Allow / Deny اختصاصی</h2><p>برای استثناهای دقیق؛ Deny صریح برای عملیات حساس اولویت دارد.</p></div></div>
      <ActionForm action={setPermissionOverrideAction} className="admin-form" confirmTitle="ثبت Override" confirmMessage="این دسترسی اختصاصی برای کاربر ثبت شود؟">
        <label>کاربر<select name="user_id" required defaultValue=""><option value="" disabled>انتخاب کاربر</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name}</option>)}</select></label>
        <label>Permission<select name="permission_key" required defaultValue=""><option value="" disabled>انتخاب Permission</option>{permissions.map((permission) => <option key={permission.key} value={permission.key}>{permission.name_fa} — {permission.key}</option>)}</select></label>
        <label>اثر<select name="effect" defaultValue="deny"><option value="deny">Deny</option><option value="allow">Allow</option></select></label>
        <label>Scope<select name="scope_type" defaultValue="platform"><option value="platform">Platform</option><option value="organization">Organization</option><option value="site">Site</option></select></label>
        <label>مشتری<select name="organization_id" defaultValue=""><option value="">—</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
        <label>سایت<select name="site_id" defaultValue=""><option value="">—</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
        <label>انقضا<input name="expires_at" type="datetime-local" /></label>
        <label>علت<input name="reason" maxLength={500} placeholder="دلیل اعطا یا محدودسازی دسترسی" /></label>
        <button className="admin-primary-button" type="submit">ثبت Override</button>
      </ActionForm>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><div><h2>دعوت ادمین</h2><p>فعلاً رکورد امن دعوت و Roleهای آن ساخته می‌شود؛ ارسال ایمیل واقعی بعداً از Notification Provider مرکزی انجام خواهد شد.</p></div></div>
      <ActionForm action={createInvitationAction} className="admin-form" confirmTitle="ثبت دعوت‌نامه" confirmMessage="دعوت‌نامه با دسترسی‌های انتخاب‌شده ثبت شود؟">
        <label>Email<input name="email" type="email" required placeholder="admin@example.com" /></label>
        <label>Scope<select name="scope_type" defaultValue="site"><option value="platform">Platform</option><option value="organization">Organization</option><option value="site">Site</option></select></label>
        <label>مشتری<select name="organization_id" defaultValue=""><option value="">—</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
        <label>سایت<select name="site_id" defaultValue=""><option value="">—</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
        <fieldset className="admin-permission-grid"><legend>Roleهای دعوت</legend>{roles.map((role) => <label className="admin-check" key={role.id}><input name="role_ids" type="checkbox" value={role.id}/><span><b>{role.name_fa}</b><small>{scopeLabel(role.scope_type, role.organization_id, role.site_id, organizations, sites)}</small></span></label>)}</fieldset>
        <button className="admin-primary-button" type="submit">ثبت دعوت</button>
      </ActionForm>
      {invitations.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Email</th><th>Scope</th><th>Status</th><th>Expiry</th></tr></thead><tbody>{invitations.map((invite) => <tr key={invite.id}><td>{invite.email}</td><td>{scopeLabel(invite.scope_type, invite.organization_id, invite.site_id, organizations, sites)}</td><td>{invite.status}</td><td>{new Date(invite.expires_at).toLocaleString('fa-IR')}</td></tr>)}</tbody></table></div> : null}
    </section>
  </main>
}
