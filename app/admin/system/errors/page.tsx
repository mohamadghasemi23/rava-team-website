import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS, requireAnyPermission } from '@/lib/authz/permissions'
import { oneOf, sanitizePostgrestSearchTerm } from '@/lib/platform/postgrest-search'
import {getAdminLocale} from '@/lib/i18n/admin-locale'

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
  const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
  const severityLabel=(value:string)=>({warning:l('هشدار','Warning'),error:l('خطا','Error'),critical:l('بحرانی','Critical')}[value]??value)
  const statusLabel=(value:string)=>({open:l('باز','Open'),investigating:l('در حال بررسی','Investigating'),resolved:l('حل‌شده','Resolved'),ignored:l('نادیده‌گرفته‌شده','Ignored')}[value]??value)
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
      <div><span className="kicker">{l('مرکز خطاهای سامانه','ERROR CENTER')}</span><h1>{l('خطاهای سامانه','System errors')}</h1><p>{l('خطاهای ساختاریافته را با شناسه قابل پیگیری، توضیح روشن و اطلاعات فنی کنترل‌شده بررسی کنید.','Review structured errors with traceable identifiers, clear explanations, and controlled technical details.')}</p></div>
      <Link className="admin-muted-button" href="/admin/system/logs">{l('گزارش فعالیت‌ها','Activity log')}</Link>
    </header>

    <section className="admin-panel">
      <form className="admin-form" method="get">
        <label>{l('جست‌وجو','Search')}<input name="q" defaultValue={q} maxLength={120} placeholder={l('شناسه خطا، نوع رویداد یا متن','Error ID, event type, or text')} /></label>
        <label>{l('دسته‌بندی','Category')}<input name="category" defaultValue={category} maxLength={80} placeholder={l('برای نمونه: پایگاه داده یا ورود','For example: database or authentication')} /></label>
        <label>{l('شدت','Severity')}<select name="severity" defaultValue={severity}><option value="">{l('همه','All')}</option>{SEVERITIES.map(value=><option value={value} key={value}>{severityLabel(value)}</option>)}</select></label>
        <label>{l('وضعیت','Status')}<select name="status" defaultValue={status}><option value="">{l('همه','All')}</option>{STATUSES.map(value=><option value={value} key={value}>{statusLabel(value)}</option>)}</select></label>
        <button className="admin-primary-button" type="submit">{l('اعمال فیلتر','Apply filters')}</button>
      </form>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><h2>{l('سوابق خطا','Error records')}</h2><span>{count ?? 0} {l('رکورد','records')}</span></div>
      {error ? <div className="admin-empty">{l('خواندن خطاها انجام نشد. اطلاعات داخلی سامانه برای کاربر نمایش داده نمی‌شود.','Errors could not be loaded. Internal platform details are not exposed to users.')}</div> : null}
      {!error && rows.length === 0 ? <div className="admin-empty">{l('خطایی مطابق فیلتر فعلی وجود ندارد.','No errors match the current filters.')}</div> : null}
      <div className="admin-error-list">
        {rows.map((row) => <article className="admin-error-card" key={row.id}>
          <div className="admin-section-title"><div><b>#{row.id} · {row.event_type}</b><small>{new Date(row.occurred_at).toLocaleString(locale==='fa'?'fa-IR':'en-GB')} · {row.category} · {severityLabel(row.severity)} · {statusLabel(row.status)}</small></div><code>{String(row.error_id)}</code></div>
          <p>{row.public_message}</p>
          {(locale==='fa'?row.explanation_fa:row.explanation_en) ? <p><b>{l('توضیح:','Explanation:')}</b> {locale==='fa'?row.explanation_fa:row.explanation_en}</p> : <p><b>{l('توضیح:','Explanation:')}</b> {l('علت قطعی هنوز مشخص نشده و باید با شناسه‌های پیگیری بررسی شود.','The definitive cause is not known yet and requires correlation-based investigation.')}</p>}
          {row.technical_message ? <details><summary>{l('جزئیات فنی','Technical details')}</summary><pre>{row.technical_message}</pre></details> : null}
          {Array.isArray(row.probable_causes) && row.probable_causes.length ? <details><summary>{l('علت‌های احتمالی','Probable causes')}</summary><ul>{row.probable_causes.map((item, index) => <li key={index}>{String(item)}</li>)}</ul></details> : null}
          <div className="admin-error-meta"><span>{l('مسیر','Route')}: {row.route ?? '—'}</span><span>{l('شناسه پیگیری','Correlation')}: {row.correlation_id ? String(row.correlation_id) : '—'}</span></div>
        </article>)}
      </div>

      <div className="admin-pagination">
        {page > 1 ? <Link className="admin-muted-button" href={paramsFor(current, page - 1)}>{l('قبلی','Previous')}</Link> : <span />}
        <span>{l(`صفحه ${page} از ${totalPages}`,`Page ${page} of ${totalPages}`)}</span>
        {page < totalPages ? <Link className="admin-muted-button" href={paramsFor(current, page + 1)}>{l('بعدی','Next')}</Link> : <span />}
      </div>
    </section>
  </main>
}
