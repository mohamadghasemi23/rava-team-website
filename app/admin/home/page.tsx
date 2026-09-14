import { requireRavaStaff } from '@/lib/auth/require-staff'
import { saveHomeContent } from './actions'

export const dynamic = 'force-dynamic'

const defaults = {
  hero: { badge: 'آماده همکاری روی پروژه‌های جدید', title: 'تجربه‌های دیجیتال بهتر می‌سازیم.', description: 'راوا یک تیم مستقل برای طراحی و توسعه وب، محصولات دیجیتال و راهکارهای خلاقانه است؛ از ایده تا اجرا و رشد.', primary_cta: 'شروع پروژه', secondary_cta: 'دیدن نمونه‌کارها' },
  stats: [
    { value: '', label: '' },
    { value: '', label: '' },
    { value: '', label: '' },
  ],
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

export default async function HomeAdminPage() {
  const { supabase } = await requireRavaStaff()
  const { data } = await supabase.from('site_content').select('content').eq('section_key', 'home').maybeSingle()
  const home = data?.content && typeof data.content === 'object' ? { ...defaults, ...data.content } as typeof defaults : defaults
  const stats = Array.isArray(home.stats) ? home.stats : defaults.stats
  const values = Array.isArray(home.values) ? home.values : defaults.values

  return <main className="admin-shell">
    <header className="admin-head"><div><span>RAVA CONTROL CENTER</span><h1>صفحه اصلی</h1></div></header>
    <form action={saveHomeContent} className="admin-form">
      <section className="admin-panel"><h2>Hero</h2>
        <label>Badge<input name="hero_badge" defaultValue={home.hero?.badge ?? defaults.hero.badge}/></label>
        <label>عنوان اصلی<input name="hero_title" defaultValue={home.hero?.title ?? defaults.hero.title}/></label>
        <label>توضیح<textarea name="hero_description" rows={4} defaultValue={home.hero?.description ?? defaults.hero.description}/></label>
        <label>CTA اصلی<input name="hero_primary_cta" defaultValue={home.hero?.primary_cta ?? defaults.hero.primary_cta}/></label>
        <label>CTA دوم<input name="hero_secondary_cta" defaultValue={home.hero?.secondary_cta ?? defaults.hero.secondary_cta}/></label>
      </section>

      <section className="admin-panel"><h2>آمار سه‌تایی</h2>
        {[0,1,2].map((index) => <div key={index} className="admin-form">
          <label>عدد {index + 1}<input name={`stat_${index + 1}_value`} defaultValue={stats[index]?.value ?? ''}/></label>
          <label>عنوان {index + 1}<input name={`stat_${index + 1}_label`} defaultValue={stats[index]?.label ?? ''}/></label>
        </div>)}
      </section>

      <section className="admin-panel"><h2>Marquee و خدمات</h2>
        <label>متن Marquee<textarea name="marquee" rows={3} defaultValue={home.marquee ?? defaults.marquee}/></label>
        <label>مقدمه خدمات<textarea name="services_intro" rows={4} defaultValue={home.services_intro ?? defaults.services_intro}/></label>
      </section>

      <section className="admin-panel"><h2>About خلاصه</h2>
        <label>عنوان<input name="about_title" defaultValue={home.about?.title ?? defaults.about.title}/></label>
        <label>متن<textarea name="about_body" rows={6} defaultValue={home.about?.body ?? defaults.about.body}/></label>
      </section>

      <section className="admin-panel"><h2>Values</h2>
        {[0,1,2,3].map((index) => <div key={index} className="admin-form">
          <label>عنوان ارزش {index + 1}<input name={`value_${index + 1}_title`} defaultValue={values[index]?.title ?? defaults.values[index].title}/></label>
          <label>توضیح<textarea name={`value_${index + 1}_body`} rows={3} defaultValue={values[index]?.body ?? defaults.values[index].body}/></label>
        </div>)}
      </section>

      <section className="admin-panel"><h2>CTA پایانی</h2>
        <label>عنوان<input name="final_cta_title" defaultValue={home.final_cta?.title ?? defaults.final_cta.title}/></label>
        <label>متن<textarea name="final_cta_body" rows={4} defaultValue={home.final_cta?.body ?? defaults.final_cta.body}/></label>
        <label>متن دکمه<input name="final_cta_button" defaultValue={home.final_cta?.button ?? defaults.final_cta.button}/></label>
      </section>

      <button className="admin-primary-button" type="submit">ذخیره صفحه اصلی</button>
    </form>
  </main>
}
