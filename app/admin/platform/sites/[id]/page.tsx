import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS, requirePermission } from '@/lib/authz/permissions'
import {getAdminLocale} from '@/lib/i18n/admin-locale'

export default async function PlatformSiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
  const statusLabel=(value:string)=>({active:l('فعال','Active'),inactive:l('غیرفعال','Inactive'),draft:l('پیش‌نویس','Draft'),trial:l('آزمایشی','Trial'),grace:l('مهلت تمدید','Grace period'),suspended:l('تعلیق‌شده','Suspended')}[value]??value)
  const environmentLabel=(value:string)=>({preview:l('پیش‌نمایش','Preview'),staging:l('آزمایشی','Staging'),production:l('اصلی','Production')}[value]??value)
  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) notFound()

  const supabase = await createClient()
  const { data: site } = await supabase
    .from('sites')
    .select('id,organization_id,name,slug,status,primary_locale,default_currency,timezone,theme_config,settings,created_at,organizations(id,name,slug,status)')
    .eq('id', id)
    .maybeSingle()

  if (!site) notFound()
  await requirePermission(PERMISSIONS.PLATFORM_SITES_MANAGE, { organizationId: site.organization_id, siteId: site.id })

  const [{ data: environments }, { data: domains }, { data: entitlements }] = await Promise.all([
    supabase.from('site_environments').select('id,kind,active,updated_at').eq('site_id', id).order('kind'),
    supabase.from('site_domains').select('id,hostname,is_primary,verified_at,ssl_status').eq('site_id', id).order('is_primary', { ascending: false }),
    supabase.from('site_entitlements').select('module_key,status,tier,enabled,limits,ends_at,grace_until').eq('site_id', id).order('module_key'),
  ])

  const organization = Array.isArray(site.organizations) ? site.organizations[0] : site.organizations
  const commerce = entitlements?.find((item) => item.module_key === 'commerce')

  return (
    <main className="admin-shell">
      <div className="admin-head">
        <div>
          <span className="eyebrow">{l('مرکز مدیریت سایت راوا','RAVA SITE CONTROL')}</span>
          <h1>{site.name}</h1>
          <p>{organization?.name ?? '—'} · {site.slug} · {site.primary_locale.toUpperCase()} · {site.default_currency} · {site.timezone}</p>
        </div>
        <div className="actions">
          <Link className="admin-primary-button" href={`/admin/platform/sites/${id}/starter`}>{l('راه‌اندازی اولیه','Starter setup')}</Link>
          <Link className="admin-primary-button" href={`/admin/pages?site=${id}`}>{l('محتوا و صفحه‌ها','Content and pages')}</Link>
          <Link className="admin-primary-button" href={`/admin/media?site=${id}`}>{l('کتابخانه رسانه','Media library')}</Link>
          <Link className="admin-primary-button" href={`/admin/platform/sites/${id}/design`}>{l('قالب و طراحی','Template and design')}</Link>
          {commerce?.enabled && ['active','trial','grace'].includes(commerce.status)
            ? <Link className="admin-primary-button" href={`/admin/platform/sites/${id}/commerce`}>{l('فروشگاه','Commerce')}</Link>
            : <span className="admin-muted-button" title={l('امکان فروشگاه برای این سایت فعال نیست','Commerce is not enabled for this site')}>{l('فروشگاه غیرفعال','Commerce unavailable')}</span>}
          <Link className="admin-muted-button" href="/admin/platform/sites">{l('بازگشت به سایت‌ها','Back to sites')}</Link>
        </div>
      </div>

      <div className="admin-stats">
        <div><strong>{statusLabel(site.status)}</strong><span>{l('وضعیت سایت','Site status')}</span></div>
        <div><strong>{environments?.length ?? 0}</strong><span>{l('محیط','Environments')}</span></div>
        <div><strong>{domains?.length ?? 0}</strong><span>{l('دامنه','Domains')}</span></div>
        <div><strong>{entitlements?.filter((item) => item.enabled).length ?? 0}</strong><span>{l('بخش فعال','Enabled modules')}</span></div>
      </div>

      <section className="admin-panel">
        <h2>{l('محیط‌ها','Environments')}</h2>
        <div className="admin-list">
          {environments?.map((environment) => (
            <article className="admin-list-row" key={environment.id}>
              <div><b>{environmentLabel(environment.kind)}</b><small>{environment.active ? l('فعال','Active') : l('غیرفعال','Inactive')}</small></div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-panel">
        <h2>{l('دامنه‌ها','Domains')}</h2>
        {!domains?.length ? <div className="admin-empty">{l('هنوز دامنه‌ای متصل نشده است.','No domains have been connected yet.')}</div> : (
          <div className="admin-list">
            {domains.map((domain) => (
              <article className="admin-list-row" key={domain.id}>
                <div><b dir="ltr">{domain.hostname}</b><small>{domain.is_primary ? l('دامنه اصلی','Primary') : l('دامنه جایگزین','Alias')} · {l('گواهی امنیتی','SSL')}: {domain.ssl_status}</small></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="admin-panel">
        <h2>{l('بخش‌ها و امکانات فعال','Modules and entitlements')}</h2>
        {!entitlements?.length ? <div className="admin-empty">{l('هیچ بخشی برای سایت ثبت نشده است.','No modules are registered for this site.')}</div> : (
          <div className="admin-list">
            {entitlements.map((item) => (
              <article className="admin-list-row" key={item.module_key}>
                <div><b>{item.module_key}</b><small>{item.tier} · {statusLabel(item.status)}</small></div>
                <span>{item.enabled ? l('فعال','Active') : l('غیرفعال','Inactive')}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
