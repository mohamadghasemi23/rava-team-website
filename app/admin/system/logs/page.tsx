import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS, requireAnyPermission } from '@/lib/authz/permissions'

const PAGE_SIZE = 40

type SearchParams = Record<string, string | string[] | undefined>

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function pageNumber(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function paramsFor(current: URLSearchParams, page: number) {
  const next = new URLSearchParams(current)
  next.set('page', String(page))
  return `?${next.toString()}`
}

export default async function LogsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await requireAnyPermission([PERMISSIONS.PLATFORM_AUDIT_VIEW, PERMISSIONS.LOGS_VIEW])
  const params = (await searchParams) ?? {}
  const q = one(params.q).trim()
  const severity = one(params.severity)
  const page = pageNumber(one(params.page))
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  let query = supabase
    .from('audit_log')
    .select('id,action,entity_type,entity_id,severity,organization_id,site_id,actor_id,correlation_id,created_at,context', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (severity) query = query.eq('severity', severity)
  if (q) query = query.or(`action.ilike.%${q.replaceAll(',', '')}%,entity_type.ilike.%${q.replaceAll(',', '')}%,entity_id.ilike.%${q.replaceAll(',', '')}%`)

  const { data, count, error } = await query.range(offset, offset + PAGE_SIZE - 1)
  const rows = data ?? []
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))
  const current = new URLSearchParams()
  if (q) current.set('q', q)
  if (severity) current.set('severity', severity)

  return <main className="admin-shell">
    <header className="admin-head">
      <div><span className="kicker">OBSERVABILITY</span><h1>لاگ‌ها و ممیزی</h1><p>ردیابی عملیات مهم سیستم؛ چه کسی، چه زمانی و روی چه بخشی تغییر ایجاد کرده است.</p></div>
      <Link className="admin-primary-button" href="/admin/system/errors">مشاهده خطاها</Link>
    </header>

    <section className="admin-panel">
      <form className="admin-form" method="get">
        <label>جست‌وجو<input name="q" defaultValue={q} placeholder="Action، Entity یا ID" /></label>
        <label>شدت
          <select name="severity" defaultValue={severity}>
            <option value="">همه</option><option value="debug">Debug</option><option value="info">Info</option><option value="notice">Notice</option><option value="warning">Warning</option><option value="error">Error</option><option value="critical">Critical</option>
          </select>
        </label>
        <button className="admin-primary-button" type="submit">اعمال فیلتر</button>
      </form>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><h2>Audit Trail</h2><span>{count ?? 0} رکورد</span></div>
      {error ? <div className="admin-empty">خواندن لاگ‌ها انجام نشد. جزئیات فنی برای کاربر نمایش داده نمی‌شود.</div> : null}
      {!error && rows.length === 0 ? <div className="admin-empty">لاگی مطابق فیلتر فعلی وجود ندارد.</div> : null}
      {rows.length > 0 ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ID</th><th>زمان</th><th>عملیات</th><th>Entity</th><th>Severity</th><th>Correlation</th></tr></thead><tbody>
        {rows.map((row) => <tr key={row.id}><td>#{row.id}</td><td>{new Date(row.created_at).toLocaleString('fa-IR')}</td><td><b>{row.action}</b></td><td>{row.entity_type}{row.entity_id ? ` · ${row.entity_id}` : ''}</td><td>{row.severity}</td><td><code>{row.correlation_id ? String(row.correlation_id).slice(0, 8) : '—'}</code></td></tr>)}
      </tbody></table></div> : null}

      <div className="admin-pagination">
        {page > 1 ? <Link className="admin-muted-button" href={paramsFor(current, page - 1)}>قبلی</Link> : <span />}
        <span>صفحه {page} از {totalPages}</span>
        {page < totalPages ? <Link className="admin-muted-button" href={paramsFor(current, page + 1)}>بعدی</Link> : <span />}
      </div>
    </section>
  </main>
}
