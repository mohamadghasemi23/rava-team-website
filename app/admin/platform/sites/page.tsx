import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS, requirePermission } from '@/lib/authz/permissions'

export default async function PlatformSitesPage() {
  await requirePermission(PERMISSIONS.PLATFORM_SITES_MANAGE)
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
          <span className="eyebrow">RAVA OWNER CONTROL PLANE</span>
          <h1>مشتری‌ها و سایت‌ها</h1>
          <p>کنترل مرکزی سایت‌های Multi-tenant. در فازهای بعد قرارداد، Entitlement، سلامت، مصرف و درآمد همین‌جا تجمیع می‌شوند.</p>
        </div>
        <Link className="admin-primary-button" href="/admin/platform/sites/new">+ ساخت سایت</Link>
      </div>

      <section className="admin-panel">
        {error ? (
          <div className="admin-empty">دریافت سایت‌ها انجام نشد. جزئیات فنی در UI عمومی نمایش داده نمی‌شود.</div>
        ) : !sites?.length ? (
          <div className="admin-empty">هنوز هیچ Tenant/Siteای ساخته نشده است.</div>
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
                  <span>{site.status}</span>
                  <Link className="admin-muted-button" href={`/admin/platform/sites/${site.id}`}>مدیریت</Link>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
