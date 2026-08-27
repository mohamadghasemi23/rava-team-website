import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS, requirePermission } from '@/lib/authz/permissions'
import MediaManager from './MediaManager'
import {getAdminLocale} from '@/lib/i18n/admin-locale'

export const dynamic='force-dynamic'
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function MediaAdminPage({searchParams}:{searchParams:Promise<{site?:string}>}){
  const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
  const{site:requestedSite}=await searchParams;const supabase=await createClient();const{data:claims,error}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(error||!userId)redirect('/login')
  const{data:profile}=await supabase.from('profiles').select('active').eq('id',userId).single();if(!profile?.active)redirect('/login')
  const{data:sites}=await supabase.from('sites').select('id,organization_id,name,slug,status').order('name')
  if(!requestedSite){
    if(sites?.length===1)redirect(`/admin/media?site=${sites[0].id}`)
    return <main className="admin-shell"><header className="admin-head"><div><span>{l('مرکز مدیریت راوا','RAVA CONTROL CENTER')}</span><h1>{l('رسانه‌ها','Media')}</h1><p>{l('برای جلوگیری از مخلوط‌شدن فایل مشتری‌ها، ابتدا سایت را انتخاب کنید.','Select a site first to keep each customer’s files isolated.')}</p></div><Link className="admin-link" href="/admin">{l('خانه','Dashboard')}</Link></header><section className="admin-panel"><h2>{l('انتخاب سایت','Select a site')}</h2>{!sites?.length?<div className="admin-empty">{l('هیچ سایت قابل دسترسی برای این حساب وجود ندارد.','No accessible sites were found for this account.')}</div>:<div className="admin-list">{sites.map(site=><article className="admin-list-item" key={site.id}><div><b>{site.name}</b><small dir="ltr">{site.slug}</small></div><Link className="admin-primary-button" href={`/admin/media?site=${site.id}`}>{l('کتابخانه رسانه','Media library')}</Link></article>)}</div>}</section></main>
  }
  if(!UUID_RE.test(requestedSite))notFound();const site=sites?.find(item=>item.id===requestedSite);if(!site)notFound()
  await requirePermission(PERMISSIONS.MEDIA_MANAGE,{organizationId:site.organization_id,siteId:site.id})
  const{data}=await supabase.from('media_assets').select('id,storage_path,file_name,mime_type,alt_text,size_bytes,created_at').eq('site_id',site.id).is('deleted_at',null).order('created_at',{ascending:false})
  return <main className="admin-shell"><header className="admin-head"><div><span>{l('مرکز مدیریت راوا','RAVA CONTROL CENTER')}</span><h1>{l(`رسانه‌های ${site.name}`,`${site.name} media`)}</h1><p>{l('سایت فعال:','Active site:')} <b>{site.name}</b> · <span dir="ltr">{site.slug}</span></p></div><div className="admin-actions"><Link className="admin-link" href="/admin/media">{l('تغییر سایت','Change site')}</Link><Link className="admin-link" href={`/admin/pages?site=${site.id}`}>{l('صفحات سایت','Site pages')}</Link></div></header><MediaManager initialAssets={data??[]} siteId={site.id}/></main>
}
