import Link from 'next/link'
import {notFound,redirect} from 'next/navigation'
import AdminContextHeader from '@/app/admin/components/AdminContextHeader'
import {requirePermission,PERMISSIONS} from '@/lib/authz/permissions'
import {getAdminLocale} from '@/lib/i18n/admin-locale'
import {createClient} from '@/lib/supabase/server'
import styles from './template-guide.module.css'

export const dynamic='force-dynamic'

export default async function TemplateGuide({params}:{params:Promise<{id:string}>}){
 const {id}=await params
 const locale=await getAdminLocale()
 const l=(fa:string,en:string)=>locale==='fa'?fa:en
 const supabase=await createClient()
 const {data:claimsData}=await supabase.auth.getClaims()
 const userId=claimsData?.claims?.sub
 if(!userId)redirect('/login')
 const [{data:profile},{data:site},{data:state}]=await Promise.all([
  supabase.from('profiles').select('active,display_name,role').eq('id',userId).maybeSingle(),
  supabase.from('sites').select('id,organization_id,name').eq('id',id).maybeSingle(),
  supabase.from('site_design_state').select('current_template_id,current_template_version_id').eq('site_id',id).maybeSingle(),
 ])
 if(!profile?.active)redirect('/login')
 if(!site)notFound()
 await requirePermission(PERMISSIONS.CMS_MANAGE,{organizationId:site.organization_id,siteId:site.id})
 const [{data:template},{data:version}]=await Promise.all([
  state?.current_template_id?supabase.from('template_catalog').select('key,name_fa,name_en,description_fa,description_en,industry_key,commercial_tier').eq('id',state.current_template_id).maybeSingle():Promise.resolve({data:null}),
  state?.current_template_version_id?supabase.from('template_versions').select('version,module_defaults').eq('id',state.current_template_version_id).maybeSingle():Promise.resolve({data:null}),
 ])
 if(state?.current_template_id&&!template)notFound()
 const displayName=String(profile.display_name??'').trim()||l('کاربر راوا','RAVA user')
 const initials=displayName.split(/\s+/).slice(0,2).map((part:string)=>part[0]).join('')
 const roleNames:Record<string,string>={super_admin:l('مالک پلتفرم','Platform owner'),admin:l('مدیر','Administrator'),editor:l('ویرایشگر','Editor'),viewer:l('مشاهده‌گر','Viewer')}
 const templateName=template?(locale==='fa'?template.name_fa:template.name_en):l('قالب فعلی سایت','Current site template')
 const description=template?(locale==='fa'?template.description_fa:template.description_en):l('اطلاعات این قالب هنوز تکمیل نشده است.','This template description has not been completed yet.')
 return <main className={styles.page} dir={locale==='fa'?'rtl':'ltr'}>
  <div className={styles.shell}>
   <AdminContextHeader locale={locale} pageTitle={l('راهنمای قالب','Template guide')} site={{id:site.id,name:site.name}} template={{name:templateName,href:`/admin/platform/sites/${site.id}/template-guide`}} identity={{name:displayName,role:roleNames[String(profile.role)]??l('کاربر مجاز','Authorized user'),initials}}/>
   <div className={styles.layout}>
    <nav className={styles.side} aria-label={l('بخش‌های راهنمای قالب','Template guide sections')}><span>{l('راهنمای قالب','Template guide')}</span><a href="#overview">{l('معرفی کلی','Overview')}</a><a href="#features">{l('امکانات','Capabilities')}</a><a href="#editing">{l('مدیریت محتوا','Content editing')}</a><a href="#protection">{l('محافظت از طراحی','Design protection')}</a></nav>
    <article className={styles.content}>
     <Link className={styles.back} href={`/admin/pages?site=${site.id}`}>{l('← بازگشت به صفحه‌های سایت','← Back to site pages')}</Link>
     <header className={styles.hero} id="overview"><span>{l('قالب فعال','Active template')} · {l('نسخه','Version')} {version?.version??'—'}</span><h1>{templateName}</h1><p>{description}</p><div><b>{l('واکنش‌گرا','Responsive')}</b><b>{l('فارسی و انگلیسی','Persian and English')}</b><b>{l('آماده سئو','SEO ready')}</b><b>{template?.commercial_tier??l('پایه','Core')}</b></div></header>
     <section id="features"><div><small>۰۱</small><h2>{l('این قالب چه امکاناتی دارد؟','What does this template include?')}</h2></div><ul>{(version?.module_defaults??[]).length?(version?.module_defaults??[]).map((item:string)=><li key={item}>{item}</li>):<><li>{l('معرفی خدمات و مزیت‌ها','Services and benefits')}</li><li>{l('گالری و رسانه','Gallery and media')}</li><li>{l('دعوت به همکاری','Calls to action')}</li></>}</ul></section>
     <section id="editing"><div><small>۰۲</small><h2>{l('چه چیزهایی قابل مدیریت است؟','What can be managed?')}</h2></div><ul><li>{l('عنوان‌ها، توضیحات و دکمه‌ها','Titles, descriptions and buttons')}</li><li>{l('تصاویر و متن جایگزین','Images and alternative text')}</li><li>{l('اطلاعات جست‌وجو و اشتراک‌گذاری','Search and sharing information')}</li><li>{l('بخش‌های مجاز همین قالب','Template-approved sections')}</li></ul></section>
     <section id="protection"><div><small>۰۳</small><h2>{l('چطور کیفیت طراحی حفظ می‌شود؟','How is design quality protected?')}</h2></div><ul><li>{l('هر رسانه اندازه و نسبت مشخص دارد.','Every media slot has a defined size and ratio.')}</li><li>{l('چیدمان فقط در محدوده‌های تأییدشده تغییر می‌کند.','Layout changes stay within approved options.')}</li><li>{l('ذخیره پیش‌نویس از انتشار جداست.','Draft saving is separate from publishing.')}</li><li>{l('نسخه‌های قبلی قابل بازگشت هستند.','Previous versions can be restored.')}</li></ul></section>
    </article>
   </div>
  </div>
 </main>
}
