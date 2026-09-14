import { requireRavaAdmin } from '@/lib/auth/require-staff'
import { saveSeoSettings } from './actions'

export const dynamic = 'force-dynamic'

const fallback = {
  title: 'RAVA TEAM — طراحی و توسعه وب و محصولات دیجیتال',
  description: 'راوا یک تیم مستقل برای طراحی و توسعه وب، فروشگاه اینترنتی، محصولات دیجیتال، برندینگ، محتوا و راهکارهای هوش مصنوعی است.',
  og_image_url: '',
  twitter_handle: '',
  search_console_verification: '',
}

export default async function SeoAdminPage() {
  const { supabase } = await requireRavaAdmin()
  const { data } = await supabase.from('site_settings').select('value').eq('key', 'seo').maybeSingle()
  const seo = data?.value && typeof data.value === 'object' ? { ...fallback, ...data.value } as typeof fallback : fallback

  return <main className="admin-shell">
    <header className="admin-head"><div><span>RAVA CONTROL CENTER</span><h1>سئو</h1></div></header>
    <form action={saveSeoSettings} className="admin-panel admin-form">
      <label>عنوان پیش‌فرض سایت<input name="title" defaultValue={seo.title} maxLength={120}/></label>
      <label>Meta Description<textarea name="description" rows={4} defaultValue={seo.description} maxLength={300}/></label>
      <label>Open Graph Image URL<input name="og_image_url" dir="ltr" defaultValue={seo.og_image_url}/></label>
      <label>Twitter / X Handle<input name="twitter_handle" dir="ltr" defaultValue={seo.twitter_handle}/></label>
      <label>Google Search Console Verification<input name="search_console_verification" dir="ltr" defaultValue={seo.search_console_verification}/></label>
      <p>SEO اختصاصی هر پروژه و هر سرویس همچنان داخل فرم همان مورد مدیریت می‌شود. این صفحه فقط SEO سراسری سایت را کنترل می‌کند.</p>
      <button className="admin-primary-button" type="submit">ذخیره تنظیمات سئو</button>
    </form>
  </main>
}
