import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PERMISSIONS } from '@/lib/authz/permissions'
import { authorizeSiteFeature, FeatureAccessError } from '@/lib/entitlements/runtime'
import StarterWizard from './StarterWizard'
import {getAdminLocale} from '@/lib/i18n/admin-locale'

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export default async function StarterPage({params}:{params:Promise<{id:string}>}){
  const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
  const {id}=await params;if(!uuid.test(id)) notFound();const supabase=await createClient()
  const {data:site}=await supabase.from('sites').select('id,name,slug').eq('id',id).maybeSingle();if(!site) notFound()
  try{await authorizeSiteFeature({siteId:id,moduleKey:'cms',permissions:[PERMISSIONS.PLATFORM_SITES_MANAGE,PERMISSIONS.STARTER_PACKS_INSTALL],route:`/admin/platform/sites/${id}/starter`,operation:'page.view'})}
  catch(error){if(!(error instanceof FeatureAccessError)) throw error;return <main className="admin-shell"><header className="admin-head"><div><span className="kicker">{l('کنترل دسترسی قابلیت','FEATURE GATE')}</span><h1>{l('راه‌اندازی اولیه در دسترس نیست','Starter setup is unavailable')}</h1><p>{site.name}</p></div><Link className="admin-muted-button" href={`/admin/platform/sites/${id}`}>{l('بازگشت','Back')}</Link></header><section className="admin-panel"><div className="admin-empty">{error.code==='permission_denied'?l('دسترسی لازم برای نصب بسته آغازین وجود ندارد.','You do not have permission to install a starter pack.'):l('بخش مدیریت محتوای این سایت فعال نیست.','The content management module is not enabled for this site.')}</div></section></main>}
  const [{data:options,error},{data:history}]=await Promise.all([supabase.rpc('get_site_starter_options',{p_site_id:id}),supabase.from('starter_pack_installations').select('id,status,locales,installed_at,approved_at,rolled_back_at').eq('site_id',id).order('installed_at',{ascending:false}).limit(10)])
  if(error) throw error
  return <main className="admin-shell"><header className="admin-head"><div><span className="kicker">{l('سایت خدماتی · مرحله ۳','SERVICE SITE · STEP 3')}</span><h1>{l('راه‌اندازی محتوای آغازین','Starter setup')}</h1><p>{site.name} · {l('انتخاب محتوا، قالب و زبان با پیش‌نمایش و تأیید انسانی.','Choose content, design, and languages with preview and human approval.')}</p></div><Link className="admin-muted-button" href={`/admin/platform/sites/${id}`}>{l('بازگشت به سایت','Back to site')}</Link></header><StarterWizard siteId={id} siteName={site.name} options={Array.isArray(options)?options:[]}/><section className="admin-panel"><div className="admin-section-title"><div><h2>{l('تاریخچه نصب','Installation history')}</h2><p>{l('نصب‌ها قابل ردیابی‌اند و انتشار عمومی مستقل است.','Installations are traceable and public publishing remains separate.')}</p></div><span>{history?.length??0}</span></div>{!history?.length?<div className="admin-empty">{l('هنوز بسته‌ای نصب نشده است.','No starter pack has been installed yet.')}</div>:<div className="admin-list">{history.map(item=><article className="admin-list-row" key={item.id}><div><b>{item.status==='installed'?l('نصب‌شده','Installed'):l('ثبت‌شده','Recorded')}</b><small>{item.locales.map((code:string)=>code==='fa'?l('فارسی','Persian'):l('انگلیسی','English')).join(' + ')} · {new Date(item.installed_at).toLocaleString(locale==='fa'?'fa-IR':'en-GB')}</small></div><span>{item.status==='installed'?l('منتظر بازبینی','Awaiting review'):l('ثبت‌شده','Recorded')}</span></article>)}</div>}</section></main>
}
