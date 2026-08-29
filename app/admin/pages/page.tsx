import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasPermission, PERMISSIONS, requireAnyPermission } from '@/lib/authz/permissions'
import ActionForm from '../components/ActionForm'
import { createPage, deletePage, setPageStatus } from './actions'
import {getAdminLocale} from '@/lib/i18n/admin-locale'
import AdminIcon from '../components/AdminIcon'

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
    <header className="admin-head"><div><span>{l('مدیریت محتوای سایت','SITE CONTENT')}</span><h1>{l(`صفحه‌های ${site.name}`,`${site.name} pages`)}</h1><p>{l('در این بخش فقط صفحه‌های همین سایت را می‌بینید و مدیریت می‌کنید.','Only pages belonging to this site are shown and managed here.')}</p><div className="rava-active-site"><AdminIcon name="sites" size={17}/><span>{l('سایت انتخاب‌شده','Selected site')}</span><b>{site.name}</b><small dir="ltr">{site.slug}</small>{(sites?.length??0)>1?<Link href="/admin/pages">{l('انتخاب سایت دیگر','Choose another site')}</Link>:null}</div></div><div className="admin-actions"><Link className="admin-muted-button" href={`/admin/platform/sites/${site.id}`}><AdminIcon name="arrow" size={17}/>{l('مرکز این سایت','Site workspace')}</Link></div></header>
    {canManage?<section className="admin-panel"><h2>{l('ساخت صفحه جدید','Create a page')}</h2><ActionForm action={createPage} className="admin-form admin-form-inline" confirmTitle={l('ساخت صفحه جدید','Create a page')} confirmMessage={l(`صفحه جدید برای سایت «${site.name}» ساخته شود؟`,`Create a new page for “${site.name}”?`)} confirmLabel={l('بله، صفحه ساخته شود','Yes, create page')}><input type="hidden" name="site_id" value={site.id}/><label>{l('عنوان','Title')}<input name="title" required placeholder={l('برای نمونه: خدمات طراحی سایت','For example: Website design services')}/></label><label>{l('آدرس صفحه','Page address')}<input name="slug" required dir="ltr" placeholder="web-design"/></label><button type="submit">{l('ساخت صفحه','Create page')}</button></ActionForm></section>:null}
    <section className="admin-panel"><div className="admin-section-title"><div><h2>{l('صفحه‌های همین سایت','Pages for this site')}</h2><p>{l('برای تغییر محتوا وارد ویرایش شوید؛ انتشار و حذف، عملیات جداگانه و قابل تأیید هستند.','Open Edit to change content. Publishing and deletion remain separate confirmed actions.')}</p></div><span>{pages.length} {l('صفحه','pages')}</span></div>{pages.length===0?<div className="admin-empty">{l('هنوز صفحه‌ای برای این سایت ساخته نشده است.','No pages have been created for this site yet.')}</div>:<div className="admin-table-wrap rava-data-table-wrap"><table className="admin-table rava-data-table"><thead><tr><th scope="col">{l('نام صفحه','Page')}</th><th scope="col">{l('آدرس','Address')}</th><th scope="col">{l('وضعیت','Status')}</th><th scope="col">{l('آخرین تغییر','Last updated')}</th><th scope="col">{l('عملیات','Actions')}</th></tr></thead><tbody>{pages.map(page=>{const published=page.status==='published';return <tr key={page.id}><td data-label={l('نام صفحه','Page')}><b>{page.title}</b></td><td data-label={l('آدرس','Address')}><code dir="ltr">/{page.slug}</code></td><td data-label={l('وضعیت','Status')}><span className={`status-pill status-${page.status}`}>{statusLabel(page.status)}</span></td><td data-label={l('آخرین تغییر','Last updated')}><time dateTime={page.updated_at}>{new Date(page.updated_at).toLocaleString(locale==='fa'?'fa-IR':'en-GB')}</time></td><td data-label={l('عملیات','Actions')}><div className="admin-row-actions">{canManage?<Link className="admin-link" href={`/admin/pages/${page.id}`}><AdminIcon name="pages" size={16}/>{l('ویرایش صفحه','Edit page')}</Link>:null}{(published?canManage:canPublish)?<ActionForm action={setPageStatus} confirmTitle={published?l('مخفی‌کردن صفحه','Hide page'):l('انتشار صفحه','Publish page')} confirmMessage={published?l(`صفحه «${page.title}» مخفی شود؟`,`Hide “${page.title}”?`):l(`صفحه «${page.title}» روی سایت منتشر شود؟`,`Publish “${page.title}” on the site?`)} confirmLabel={l('بله، انجام شود','Yes, continue')}><input type="hidden" name="id" value={page.id}/><input type="hidden" name="status" value={published?'hidden':'published'}/><button className="admin-muted-button" type="submit"><AdminIcon name={published?'lock':'check'} size={16}/>{published?l('مخفی‌کردن','Hide'):l('انتشار','Publish')}</button></ActionForm>:null}{canManage?<ActionForm action={deletePage} danger confirmTitle={l('حذف کامل صفحه','Delete page')} confirmMessage={l(`صفحه «${page.title}» و محتوای آن حذف شود؟`,`Delete “${page.title}” and all its content?`)} confirmLabel={l('بله، برای همیشه حذف شود','Yes, delete permanently')}><input type="hidden" name="id" value={page.id}/><button className="admin-danger-button" type="submit"><AdminIcon name="errors" size={16}/>{l('حذف','Delete')}</button></ActionForm>:null}</div></td></tr>})}</tbody></table></div>}</section>
  </main>
}
