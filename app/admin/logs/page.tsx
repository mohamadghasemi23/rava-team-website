import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic='force-dynamic'
const PAGE_SIZE=50

export default async function LogsPage({searchParams}:{searchParams:Promise<{q?:string;category?:string;severity?:string;page?:string}>}){
  const params=await searchParams
  const supabase=await createClient()
  const{data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub;if(!userId)redirect('/login')
  const{data:profile}=await supabase.from('profiles').select('role,active').eq('id',userId).single()
  if(!profile?.active||!['super_admin','admin'].includes(profile.role))redirect('/admin')

  const page=Math.max(1,Number(params.page||1)||1)
  const q=(params.q||'').trim().slice(0,180)
  const category=params.category||'all'
  const severity=params.severity||'all'
  let query=supabase.from('system_events').select('event_id,request_id,category,severity,event_name,message,route,method,actor_user_id,actor_role,http_status,error_name,error_code,metadata,created_at',{count:'exact'}).order('created_at',{ascending:false})
  if(q)query=query.or(`event_id.ilike.%${q}%,request_id.ilike.%${q}%,event_name.ilike.%${q}%,message.ilike.%${q}%,route.ilike.%${q}%`)
  if(category!=='all')query=query.eq('category',category)
  if(severity!=='all')query=query.eq('severity',severity)
  const from=(page-1)*PAGE_SIZE
  const{data,count}=await query.range(from,from+PAGE_SIZE-1)
  const totalPages=Math.max(1,Math.ceil((count||0)/PAGE_SIZE))

  return <main className="admin-shell"><header className="admin-head"><div><span>RAVA OBSERVABILITY</span><h1>لاگ سیستم</h1></div><div className="admin-actions"><Link className="admin-link" href="/admin">داشبورد</Link></div></header>
    <section className="admin-panel"><form className="admin-form" method="get"><div className="admin-grid-2"><label>جستجو<input name="q" defaultValue={q} placeholder="ERR-... / EVT-... / route / event name" dir="ltr"/></label><label>دسته<select name="category" defaultValue={category}><option value="all">همه</option><option value="error">Error</option><option value="audit">Audit</option><option value="security">Security</option><option value="auth">Auth</option><option value="system">System</option><option value="performance">Performance</option></select></label></div><label>شدت<select name="severity" defaultValue={severity}><option value="all">همه</option><option value="critical">Critical</option><option value="error">Error</option><option value="warning">Warning</option><option value="info">Info</option><option value="debug">Debug</option></select></label><button className="admin-primary-button" type="submit">جستجو</button></form></section>
    <section className="admin-panel"><div className="admin-section-title"><h2>رویدادها</h2><span>{count||0} رکورد</span></div>{(data||[]).length===0?<div className="admin-empty">لاگی پیدا نشد.</div>:<div style={{display:'grid',gap:10}}>{(data||[]).map((e:any)=><article key={e.event_id} style={{border:'1px solid var(--line)',borderRadius:16,padding:14,background:'rgba(255,255,255,.02)'}}><div className="admin-section-title"><code dir="ltr">{e.event_id}</code><small>{new Date(e.created_at).toLocaleString('fa-IR')}</small></div><b>{e.category} · {e.severity} · {e.event_name}</b><p>{e.message||'—'}</p><small dir="ltr">{e.method||''} {e.route||''} {e.http_status||''}</small>{e.error_name?<p><code dir="ltr">{e.error_name}{e.error_code?` (${e.error_code})`:''}</code></p>:null}<details><summary>Metadata امن</summary><pre dir="ltr" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(e.metadata||{},null,2)}</pre></details></article>)}</div>}<div className="admin-pagination"><Link className="admin-link" aria-disabled={page<=1} href={`?q=${encodeURIComponent(q)}&category=${category}&severity=${severity}&page=${Math.max(1,page-1)}`}>صفحه قبل</Link><span>{page} / {totalPages}</span><Link className="admin-link" aria-disabled={page>=totalPages} href={`?q=${encodeURIComponent(q)}&category=${category}&severity=${severity}&page=${Math.min(totalPages,page+1)}`}>صفحه بعد</Link></div></section>
  </main>
}
