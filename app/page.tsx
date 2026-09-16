import RavaAgencyHome from './components/RavaAgencyHome'
import { createClient } from '@/lib/supabase/server'
import { publicProjectFallbacks, publicServiceFallbacks } from '@/lib/public-fallbacks'

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
    })) : publicProjectFallbacks

    const settingMap = Object.fromEntries((settingsResult.data ?? []).map(row=>[row.key,asObject(row.value) ?? {}]))
    const general = settingMap.general ?? {}
    const enamad = settingMap.enamad ?? {}
    const settings = {
      email:String(general.email ?? ''),
      phone:String(general.phone ?? ''),
      address:String(general.address ?? 'Shiraz, Iran'),
      instagram:String(general.instagram ?? ''),
      linkedin:String(general.linkedin ?? ''),
      telegram:String(general.telegram ?? ''),
      footer_text:String(general.footer_note ?? ''),
      enamad_enabled:Boolean(enamad.enabled),
      enamad_url:String(enamad.validation_url ?? ''),
      enamad_image:String(enamad.logo_url ?? ''),
    }

    const dbHome = asObject(homeRow.data?.content)
    const home = dbHome ? { ...fallbackHome, ...dbHome } : fallbackHome
    const services = servicesResult.data?.length ? servicesResult.data : publicServiceFallbacks

    return <RavaAgencyHome home={home as typeof fallbackHome} services={services} projects={projects} settings={settings}/>
  } catch {
    return <RavaAgencyHome home={fallbackHome} services={publicServiceFallbacks} projects={publicProjectFallbacks} settings={{address:'Shiraz, Iran'}}/>
  }
}
