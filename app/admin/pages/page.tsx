import Link from 'next/link'
import {notFound,redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {hasPermission,PERMISSIONS,requireAnyPermission} from '@/lib/authz/permissions'
import ActionForm from '../components/ActionForm'
import AdminIcon from '../components/AdminIcon'
import {getAdminLocale} from '@/lib/i18n/admin-locale'
import {deletePage,setPageStatus} from './actions'
import HomePageSelector from './HomePageSelector'
import PageCreateDisclosure from './PageCreateDisclosure'

export const dynamic='force-dynamic'
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function PagesAdminPage({searchParams}:{searchParams:Promise<{site?:string}>}){
 const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
 const statusLabel=(status:string)=>({draft:l('پیش‌نویس','Draft'),published:l('منتشرشده','Published'),hidden:l('مخفی','Hidden'),scheduled:l('زمان‌بندی‌شده','Scheduled')}[status]??l('نامشخص','Unknown'))
 const{site:requestedSite}=await searchParams
 const supabase=await createClient()
 const{data:claimsData}=await supabase.auth.getClaims(),userId=claimsData?.claims?.sub
 if(!userId)redirect('/login')
 const{data:profile}=await supabase.from('profiles').select('active').eq('id',userId).single()
 if(!profile?.active)redirect('/login')
 const{data:sites}=await supabase.from('sites').select('id,organization_id,name,slug,status,primary_locale').order('name')

 if(!requestedSite){
  if(sites?.length===1)redirect(`/admin/pages?site=${sites[0].id}`)
  return <main className="admin-shell"><header className="admin-head"><div><span>{l('مرکز مدیریت راوا','RAVA CONTROL CENTER')}</span><h1>{l('مدیریت صفحه‌ها','Page management')}</h1><p>{l('سایتی را انتخاب کنید که می‌خواهید ویرایش شود.','Choose the site you want to edit.')}</p></div><Link className="admin-link" href="/admin">{l('خانه','Dashboard')}</Link></header><section className="admin-panel"><h2>{l('انتخاب سایت','Select a site')}</h2>{!sites?.length?<div className="admin-empty">{l('هیچ سایت قابل دسترسی برای این حساب وجود ندارد.','No accessible sites were found for this account.')}</div>:<div className="admin-list">{sites.map(site=><article className="admin-list-item" key={site.id}><div><b>{site.name}</b><small dir="ltr">{site.slug}</small></div><Link className="admin-primary-button" href={`/admin/pages?site=${site.id}`}>{l('باز کردن صفحه‌ها','Open pages')}</Link></article>)}</div>}</section></main>
 }
 if(!UUID_RE.test(requestedSite))notFound()
 const site=sites?.find(item=>item.id===requestedSite)
 if(!site)notFound()
 await requireAnyPermission([PERMISSIONS.CMS_VIEW,PERMISSIONS.CMS_MANAGE],{organizationId:site.organization_id,siteId:site.id})
 const[canManage,canPublish,{data},{data:homeMappings}]=await Promise.all([
  hasPermission(PERMISSIONS.CMS_MANAGE,{organizationId:site.organization_id,siteId:site.id}),
  hasPermission(PERMISSIONS.CMS_PUBLISH,{organizationId:site.organization_id,siteId:site.id}),
  supabase.from('pages').select('id,title,slug,status,updated_at').eq('site_id',site.id).order('updated_at',{ascending:false}),
  supabase.from('site_home_pages').select('locale,page_id').eq('site_id',site.id),
 ])
 const pages=data??[]

 return <main className="admin-shell rava-pages-simple">
  <header className="rava-pages-heading"><div><h1>{l(`صفحه‌های ${site.name}`,`${site.name} pages`)}</h1><p>{l('خانه را مشخص کنید یا محتوای یک صفحه را ویرایش کنید.','Choose the homepage or edit a page’s content.')}</p></div>{canManage?<PageCreateDisclosure siteId={site.id}/>:null}</header>
  {canPublish?<HomePageSelector siteId={site.id} primaryLocale={site.primary_locale||'fa'} pages={pages.map(page=>({id:page.id,title:page.title,slug:page.slug,status:page.status}))} mappings={homeMappings??[]}/>:null}
  <section className="rava-pages-list"><div className="admin-section-title"><div><h2>{l('صفحه‌ها','Pages')}</h2><p>{l('برای تغییر محتوا، فقط «ویرایش» را انتخاب کنید.','Choose Edit to change a page’s content.')}</p></div><span>{pages.length} {l('صفحه','pages')}</span></div>
   {pages.length===0?<div className="admin-empty">{l('هنوز صفحه‌ای ساخته نشده است.','No pages have been created yet.')}</div>:<div className="rava-page-rows">{pages.map(page=>{const published=page.status==='published';return <article className="rava-page-row" key={page.id}><div className="rava-page-identity"><span className="rava-page-sheet"><AdminIcon name="pages" size={18}/></span><div><b>{page.title}</b><small dir="ltr">/{page.slug}</small></div></div><div className="rava-page-row-actions"><span className={`status-pill status-${page.status}`}>{statusLabel(page.status)}</span>{canManage?<Link className="rava-page-edit" href={`/admin/pages/${page.id}`}>{l('ویرایش','Edit')}</Link>:null}<details className="rava-page-more"><summary aria-label={l('عملیات بیشتر','More actions')}>•••</summary><div>{(published?canManage:canPublish)?<ActionForm action={setPageStatus} confirmTitle={published?l('مخفی‌کردن صفحه','Hide page'):l('انتشار صفحه','Publish page')} confirmMessage={published?l(`صفحه «${page.title}» مخفی شود؟`,`Hide “${page.title}”?`):l(`صفحه «${page.title}» منتشر شود؟`,`Publish “${page.title}”?`)} confirmLabel={l('بله، انجام شود','Yes, continue')}><input type="hidden" name="id" value={page.id}/><input type="hidden" name="status" value={published?'hidden':'published'}/><button type="submit">{published?l('مخفی‌کردن','Hide'):l('انتشار','Publish')}</button></ActionForm>:null}{canManage?<ActionForm action={deletePage} danger confirmTitle={l('حذف کامل صفحه','Delete page')} confirmMessage={l(`صفحه «${page.title}» و محتوای آن حذف شود؟`,`Delete “${page.title}” and its content?`)} confirmLabel={l('بله، حذف شود','Yes, delete')}><input type="hidden" name="id" value={page.id}/><button className="is-danger" type="submit">{l('حذف صفحه','Delete page')}</button></ActionForm>:null}</div></details></div></article>})}</div>}
  </section>
 </main>
}
