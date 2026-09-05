import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {hasPermission,PERMISSIONS,requirePermission} from '@/lib/authz/permissions'
import {getAdminLocale} from '@/lib/i18n/admin-locale'
import AdminIcon from '@/app/admin/components/AdminIcon'

export default async function PlatformSitesPage() {
  const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
  await requirePermission(PERMISSIONS.PLATFORM_SITES_MANAGE)
  const canProvisionSites=await hasPermission(PERMISSIONS.PLATFORM_ORGANIZATIONS_MANAGE)
  const supabase = await createClient()

  const { data: sites, error } = await supabase
    .from('sites')
    .select('id,name,slug,status,primary_locale,default_currency,created_at,organizations(id,name,slug,status)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <main className="admin-shell">
      <div className="admin-head">
        <div>
          <span className="eyebrow">{l('مرکز مدیریت مالک راوا','RAVA OWNER CONTROL PLANE')}</span>
          <h1>{l('مشتری‌ها و سایت‌ها','Customers and sites')}</h1>
          <p>{l('کنترل مرکزی مشتری‌ها و سایت‌های مستقل؛ قرارداد، امکانات، سلامت، مصرف و درآمد نیز در همین بخش مدیریت می‌شوند.','Central control for isolated customer sites, contracts, capabilities, health, usage, and revenue.')}</p>
        </div>
        {canProvisionSites?<Link className="admin-primary-button" href="/admin/platform/sites/new"><AdminIcon name="add" size={18}/>{l('ساخت سایت جدید','Create a new site')}</Link>:null}
      </div>

      <section className="admin-panel">
        {error ? (
          <div className="admin-empty">{l('دریافت سایت‌ها انجام نشد. جزئیات فنی برای کاربر نمایش داده نمی‌شود.','Sites could not be loaded. Technical details are not exposed to users.')}</div>
        ) : !sites?.length ? (
          <div className="admin-empty">{l('هنوز هیچ مشتری یا سایتی ساخته نشده است.','No customers or sites have been created yet.')}</div>
        ) : (
          <div className="admin-table-wrap rava-data-table-wrap"><table className="admin-table rava-data-table"><thead><tr><th scope="col">{l('سایت','Site')}</th><th scope="col">{l('مشتری یا سازمان','Customer or organization')}</th><th scope="col">{l('زبان و واحد پول','Language and currency')}</th><th scope="col">{l('وضعیت','Status')}</th><th scope="col">{l('عملیات','Action')}</th></tr></thead><tbody>
            {sites.map((site) => {
              const organization = Array.isArray(site.organizations) ? site.organizations[0] : site.organizations
              return (
                <tr key={site.id}><td data-label={l('سایت','Site')}><b>{site.name}</b><small dir="ltr">{site.slug}</small></td><td data-label={l('مشتری یا سازمان','Customer or organization')}>{organization?.name??'—'}</td><td data-label={l('زبان و واحد پول','Language and currency')}><span dir="ltr">{site.primary_locale.toUpperCase()} · {site.default_currency}</span></td><td data-label={l('وضعیت','Status')}><span className={`status-pill status-${site.status}`}>{site.status==='active'?l('فعال','Active'):site.status==='draft'?l('پیش‌نویس','Draft'):l('غیرفعال','Inactive')}</span></td><td data-label={l('عملیات','Action')}><Link className="admin-muted-button" href={`/admin/platform/sites/${site.id}`}><AdminIcon name="arrow" size={16}/>{l('ورود به مدیریت سایت','Open site workspace')}</Link></td></tr>
              )
            })}
          </tbody></table></div>
        )}
      </section>
    </main>
  )
}
