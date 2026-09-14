import { requireRavaStaff } from '@/lib/auth/require-staff'
import { saveAboutContent } from './actions'

export const dynamic = 'force-dynamic'

const defaults = {
  eyebrow: 'درباره راوا',
  title: 'یک تیم مستقل برای ساختن بهتر.',
  intro: 'راوا یک تیم مستقل دیجیتال است که روی طراحی و توسعه وب، محصولات دیجیتال، محتوا و راهکارهای مبتنی بر هوش مصنوعی کار می‌کند.',
  body: 'ما پروژه را از تکنولوژی شروع نمی‌کنیم؛ از مسئله شروع می‌کنیم. بعد مناسب‌ترین طراحی، ساختار و ابزار را برای حل آن انتخاب می‌کنیم. هدف ما ساختن چیزی نیست که فقط در زمان تحویل خوب به نظر برسد؛ چیزی می‌سازیم که قابل استفاده، قابل توسعه و ارزشمند باشد.',
  stats: [{ value: '', label: '' }, { value: '', label: '' }, { value: '', label: '' }],
  values: [
    { title: 'وضوح', body: 'قبل از ساختن، باید دقیق بدانیم چه مسئله‌ای را حل می‌کنیم.' },
    { title: 'کیفیت', body: 'جزئیات بخشی از محصول‌اند، نه مرحله آخر پروژه.' },
    { title: 'سادگی', body: 'پیچیدگی فنی نباید به تجربه پیچیده برای کاربر تبدیل شود.' },
    { title: 'رشد', body: 'هر چیزی که می‌سازیم باید بتواند همراه کسب‌وکار بزرگ‌تر شود.' },
  ],
  cta: { title: 'پروژه‌ای دارید؟ شروع کنیم.', body: 'برای شروع یک پروژه جدید با ما در ارتباط باشید.', button: 'شروع پروژه' },
}

export default async function AboutAdminPage() {
  const { supabase } = await requireRavaStaff()
  const { data } = await supabase.from('site_content').select('content').eq('section_key', 'about').maybeSingle()
  const about = data?.content && typeof data.content === 'object' ? { ...defaults, ...data.content } as typeof defaults : defaults
  const stats = Array.isArray(about.stats) ? about.stats : defaults.stats
  const values = Array.isArray(about.values) ? about.values : defaults.values

  return <main className="admin-shell">
    <header className="admin-head"><div><span>RAVA CONTROL CENTER</span><h1>درباره راوا</h1></div></header>
    <form action={saveAboutContent} className="admin-form">
      <section className="admin-panel"><h2>معرفی</h2>
        <label>Eyebrow<input name="eyebrow" defaultValue={about.eyebrow}/></label>
        <label>عنوان<input name="title" defaultValue={about.title}/></label>
        <label>مقدمه<textarea name="intro" rows={5} defaultValue={about.intro}/></label>
        <label>متن کامل<textarea name="body" rows={9} defaultValue={about.body}/></label>
      </section>
      <section className="admin-panel"><h2>آمار سه‌تایی</h2>
        {[0,1,2].map((index)=><div className="admin-form" key={index}><label>عدد {index+1}<input name={`stat_${index+1}_value`} defaultValue={stats[index]?.value ?? ''}/></label><label>عنوان {index+1}<input name={`stat_${index+1}_label`} defaultValue={stats[index]?.label ?? ''}/></label></div>)}
      </section>
      <section className="admin-panel"><h2>ارزش‌ها</h2>
        {[0,1,2,3].map((index)=><div className="admin-form" key={index}><label>عنوان ارزش {index+1}<input name={`value_${index+1}_title`} defaultValue={values[index]?.title ?? defaults.values[index].title}/></label><label>توضیح<textarea name={`value_${index+1}_body`} rows={3} defaultValue={values[index]?.body ?? defaults.values[index].body}/></label></div>)}
      </section>
      <section className="admin-panel"><h2>CTA</h2><label>عنوان<input name="cta_title" defaultValue={about.cta?.title ?? defaults.cta.title}/></label><label>متن<textarea name="cta_body" rows={3} defaultValue={about.cta?.body ?? defaults.cta.body}/></label><label>دکمه<input name="cta_button" defaultValue={about.cta?.button ?? defaults.cta.button}/></label></section>
      <button className="admin-primary-button" type="submit">ذخیره درباره راوا</button>
    </form>
  </main>
}
