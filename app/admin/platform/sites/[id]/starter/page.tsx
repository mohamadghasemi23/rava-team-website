import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS } from '@/lib/authz/permissions'
import { authorizeSiteFeature, FeatureAccessError } from '@/lib/entitlements/runtime'
import StarterWizard from './StarterWizard'

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export default async function StarterPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;if(!uuid.test(id)) notFound();const supabase=await createClient()
  const {data:site}=await supabase.from('sites').select('id,name,slug').eq('id',id).maybeSingle();if(!site) notFound()
  try{await authorizeSiteFeature({siteId:id,moduleKey:'cms',permissions:[PERMISSIONS.PLATFORM_SITES_MANAGE,PERMISSIONS.STARTER_PACKS_INSTALL],route:`/admin/platform/sites/${id}/starter`,operation:'page.view'})}
  catch(error){if(!(error instanceof FeatureAccessError)) throw error;return <main className="admin-shell"><header className="admin-head"><div><span className="kicker">FEATURE GATE</span><h1>راه‌اندازی اولیه در دسترس نیست</h1><p>{site.name}</p></div><Link className="admin-muted-button" href={`/admin/platform/sites/${id}`}>بازگشت</Link></header><section className="admin-panel"><div className="admin-empty">{error.code==='permission_denied'?'Permission لازم برای نصب بسته شروع وجود ندارد.':'ماژول CMS این سایت فعال نیست.'}</div></section></main>}
  const [{data:options,error},{data:history}]=await Promise.all([supabase.rpc('get_site_starter_options',{p_site_id:id}),supabase.from('starter_pack_installations').select('id,status,locales,installed_at,approved_at,rolled_back_at').eq('site_id',id).order('installed_at',{ascending:false}).limit(10)])
  if(error) throw error
  return <main className="admin-shell"><header className="admin-head"><div><span className="kicker">SERVICE SITE · P3</span><h1>Starter Setup</h1><p>{site.name} · انتخاب محتوا، قالب و زبان با Preview و تأیید انسانی.</p></div><Link className="admin-muted-button" href={`/admin/platform/sites/${id}`}>بازگشت به سایت</Link></header><StarterWizard siteId={id} siteName={site.name} options={Array.isArray(options)?options:[]}/><section className="admin-panel"><div className="admin-section-title"><div><h2>تاریخچه نصب</h2><p>نصب‌ها قابل ردیابی‌اند و انتشار عمومی مستقل است.</p></div><span>{history?.length??0}</span></div>{!history?.length?<div className="admin-empty">هنوز بسته‌ای نصب نشده است.</div>:<div className="admin-list">{history.map(item=><article className="admin-list-row" key={item.id}><div><b>{item.status}</b><small>{item.locales.join(' + ')} · {new Date(item.installed_at).toLocaleString('fa-IR')}</small></div><span>{item.status==='installed'?'منتظر بازبینی':'ثبت‌شده'}</span></article>)}</div>}</section></main>
}
