import Link from 'next/link'
import { createService } from '../actions'

export default function NewServicePage() {
  return <main className="admin-shell">
    <header className="admin-head"><div><span>RAVA CONTROL CENTER</span><h1>سرویس جدید</h1></div><Link className="admin-link" href="/admin/services">بازگشت</Link></header>
    <form action={createService} className="admin-panel admin-form">
      <label>عنوان<input name="title" required maxLength={160}/></label>
      <label>Slug<input name="slug" dir="ltr" placeholder="web-design" maxLength={140}/></label>
      <label>خلاصه<textarea name="summary" rows={3} maxLength={600}/></label>
      <label>متن کامل<textarea name="body" rows={8} maxLength={20000}/></label>
      <label>Icon Key<input name="icon_key" maxLength={80}/></label>
      <label>ترتیب نمایش<input name="sort_order" type="number" defaultValue="0"/></label>
      <label>SEO Title<input name="seo_title" maxLength={180}/></label>
      <label>SEO Description<textarea name="seo_description" rows={3} maxLength={320}/></label>
      <label>Canonical URL<input name="canonical_url" dir="ltr" maxLength={500}/></label>
      <label><input name="published" type="checkbox"/> انتشار</label>
      <button className="admin-primary-button" type="submit">ساخت سرویس</button>
    </form>
  </main>
}
