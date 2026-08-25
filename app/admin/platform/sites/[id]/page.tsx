import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS, requirePermission } from '@/lib/authz/permissions'

export default async function PlatformSiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
          <span className="eyebrow">RAVA SITE CONTROL</span>
          <h1>{site.name}</h1>
          <p>{organization?.name ?? '—'} · {site.slug} · {site.primary_locale.toUpperCase()} · {site.default_currency} · {site.timezone}</p>
        </div>
        <div className="actions">
          <Link className="admin-primary-button" href={`/admin/pages?site=${id}`}>محتوا و صفحات</Link>
          <Link className="admin-primary-button" href={`/admin/platform/sites/${id}/design`}>Template & Design</Link>
          {commerce?.enabled && ['active','trial','grace'].includes(commerce.status)
            ? <Link className="admin-primary-button" href={`/admin/platform/sites/${id}/commerce`}>Commerce</Link>
            : <span className="admin-muted-button" title="Commerce Entitlement برای این سایت فعال نیست">Commerce غیرفعال</span>}
          <Link className="admin-muted-button" href="/admin/platform/sites">بازگشت به سایت‌ها</Link>
        </div>
      </div>

      <div className="admin-stats">
        <div><strong>{site.status}</strong><span>وضعیت سایت</span></div>
        <div><strong>{environments?.length ?? 0}</strong><span>Environment</span></div>
        <div><strong>{domains?.length ?? 0}</strong><span>Domain</span></div>
        <div><strong>{entitlements?.filter((item) => item.enabled).length ?? 0}</strong><span>ماژول فعال</span></div>
      </div>

      <section className="admin-panel">
        <h2>Environmentها</h2>
        <div className="admin-list">
          {environments?.map((environment) => (
            <article className="admin-list-row" key={environment.id}>
              <div><b>{environment.kind}</b><small>{environment.active ? 'فعال' : 'غیرفعال'}</small></div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-panel">
        <h2>دامنه‌ها</h2>
        {!domains?.length ? <div className="admin-empty">هنوز دامنه‌ای متصل نشده است.</div> : (
          <div className="admin-list">
            {domains.map((domain) => (
              <article className="admin-list-row" key={domain.id}>
                <div><b dir="ltr">{domain.hostname}</b><small>{domain.is_primary ? 'Primary' : 'Alias'} · SSL: {domain.ssl_status}</small></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="admin-panel">
        <h2>ماژول‌ها و Entitlement</h2>
        {!entitlements?.length ? <div className="admin-empty">هیچ ماژولی برای سایت ثبت نشده است.</div> : (
          <div className="admin-list">
            {entitlements.map((item) => (
              <article className="admin-list-row" key={item.module_key}>
                <div><b>{item.module_key}</b><small>{item.tier} · {item.status}</small></div>
                <span>{item.enabled ? 'فعال' : 'غیرفعال'}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
