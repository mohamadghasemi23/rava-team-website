import { requireRavaAdmin } from '@/lib/auth/require-staff'
import { saveSiteSettings } from './actions'

export const dynamic = 'force-dynamic'

export default async function SettingsAdminPage() {
  const { supabase } = await requireRavaAdmin()
  const { data } = await supabase.from('site_settings').select('key,value').in('key', ['general','enamad'])
  const rows = Object.fromEntries((data ?? []).map((row) => [row.key, row.value])) as Record<string, Record<string, unknown>>
  const general = rows.general ?? {}
  const enamad = rows.enamad ?? {}

  return <main className="admin-shell">
    <header className="admin-head"><div><span>RAVA CONTROL CENTER</span><h1>تنظیمات سایت</h1></div></header>
    <form action={saveSiteSettings} className="admin-form">
      <section className="admin-panel"><h2>اطلاعات عمومی</h2>
        <label>ایمیل<input name="email" type="email" defaultValue={String(general.email ?? '')}/></label>
        <label>تلفن<input name="phone" defaultValue={String(general.phone ?? '')}/></label>
        <label>آدرس<textarea name="address" rows={3} defaultValue={String(general.address ?? '')}/></label>
        <label>Instagram URL<input name="instagram" dir="ltr" defaultValue={String(general.instagram ?? '')}/></label>
        <label>Telegram URL<input name="telegram" dir="ltr" defaultValue={String(general.telegram ?? '')}/></label>
        <label>LinkedIn URL<input name="linkedin" dir="ltr" defaultValue={String(general.linkedin ?? '')}/></label>
        <label>متن کوتاه Footer<textarea name="footer_note" rows={3} defaultValue={String(general.footer_note ?? '')}/></label>
      </section>

      <section className="admin-panel"><h2>مجوزها و اعتماد — Enamad</h2>
        <p>برای امنیت، HTML یا Script خام در پنل ذخیره نمی‌کنیم. فقط لینک رسمی اعتبارسنجی و آدرس تصویر نشان ثبت می‌شود.</p>
        <label><input name="enamad_enabled" type="checkbox" defaultChecked={Boolean(enamad.enabled)}/> نمایش Enamad در Footer</label>
        <label>عنوان<input name="enamad_title" defaultValue={String(enamad.title ?? 'نماد اعتماد الکترونیکی')}/></label>
        <label>لینک رسمی اعتبارسنجی<input name="enamad_validation_url" dir="ltr" defaultValue={String(enamad.validation_url ?? '')}/></label>
        <label>آدرس تصویر رسمی نشان<input name="enamad_logo_url" dir="ltr" defaultValue={String(enamad.logo_url ?? '')}/></label>
      </section>

      <button className="admin-primary-button" type="submit">ذخیره تنظیمات</button>
    </form>
  </main>
}
