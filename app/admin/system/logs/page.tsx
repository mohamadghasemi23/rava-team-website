import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS, requireAnyPermission } from '@/lib/authz/permissions'
import { oneOf, sanitizePostgrestSearchTerm } from '@/lib/platform/postgrest-search'
import {getAdminLocale} from '@/lib/i18n/admin-locale'

const PAGE_SIZE = 40
const SEVERITIES = ['debug','info','notice','warning','error','critical'] as const

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
  const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
  const severityLabel=(value:string)=>({debug:l('اشکال‌زدایی','Debug'),info:l('اطلاع','Information'),notice:l('توجه','Notice'),warning:l('هشدار','Warning'),error:l('خطا','Error'),critical:l('بحرانی','Critical')}[value]??value)
  await requireAnyPermission([PERMISSIONS.PLATFORM_AUDIT_VIEW, PERMISSIONS.LOGS_VIEW])
  const params = (await searchParams) ?? {}
  const q = sanitizePostgrestSearchTerm(one(params.q))
  const severity = oneOf(one(params.severity), SEVERITIES)
  const page = pageNumber(one(params.page))
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  let query = supabase
    .from('audit_log')
    .select('id,action,entity_type,entity_id,severity,organization_id,site_id,actor_id,correlation_id,created_at,context', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (severity) query = query.eq('severity', severity)
  if (q) query = query.or(`action.ilike.%${q}%,entity_type.ilike.%${q}%,entity_id.ilike.%${q}%`)

  const { data, count, error } = await query.range(offset, offset + PAGE_SIZE - 1)
  const rows = data ?? []
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))
  const current = new URLSearchParams()
  if (q) current.set('q', q)
  if (severity) current.set('severity', severity)

  return <main className="admin-shell">
    <header className="admin-head">
      <div><span className="kicker">{l('پایش و رهگیری','OBSERVABILITY')}</span><h1>{l('گزارش فعالیت‌ها','Activity log')}</h1><p>{l('عملیات مهم سامانه را همراه با زمان، اجراکننده و بخش تغییرکرده بررسی کنید.','Trace important platform operations, including who acted, when, and what changed.')}</p></div>
      <Link className="admin-primary-button" href="/admin/system/errors">{l('مشاهده خطاها','View errors')}</Link>
    </header>

    <section className="admin-panel">
      <form className="admin-form" method="get">
        <label>{l('جست‌وجو','Search')}<input name="q" defaultValue={q} maxLength={120} placeholder={l('عملیات، نوع داده یا شناسه','Action, entity, or identifier')} /></label>
        <label>{l('شدت','Severity')}
          <select name="severity" defaultValue={severity}>
            <option value="">{l('همه','All')}</option>{SEVERITIES.map(value=><option value={value} key={value}>{severityLabel(value)}</option>)}
          </select>
        </label>
        <button className="admin-primary-button" type="submit">{l('اعمال فیلتر','Apply filters')}</button>
      </form>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><h2>{l('تاریخچه ممیزی','Audit trail')}</h2><span>{count ?? 0} {l('رکورد','records')}</span></div>
      {error ? <div className="admin-empty">{l('خواندن گزارش‌ها انجام نشد. جزئیات فنی برای کاربر نمایش داده نمی‌شود.','Activity records could not be loaded. Technical details are not exposed to users.')}</div> : null}
      {!error && rows.length === 0 ? <div className="admin-empty">{l('گزارشی مطابق فیلتر فعلی وجود ندارد.','No activity matches the current filters.')}</div> : null}
      {rows.length > 0 ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{l('شناسه','ID')}</th><th>{l('زمان','Time')}</th><th>{l('عملیات','Action')}</th><th>{l('نوع داده','Entity')}</th><th>{l('شدت','Severity')}</th><th>{l('شناسه پیگیری','Correlation')}</th></tr></thead><tbody>
        {rows.map((row) => <tr key={row.id}><td>#{row.id}</td><td>{new Date(row.created_at).toLocaleString(locale==='fa'?'fa-IR':'en-GB')}</td><td><b>{row.action}</b></td><td>{row.entity_type}{row.entity_id ? ` · ${row.entity_id}` : ''}</td><td>{severityLabel(row.severity)}</td><td><code>{row.correlation_id ? String(row.correlation_id).slice(0, 8) : '—'}</code></td></tr>)}
      </tbody></table></div> : null}

      <div className="admin-pagination">
        {page > 1 ? <Link className="admin-muted-button" href={paramsFor(current, page - 1)}>{l('قبلی','Previous')}</Link> : <span />}
        <span>{l(`صفحه ${page} از ${totalPages}`,`Page ${page} of ${totalPages}`)}</span>
        {page < totalPages ? <Link className="admin-muted-button" href={paramsFor(current, page + 1)}>{l('بعدی','Next')}</Link> : <span />}
      </div>
    </section>
  </main>
}
