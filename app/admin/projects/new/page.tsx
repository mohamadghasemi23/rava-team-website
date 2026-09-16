import Link from 'next/link'
import { createProject } from '../actions'

export default function NewProjectPage() {
  return <main className="admin-shell">
    <header className="admin-head"><div><span>RAVA CONTROL CENTER</span><h1>پروژه جدید</h1></div><Link className="admin-link" href="/admin/projects">بازگشت</Link></header>
    <form action={createProject} className="admin-panel admin-form">
      <label>عنوان<input name="title" required maxLength={160}/></label>
      <label>Slug<input name="slug" dir="ltr" placeholder="rava-traffic-engine" maxLength={140}/></label>
      <label>نوع پروژه<select name="project_kind" defaultValue="real"><option value="real">پروژه واقعی</option><option value="concept">Concept Project</option></select></label>
      <label>خلاصه<textarea name="summary" rows={3} maxLength={600}/></label>
      <label>متن اصلی<textarea name="body" rows={8} maxLength={20000}/></label>
      <label>نام Client<input name="client_name" maxLength={160}/></label>
      <label>سال<input name="project_year" type="number" min="2000" max="2100"/></label>
      <label>Role<input name="role_text" maxLength={300}/></label>
      <label>Scope — هر مورد یک خط<textarea name="scope" rows={4}/></label>
      <label>KPI — هر مورد یک خط<textarea name="kpis" rows={4}/></label>
      <label>ترتیب نمایش<input name="sort_order" type="number" defaultValue="0"/></label>
      <label>SEO Title<input name="seo_title" maxLength={180}/></label>
      <label>SEO Description<textarea name="seo_description" rows={3} maxLength={320}/></label>
      <label>Canonical URL<input name="canonical_url" dir="ltr" maxLength={500}/></label>
      <label><input name="featured" type="checkbox"/> Featured</label>
      <label><input name="show_on_home" type="checkbox"/> نمایش در Home</label>
      <label><input name="published" type="checkbox"/> انتشار</label>
      <button className="admin-primary-button" type="submit">ساخت پروژه</button>
    </form>
  </main>
}
