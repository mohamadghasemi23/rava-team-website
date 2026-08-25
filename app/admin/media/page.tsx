import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS, requirePermission } from '@/lib/authz/permissions'
import MediaManager from './MediaManager'

export const dynamic='force-dynamic'
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function MediaAdminPage({searchParams}:{searchParams:Promise<{site?:string}>}){
  const{site:requestedSite}=await searchParams;const supabase=await createClient();const{data:claims,error}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(error||!userId)redirect('/login')
  const{data:profile}=await supabase.from('profiles').select('active').eq('id',userId).single();if(!profile?.active)redirect('/login')
  const{data:sites}=await supabase.from('sites').select('id,organization_id,name,slug,status').order('name')
  if(!requestedSite){
    if(sites?.length===1)redirect(`/admin/media?site=${sites[0].id}`)
    return <main className="admin-shell"><header className="admin-head"><div><span>RAVA CONTROL CENTER</span><h1>رسانه‌ها</h1><p>برای جلوگیری از مخلوط‌شدن فایل مشتری‌ها، ابتدا سایت را انتخاب کن.</p></div><Link className="admin-link" href="/admin">داشبورد</Link></header><section className="admin-panel"><h2>انتخاب سایت</h2>{!sites?.length?<div className="admin-empty">هیچ سایت قابل دسترسی برای این حساب وجود ندارد.</div>:<div className="admin-list">{sites.map(site=><article className="admin-list-item" key={site.id}><div><b>{site.name}</b><small dir="ltr">{site.slug} · {site.status}</small></div><Link className="admin-primary-button" href={`/admin/media?site=${site.id}`}>کتابخانه رسانه</Link></article>)}</div>}</section></main>
  }
  if(!UUID_RE.test(requestedSite))notFound();const site=sites?.find(item=>item.id===requestedSite);if(!site)notFound()
  await requirePermission(PERMISSIONS.MEDIA_MANAGE,{organizationId:site.organization_id,siteId:site.id})
  const{data}=await supabase.from('media_assets').select('id,storage_path,file_name,mime_type,alt_text,size_bytes,created_at').eq('site_id',site.id).is('deleted_at',null).order('created_at',{ascending:false})
  return <main className="admin-shell"><header className="admin-head"><div><span>RAVA CONTROL CENTER</span><h1>رسانه‌های {site.name}</h1><p>سایت فعال: <b>{site.name}</b> · <span dir="ltr">{site.slug}</span></p></div><div className="admin-actions"><Link className="admin-link" href="/admin/media">تغییر سایت</Link><Link className="admin-link" href={`/admin/pages?site=${site.id}`}>صفحات سایت</Link></div></header><MediaManager initialAssets={data??[]} siteId={site.id}/></main>
}
