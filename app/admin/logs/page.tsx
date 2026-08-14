import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import './logs.css'

export const dynamic='force-dynamic'
const PAGE_SIZE=25

const CATEGORIES=[
  ['error','خطاها','خطاهای Runtime، دیتابیس، Storage یا سرویس‌ها که نیاز به بررسی دارند.'],
  ['security','امنیت','رویدادهای مشکوک، محدودسازی درخواست‌ها و کنترل‌های امنیتی.'],
  ['auth','ورود و نشست','ورود، خروج، CAPTCHA، Session و احراز هویت مدیران.'],
  ['audit','تغییرات مدیریتی','ساخت، ویرایش و حذف اطلاعات مهم CMS؛ به‌صورت خودکار از دیتابیس.'],
  ['system','سیستم','رویدادهای داخلی و عملیاتی برنامه و سرویس‌ها.'],
  ['performance','کارایی','رویدادهای مربوط به کندی، Timeout و مصرف منابع.'],
] as const

function href(params:Record<string,string|number|undefined>){const s=new URLSearchParams();Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==''&&v!=='all')s.set(k,String(v))});return`?${s.toString()}`}
function safeDate(value:string|undefined){if(!value)return null;const d=new Date(value);return Number.isNaN(d.getTime())?null:d}

export default async function LogsPage({searchParams}:{searchParams:Promise<{q?:string;view?:string;category?:string;severity?:string;source?:string;from?:string;to?:string;page?:string}>}){
  const params=await searchParams
  const supabase=await createClient()
  const{data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub;if(!userId)redirect('/login')
  const{data:profile}=await supabase.from('profiles').select('role,active').eq('id',userId).single()
  if(!profile?.active||!['super_admin','admin'].includes(profile.role))redirect('/admin')

  const page=Math.max(1,Number(params.page||1)||1)
  const q=(params.q||'').trim().slice(0,180)
  const view=['all','errors','events'].includes(params.view||'')?params.view!:'all'
  const category=params.category||'all';const severity=params.severity||'all';const source=params.source||'all'
  const fromDate=safeDate(params.from);const toDate=safeDate(params.to)

  let query=supabase.from('system_events').select('event_no,event_id,request_id,category,severity,event_name,message,summary_fa,cause_fa,route,method,actor_user_id,actor_role,source,http_status,error_name,error_code,metadata,created_at',{count:'exact'}).order('created_at',{ascending:false})
  if(q){if(/^\d+$/.test(q))query=query.eq('event_no',Number(q));else query=query.or(`event_id.ilike.%${q}%,request_id.ilike.%${q}%,event_name.ilike.%${q}%,message.ilike.%${q}%,summary_fa.ilike.%${q}%,cause_fa.ilike.%${q}%,route.ilike.%${q}%,error_code.ilike.%${q}%`)}
  if(view==='errors')query=query.eq('category','error')
  else if(view==='events')query=query.neq('category','error')
  if(category!=='all')query=query.eq('category',category)
  if(severity!=='all')query=query.eq('severity',severity)
  if(source!=='all')query=query.eq('source',source)
  if(fromDate)query=query.gte('created_at',fromDate.toISOString())
  if(toDate){const end=new Date(toDate);end.setHours(23,59,59,999);query=query.lte('created_at',end.toISOString())}
  const from=(page-1)*PAGE_SIZE
  const{data,count,error}=await query.range(from,from+PAGE_SIZE-1)
  const total=count||0;const totalPages=Math.max(1,Math.ceil(total/PAGE_SIZE))

  const base={q,view,category,severity,source,from:params.from,to:params.to}
  return <main className="admin-shell"><header className="admin-head"><div><span>RAVA OBSERVABILITY</span><h1>مرکز لاگ و خطا</h1></div><div className="admin-actions"><Link className="admin-link" href="/admin">داشبورد</Link></div></header>

    <section className="admin-log-tabs"><Link className={view==='all'?'is-active':''} href={href({...base,view:'all',page:1})}>همه</Link><Link className={view==='errors'?'is-active':''} href={href({...base,view:'errors',page:1})}>فقط خطاها</Link><Link className={view==='events'?'is-active':''} href={href({...base,view:'events',page:1})}>فقط رویدادها</Link></section>

    <section className="admin-log-category-grid">{CATEGORIES.map(([key,title,description])=><Link key={key} className={`admin-log-category ${category===key?'is-active':''}`} href={href({...base,category:key,page:1})}><b>{title}</b><small>{description}</small></Link>)}</section>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>جستجو و فیلتر</h2><p>می‌توانی شماره عددی لاگ، ERR/EVT/SEC ID، Request ID، مسیر، کد خطا یا عبارت فارسی را جستجو کنی.</p></div><Link className="admin-muted-button" href="/admin/logs">پاک کردن همه فیلترها</Link></div><form className="admin-log-filters" method="get"><input type="hidden" name="view" value={view}/><label className="admin-log-search">جستجو<input name="q" defaultValue={q} placeholder="مثلاً 142 یا ERR-... یا 23505 یا /admin/pages" dir="auto"/></label><label>دسته<select name="category" defaultValue={category}><option value="all">همه دسته‌ها</option>{CATEGORIES.map(([key,title])=><option key={key} value={key}>{title}</option>)}</select></label><label>شدت<select name="severity" defaultValue={severity}><option value="all">همه شدت‌ها</option><option value="critical">بحرانی</option><option value="error">خطا</option><option value="warning">هشدار</option><option value="info">اطلاعات</option><option value="debug">Debug</option></select></label><label>منبع<select name="source" defaultValue={source}><option value="all">همه منابع</option><option value="server">Server</option><option value="database">Database</option><option value="client">Client</option><option value="proxy">Proxy</option></select></label><label>از تاریخ<input name="from" type="date" defaultValue={params.from||''}/></label><label>تا تاریخ<input name="to" type="date" defaultValue={params.to||''}/></label><button className="admin-primary-button" type="submit">اعمال فیلترها</button></form></section>

    <section className="admin-panel"><div className="admin-section-title"><div><h2>{view==='errors'?'خطاها':view==='events'?'رویدادها':'همه لاگ‌ها'}</h2><p>هر رکورد یک شماره کوتاه و یک شناسه یکتای کامل دارد.</p></div><span>{total.toLocaleString('fa-IR')} رکورد</span></div>
      {error?<div className="admin-empty">خواندن لاگ‌ها با خطا مواجه شد.</div>:null}
      {!error&&(data||[]).length===0?<div className="admin-empty">با این فیلترها لاگی پیدا نشد.</div>:<div className="admin-log-list">{(data||[]).map((e:any)=><article className={`admin-log-row severity-${e.severity}`} key={e.event_id}><div className="admin-log-row-head"><div><span className="admin-log-number">#{e.event_no}</span><code dir="ltr">{e.event_id}</code></div><time>{new Date(e.created_at).toLocaleString('fa-IR')}</time></div><div className="admin-log-badges"><span>{CATEGORIES.find(x=>x[0]===e.category)?.[1]||e.category}</span><span>{e.severity}</span><span>{e.source}</span>{e.http_status?<span>HTTP {e.http_status}</span>:null}</div><h3>{e.summary_fa||e.message||e.event_name}</h3>{e.cause_fa?<div className="admin-log-cause"><b>علت / توضیح:</b><p>{e.cause_fa}</p></div>:null}<div className="admin-log-tech"><b>رویداد فنی:</b><code dir="ltr">{e.event_name}</code>{e.error_name?<code dir="ltr">{e.error_name}{e.error_code?` · ${e.error_code}`:''}</code>:null}{e.route?<code dir="ltr">{e.method||''} {e.route}</code>:null}{e.request_id?<code dir="ltr">Request: {e.request_id}</code>:null}{e.actor_user_id?<code dir="ltr">Actor: {e.actor_user_id} {e.actor_role?`(${e.actor_role})`:''}</code>:null}</div><details><summary>جزئیات و Metadata امن</summary><pre dir="ltr">{JSON.stringify(e.metadata||{},null,2)}</pre></details></article>)}</div>}
      <div className="admin-pagination"><Link className={`admin-link ${page<=1?'is-disabled':''}`} href={href({...base,page:Math.max(1,page-1)})}>صفحه قبل</Link><span>صفحه {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}</span><Link className={`admin-link ${page>=totalPages?'is-disabled':''}`} href={href({...base,page:Math.min(totalPages,page+1)})}>صفحه بعد</Link></div>
    </section>
  </main>
}
