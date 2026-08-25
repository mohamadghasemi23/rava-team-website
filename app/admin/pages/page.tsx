import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasPermission, PERMISSIONS, requireAnyPermission } from '@/lib/authz/permissions'
import ActionForm from '../components/ActionForm'
import { createPage, deletePage, setPageStatus } from './actions'

export const dynamic = 'force-dynamic'
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function PagesAdminPage({searchParams}:{searchParams:Promise<{site?:string}>}) {
  const {site:requestedSite}=await searchParams
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims();const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')
  const {data:profile}=await supabase.from('profiles').select('active').eq('id',userId).single()
  if(!profile?.active)redirect('/login')
  const {data:sites}=await supabase.from('sites').select('id,organization_id,name,slug,status').order('name')

  if(!requestedSite){
    if(sites?.length===1)redirect(`/admin/pages?site=${sites[0].id}`)
    return <main className="admin-shell"><header className="admin-head"><div><span>RAVA CONTROL CENTER</span><h1>مدیریت صفحات</h1><p>ابتدا سایتی را انتخاب کن تا محتوای مشتری‌ها با هم مخلوط نشود.</p></div><Link className="admin-link" href="/admin">داشبورد</Link></header><section className="admin-panel"><h2>انتخاب سایت</h2>{!sites?.length?<div className="admin-empty">هیچ سایت قابل دسترسی برای این حساب وجود ندارد.</div>:<div className="admin-list">{sites.map(site=><article className="admin-list-item" key={site.id}><div><b>{site.name}</b><small dir="ltr">{site.slug} · {site.status}</small></div><Link className="admin-primary-button" href={`/admin/pages?site=${site.id}`}>مدیریت صفحات</Link></article>)}</div>}</section></main>
  }
  if(!UUID_RE.test(requestedSite))notFound()
  const site=sites?.find(item=>item.id===requestedSite)
  if(!site)notFound()
  await requireAnyPermission([PERMISSIONS.CMS_VIEW,PERMISSIONS.CMS_MANAGE],{organizationId:site.organization_id,siteId:site.id})
  const [canManage,canPublish,{data}]=await Promise.all([
    hasPermission(PERMISSIONS.CMS_MANAGE,{organizationId:site.organization_id,siteId:site.id}),
    hasPermission(PERMISSIONS.CMS_PUBLISH,{organizationId:site.organization_id,siteId:site.id}),
    supabase.from('pages').select('id,title,slug,status,updated_at').eq('site_id',site.id).order('updated_at',{ascending:false}),
  ])
  const pages=data??[]

  return <main className="admin-shell">
    <header className="admin-head"><div><span>RAVA CONTROL CENTER</span><h1>صفحات {site.name}</h1><p>سایت فعال: <b>{site.name}</b> · <span dir="ltr">{site.slug}</span></p></div><div className="admin-actions"><Link className="admin-link" href="/admin/pages">تغییر سایت</Link><Link className="admin-link" href={`/admin/platform/sites/${site.id}`}>تنظیمات سایت</Link></div></header>
    {canManage?<section className="admin-panel"><h2>ساخت صفحه جدید</h2><ActionForm action={createPage} className="admin-form admin-form-inline" confirmTitle="ساخت صفحه جدید" confirmMessage={`صفحه جدید برای سایت «${site.name}» ساخته شود؟`} confirmLabel="بله، صفحه ساخته شود"><input type="hidden" name="site_id" value={site.id}/><label>عنوان<input name="title" required placeholder="مثلاً خدمات طراحی سایت"/></label><label>آدرس صفحه<input name="slug" required dir="ltr" placeholder="web-design"/></label><button type="submit">ساخت صفحه</button></ActionForm></section>:null}
    <section className="admin-panel"><div className="admin-section-title"><h2>صفحات همین سایت</h2><span>{pages.length} صفحه</span></div>{pages.length===0?<div className="admin-empty">هنوز صفحه‌ای برای این سایت ساخته نشده است.</div>:<div className="admin-list">{pages.map(page=>{const published=page.status==='published';return <article className="admin-list-item" key={page.id}><div className="admin-list-main"><div><b>{page.title}</b><small dir="ltr">/{page.slug}</small></div><span className={`status-pill status-${page.status}`}>{page.status}</span></div><div className="admin-row-actions">{canManage?<Link className="admin-link" href={`/admin/pages/${page.id}`}>ویرایش</Link>:null}{(published?canManage:canPublish)?<ActionForm action={setPageStatus} confirmTitle={published?'مخفی کردن صفحه':'انتشار صفحه'} confirmMessage={published?`صفحه «${page.title}» مخفی شود؟`:`صفحه «${page.title}» روی سایت منتشر شود؟`} confirmLabel="بله، انجام شود"><input type="hidden" name="id" value={page.id}/><input type="hidden" name="status" value={published?'hidden':'published'}/><button className="admin-muted-button" type="submit">{published?'مخفی کن':'منتشر کن'}</button></ActionForm>:null}{canManage?<ActionForm action={deletePage} danger confirmTitle="حذف کامل صفحه" confirmMessage={`صفحه «${page.title}» و محتوای آن حذف شود؟`} confirmLabel="بله، برای همیشه حذف شود"><input type="hidden" name="id" value={page.id}/><button className="admin-danger-button" type="submit">حذف</button></ActionForm>:null}</div></article>})}</div>}</section>
  </main>
}
