import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {hasPermission,PERMISSIONS,requirePermission} from '@/lib/authz/permissions'
import {getAdminLocale} from '@/lib/i18n/admin-locale'

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
        {canProvisionSites?<Link className="admin-primary-button" href="/admin/platform/sites/new">{l('+ ساخت سایت','+ Create site')}</Link>:null}
      </div>

      <section className="admin-panel">
        {error ? (
          <div className="admin-empty">{l('دریافت سایت‌ها انجام نشد. جزئیات فنی برای کاربر نمایش داده نمی‌شود.','Sites could not be loaded. Technical details are not exposed to users.')}</div>
        ) : !sites?.length ? (
          <div className="admin-empty">{l('هنوز هیچ مشتری یا سایتی ساخته نشده است.','No customers or sites have been created yet.')}</div>
        ) : (
          <div className="admin-list">
            {sites.map((site) => {
              const organization = Array.isArray(site.organizations) ? site.organizations[0] : site.organizations
              return (
                <article className="admin-list-row" key={site.id}>
                  <div>
                    <b>{site.name}</b>
                    <small>{organization?.name ?? '—'} · {site.slug} · {site.primary_locale.toUpperCase()} · {site.default_currency}</small>
                  </div>
                  <span>{site.status==='active'?l('فعال','Active'):site.status==='draft'?l('پیش‌نویس','Draft'):l('غیرفعال','Inactive')}</span>
                  <Link className="admin-muted-button" href={`/admin/platform/sites/${site.id}`}>{l('مدیریت','Manage')}</Link>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
