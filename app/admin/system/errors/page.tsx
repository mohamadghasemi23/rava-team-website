import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS, requireAnyPermission } from '@/lib/authz/permissions'
import { oneOf, sanitizePostgrestSearchTerm } from '@/lib/platform/postgrest-search'

const PAGE_SIZE = 40
const SEVERITIES = ['warning','error','critical'] as const
const STATUSES = ['open','investigating','resolved','ignored'] as const

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

export default async function ErrorsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await requireAnyPermission([PERMISSIONS.PLATFORM_AUDIT_VIEW, PERMISSIONS.ERRORS_VIEW])
  const params = (await searchParams) ?? {}
  const q = sanitizePostgrestSearchTerm(one(params.q))
  const severity = oneOf(one(params.severity), SEVERITIES)
  const category = sanitizePostgrestSearchTerm(one(params.category), 80)
  const status = oneOf(one(params.status), STATUSES)
  const page = pageNumber(one(params.page))
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  let query = supabase
    .from('error_logs')
    .select('id,error_id,category,event_type,severity,status,route,public_message,technical_message,explanation_fa,explanation_en,probable_causes,correlation_id,occurred_at', { count: 'exact' })
    .order('occurred_at', { ascending: false })

  if (severity) query = query.eq('severity', severity)
  if (status) query = query.eq('status', status)
  if (category) query = query.eq('category', category)
  if (q) {
    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q)
    const textFilters = `event_type.ilike.%${q}%,public_message.ilike.%${q}%,technical_message.ilike.%${q}%`
    query = query.or(looksLikeUuid ? `${textFilters},error_id.eq.${q}` : textFilters)
  }

  const { data, count, error } = await query.range(offset, offset + PAGE_SIZE - 1)
  const rows = data ?? []
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))
  const current = new URLSearchParams()
  if (q) current.set('q', q)
  if (severity) current.set('severity', severity)
  if (category) current.set('category', category)
  if (status) current.set('status', status)

  return <main className="admin-shell">
    <header className="admin-head">
      <div><span className="kicker">ERROR CENTER</span><h1>خطاها</h1><p>خطاهای ساختاریافته با شناسه قابل پیگیری، توضیح انسانی و اطلاعات فنی کنترل‌شده.</p></div>
      <Link className="admin-muted-button" href="/admin/system/logs">Audit Logs</Link>
    </header>

    <section className="admin-panel">
      <form className="admin-form" method="get">
        <label>جست‌وجو<input name="q" defaultValue={q} maxLength={120} placeholder="Error ID، Event Type یا متن" /></label>
        <label>دسته‌بندی<input name="category" defaultValue={category} maxLength={80} placeholder="مثلاً database یا auth" /></label>
        <label>شدت<select name="severity" defaultValue={severity}><option value="">همه</option><option value="warning">Warning</option><option value="error">Error</option><option value="critical">Critical</option></select></label>
        <label>وضعیت<select name="status" defaultValue={status}><option value="">همه</option><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="ignored">Ignored</option></select></label>
        <button className="admin-primary-button" type="submit">اعمال فیلتر</button>
      </form>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><h2>Error Records</h2><span>{count ?? 0} رکورد</span></div>
      {error ? <div className="admin-empty">خواندن خطاها انجام نشد. اطلاعات داخلی Backend به UI نشت داده نمی‌شود.</div> : null}
      {!error && rows.length === 0 ? <div className="admin-empty">خطایی مطابق فیلتر فعلی وجود ندارد.</div> : null}
      <div className="admin-error-list">
        {rows.map((row) => <article className="admin-error-card" key={row.id}>
          <div className="admin-section-title"><div><b>#{row.id} · {row.event_type}</b><small>{new Date(row.occurred_at).toLocaleString('fa-IR')} · {row.category} · {row.severity} · {row.status}</small></div><code>{String(row.error_id)}</code></div>
          <p>{row.public_message}</p>
          {row.explanation_fa ? <p><b>توضیح:</b> {row.explanation_fa}</p> : <p><b>توضیح:</b> علت قطعی هنوز مشخص نشده و باید از روی Context و Correlation بررسی شود.</p>}
          {row.technical_message ? <details><summary>جزئیات فنی</summary><pre>{row.technical_message}</pre></details> : null}
          {Array.isArray(row.probable_causes) && row.probable_causes.length ? <details><summary>علت‌های احتمالی</summary><ul>{row.probable_causes.map((item, index) => <li key={index}>{String(item)}</li>)}</ul></details> : null}
          <div className="admin-error-meta"><span>Route: {row.route ?? '—'}</span><span>Correlation: {row.correlation_id ? String(row.correlation_id) : '—'}</span></div>
        </article>)}
      </div>

      <div className="admin-pagination">
        {page > 1 ? <Link className="admin-muted-button" href={paramsFor(current, page - 1)}>قبلی</Link> : <span />}
        <span>صفحه {page} از {totalPages}</span>
        {page < totalPages ? <Link className="admin-muted-button" href={paramsFor(current, page + 1)}>بعدی</Link> : <span />}
      </div>
    </section>
  </main>
}
