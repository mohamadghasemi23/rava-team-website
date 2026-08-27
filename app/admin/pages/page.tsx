import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasPermission, PERMISSIONS, requireAnyPermission } from '@/lib/authz/permissions'
import ActionForm from '../components/ActionForm'
import { createPage, deletePage, setPageStatus } from './actions'
import {getAdminLocale} from '@/lib/i18n/admin-locale'

export const dynamic = 'force-dynamic'
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function PagesAdminPage({searchParams}:{searchParams:Promise<{site?:string}>}) {
  const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
  const statusLabel=(status:string)=>({draft:l('پیش‌نویس','Draft'),published:l('منتشرشده','Published'),hidden:l('مخفی','Hidden'),scheduled:l('زمان‌بندی‌شده','Scheduled')}[status]??l('نامشخص','Unknown'))
  const {site:requestedSite}=await searchParams
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims();const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')
  const {data:profile}=await supabase.from('profiles').select('active').eq('id',userId).single()
  if(!profile?.active)redirect('/login')
  const {data:sites}=await supabase.from('sites').select('id,organization_id,name,slug,status').order('name')

  if(!requestedSite){
    if(sites?.length===1)redirect(`/admin/pages?site=${sites[0].id}`)
    return <main className="admin-shell"><header className="admin-head"><div><span>{l('مرکز مدیریت راوا','RAVA CONTROL CENTER')}</span><h1>{l('مدیریت صفحه‌ها','Page management')}</h1><p>{l('ابتدا سایت را انتخاب کنید تا محتوای مشتری‌ها با یکدیگر مخلوط نشود.','Select a site first to keep each customer’s content isolated.')}</p></div><Link className="admin-link" href="/admin">{l('خانه','Dashboard')}</Link></header><section className="admin-panel"><h2>{l('انتخاب سایت','Select a site')}</h2>{!sites?.length?<div className="admin-empty">{l('هیچ سایت قابل دسترسی برای این حساب وجود ندارد.','No accessible sites were found for this account.')}</div>:<div className="admin-list">{sites.map(site=><article className="admin-list-item" key={site.id}><div><b>{site.name}</b><small dir="ltr">{site.slug}</small></div><Link className="admin-primary-button" href={`/admin/pages?site=${site.id}`}>{l('مدیریت صفحه‌ها','Manage pages')}</Link></article>)}</div>}</section></main>
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
    <header className="admin-head"><div><span>{l('مرکز مدیریت راوا','RAVA CONTROL CENTER')}</span><h1>{l(`صفحه‌های ${site.name}`,`${site.name} pages`)}</h1><p>{l('سایت فعال:','Active site:')} <b>{site.name}</b> · <span dir="ltr">{site.slug}</span></p></div><div className="admin-actions">{(sites?.length??0)>1?<Link className="admin-link" href="/admin/pages">{l('تغییر سایت','Change site')}</Link>:null}<Link className="admin-link" href={`/admin/platform/sites/${site.id}`}>{l('تنظیمات سایت','Site settings')}</Link></div></header>
    {canManage?<section className="admin-panel"><h2>{l('ساخت صفحه جدید','Create a page')}</h2><ActionForm action={createPage} className="admin-form admin-form-inline" confirmTitle={l('ساخت صفحه جدید','Create a page')} confirmMessage={l(`صفحه جدید برای سایت «${site.name}» ساخته شود؟`,`Create a new page for “${site.name}”?`)} confirmLabel={l('بله، صفحه ساخته شود','Yes, create page')}><input type="hidden" name="site_id" value={site.id}/><label>{l('عنوان','Title')}<input name="title" required placeholder={l('برای نمونه: خدمات طراحی سایت','For example: Website design services')}/></label><label>{l('آدرس صفحه','Page address')}<input name="slug" required dir="ltr" placeholder="web-design"/></label><button type="submit">{l('ساخت صفحه','Create page')}</button></ActionForm></section>:null}
    <section className="admin-panel"><div className="admin-section-title"><h2>{l('صفحه‌های همین سایت','Pages for this site')}</h2><span>{pages.length} {l('صفحه','pages')}</span></div>{pages.length===0?<div className="admin-empty">{l('هنوز صفحه‌ای برای این سایت ساخته نشده است.','No pages have been created for this site yet.')}</div>:<div className="admin-list">{pages.map(page=>{const published=page.status==='published';return <article className="admin-list-item" key={page.id}><div className="admin-list-main"><div><b>{page.title}</b><small dir="ltr">/{page.slug}</small></div><span className={`status-pill status-${page.status}`}>{statusLabel(page.status)}</span></div><div className="admin-row-actions">{canManage?<Link className="admin-link" href={`/admin/pages/${page.id}`}>{l('ویرایش','Edit')}</Link>:null}{(published?canManage:canPublish)?<ActionForm action={setPageStatus} confirmTitle={published?l('مخفی‌کردن صفحه','Hide page'):l('انتشار صفحه','Publish page')} confirmMessage={published?l(`صفحه «${page.title}» مخفی شود؟`,`Hide “${page.title}”?`):l(`صفحه «${page.title}» روی سایت منتشر شود؟`,`Publish “${page.title}” on the site?`)} confirmLabel={l('بله، انجام شود','Yes, continue')}><input type="hidden" name="id" value={page.id}/><input type="hidden" name="status" value={published?'hidden':'published'}/><button className="admin-muted-button" type="submit">{published?l('مخفی کن','Hide'):l('منتشر کن','Publish')}</button></ActionForm>:null}{canManage?<ActionForm action={deletePage} danger confirmTitle={l('حذف کامل صفحه','Delete page')} confirmMessage={l(`صفحه «${page.title}» و محتوای آن حذف شود؟`,`Delete “${page.title}” and all its content?`)} confirmLabel={l('بله، برای همیشه حذف شود','Yes, delete permanently')}><input type="hidden" name="id" value={page.id}/><button className="admin-danger-button" type="submit">{l('حذف','Delete')}</button></ActionForm>:null}</div></article>})}</div>}</section>
  </main>
}
