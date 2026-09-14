import RavaAgencyHome from './components/RavaAgencyHome'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type JsonObject = Record<string, unknown>

const fallbackHome = {
  hero: { badge: 'آماده همکاری روی پروژه‌های جدید', title: 'تجربه‌های دیجیتال بهتر می‌سازیم.', description: 'راوا یک تیم مستقل برای طراحی و توسعه وب، محصولات دیجیتال و راهکارهای خلاقانه است؛ از ایده تا اجرا و رشد.', primary_cta: 'شروع پروژه', secondary_cta: 'دیدن نمونه‌کارها' },
  stats: [{ value: '03', label: 'محصول دیجیتال در حال توسعه' }, { value: '05+', label: 'برند و پروژه همکاری‌شده' }, { value: '03', label: 'حوزه تخصصی اصلی' }],
  marquee: 'طراحی وب — توسعه وب — فروشگاه اینترنتی — محصولات دیجیتال — برندینگ — تولید محتوا — هوش مصنوعی — اتوماسیون',
  services_intro: 'ما برای کسب‌وکارها تجربه‌های دیجیتال می‌سازیم؛ از وب‌سایت و فروشگاه تا محصول دیجیتال، محتوا و ابزارهای هوشمند.',
  about: { title: 'یک تیم مستقل برای ساختن بهتر.', body: 'راوا یک تیم مستقل دیجیتال است که روی طراحی و توسعه وب، محصولات دیجیتال، محتوا و راهکارهای مبتنی بر هوش مصنوعی کار می‌کند.' },
  values: [
    { title: 'وضوح', body: 'قبل از ساختن، باید دقیق بدانیم چه مسئله‌ای را حل می‌کنیم.' },
    { title: 'کیفیت', body: 'جزئیات بخشی از محصول‌اند، نه مرحله آخر پروژه.' },
    { title: 'سادگی', body: 'پیچیدگی فنی نباید به تجربه پیچیده برای کاربر تبدیل شود.' },
    { title: 'رشد', body: 'هر چیزی که می‌سازیم باید بتواند همراه کسب‌وکار بزرگ‌تر شود.' },
  ],
  final_cta: { title: 'پروژه‌ای دارید؟ شروع کنیم.', body: 'اگر ایده، کسب‌وکار یا محصولی دارید که نیاز به یک تجربه دیجیتال بهتر دارد، درباره‌اش با ما حرف بزنید.', button: 'شروع پروژه' },
}

const fallbackServices = [
  ['طراحی وب','web-design','وب‌سایت‌هایی که فقط زیبا نیستند؛ واضح، سریع و برای تبدیل بازدیدکننده به مشتری طراحی می‌شوند.'],
  ['توسعه وب','web-development','توسعه سریع، امن و مقیاس‌پذیر با تکنولوژی‌های مدرن و معماری متناسب با نیاز واقعی پروژه.'],
  ['فروشگاه اینترنتی','ecommerce','فروشگاه‌هایی با تجربه خرید ساده، مدیریت آسان و زیرساخت آماده رشد.'],
  ['محصولات دیجیتال','digital-products','پنل‌ها، داشبوردها، ابزارهای داخلی و پلتفرم‌های اختصاصی برای مسئله‌های واقعی کسب‌وکار.'],
  ['برندینگ و محتوا','brand-content','هویت بصری، جهت خلاقانه و محتوایی که برند را یکپارچه و قابل تشخیص می‌کند.'],
  ['AI و اتوماسیون','ai-automation','استفاده کاربردی از هوش مصنوعی برای ساده‌سازی فرایندها، تحلیل داده و ساخت ابزارهای هوشمند.'],
].map((item,i)=>({ id:`fallback-service-${i}`, title:item[0], slug:item[1], summary:item[2] }))

const fallbackProjects = [
  { id:'rava-traffic', title:'RAVA Traffic Engine', slug:'rava-traffic-engine', summary:'محصول داخلی راوا برای زیرساخت رشد ارگانیک، داده و اتوماسیون.', project_kind:'real' as const, client_name:'RAVA', project_year:2026, role_text:'Strategy / Product / Development', scope:['SEO','Automation','Data'], kpis:['In Development','Modular Architecture','Organic Growth'], featured:true, coverUrl:'', gallery:[] },
  { id:'ali-topol', title:'Ali Topol Store', slug:'ali-topol-store', summary:'فروشگاه اینترنتی پوشاک سایزبزرگ با تمرکز بر تجربه خرید ساده و مدیریت آسان.', project_kind:'real' as const, client_name:'Ali Topol', project_year:2026, role_text:'UX / Development', scope:['E-commerce','UX','Development'], kpis:['In Development'], featured:false, coverUrl:'', gallery:[] },
  { id:'nova', title:'NOVA', slug:'nova-concept', summary:'کانسپت فروشگاه دیجیتال برای یک برند مد معاصر.', project_kind:'concept' as const, client_name:null, project_year:2026, role_text:'Concept / Design', scope:['E-commerce','Art Direction'], kpis:['Concept Project'], featured:false, coverUrl:'', gallery:[] },
  { id:'luma', title:'LUMA', slug:'luma-concept', summary:'کانسپت محصول دیجیتال و داشبورد SaaS.', project_kind:'concept' as const, client_name:null, project_year:2026, role_text:'Concept / Product', scope:['SaaS','Dashboard'], kpis:['Concept Project'], featured:false, coverUrl:'', gallery:[] },
]

function asObject(value: unknown): JsonObject | null { return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null }

export default async function HomePage() {
  try {
    const supabase = await createClient()
    const [homeRow, servicesResult, projectsResult, settingsResult] = await Promise.all([
      supabase.from('site_content').select('content').eq('section_key','home').maybeSingle(),
      supabase.from('services').select('id,title,slug,summary').eq('published',true).order('sort_order',{ascending:true}),
      supabase.from('projects').select('id,title,slug,summary,project_kind,client_name,project_year,role_text,scope,kpis,featured,cover_media_id').eq('published',true).order('sort_order',{ascending:true}),
      supabase.from('site_settings').select('key,value').in('key',['general','enamad']),
    ])

    const projectRows = projectsResult.data ?? []
    const projectIds = projectRows.map(p=>p.id)
    const coverIds = projectRows.map(p=>p.cover_media_id).filter(Boolean) as string[]
    const galleryResult = projectIds.length ? await supabase.from('project_media').select('project_id,media_id,sort_order').in('project_id',projectIds).order('sort_order',{ascending:true}) : { data: [] as Array<{project_id:string;media_id:string;sort_order:number}> }
    const galleryRows = galleryResult.data ?? []
    const mediaIds = [...new Set([...coverIds,...galleryRows.map(g=>g.media_id)])]
    const mediaResult = mediaIds.length ? await supabase.from('media_assets').select('id,storage_path').in('id',mediaIds).is('deleted_at',null) : { data: [] as Array<{id:string;storage_path:string}> }
    const mediaMap = new Map((mediaResult.data ?? []).map(m=>[m.id,supabase.storage.from('rava-media').getPublicUrl(m.storage_path).data.publicUrl]))

    const projects = projectRows.length ? projectRows.map(p=>({
      id:p.id, title:p.title, slug:p.slug, summary:p.summary ?? '', project_kind:p.project_kind as 'real'|'concept', client_name:p.client_name, project_year:p.project_year, role_text:p.role_text,
      scope:Array.isArray(p.scope)?p.scope.map(String):[], kpis:Array.isArray(p.kpis)?p.kpis.map(String):[], featured:Boolean(p.featured), coverUrl:p.cover_media_id?mediaMap.get(p.cover_media_id) ?? '':'',
      gallery:galleryRows.filter(g=>g.project_id===p.id).map(g=>mediaMap.get(g.media_id) ?? '').filter(Boolean),
    })) : fallbackProjects

    const settingMap = Object.fromEntries((settingsResult.data ?? []).map(row=>[row.key,asObject(row.value) ?? {}]))
    const general = settingMap.general ?? {}
    const enamad = settingMap.enamad ?? {}
    const settings = {
      email:String(general.email ?? ''), phone:String(general.phone ?? ''), address:String(general.address ?? 'Shiraz, Iran'), instagram:String(general.instagram ?? ''), linkedin:String(general.linkedin ?? ''), telegram:String(general.telegram ?? ''), footer_text:String(general.footer_text ?? ''),
      enamad_enabled:Boolean(enamad.enabled), enamad_url:String(enamad.url ?? ''), enamad_image:String(enamad.image_url ?? ''),
    }

    const dbHome = asObject(homeRow.data?.content)
    const home = dbHome ? { ...fallbackHome, ...dbHome } : fallbackHome
    const services = servicesResult.data?.length ? servicesResult.data : fallbackServices

    return <RavaAgencyHome home={home as typeof fallbackHome} services={services} projects={projects} settings={settings}/>
  } catch {
    return <RavaAgencyHome home={fallbackHome} services={fallbackServices} projects={fallbackProjects} settings={{address:'Shiraz, Iran'}}/>
  }
}
