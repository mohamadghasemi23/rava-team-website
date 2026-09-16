import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRavaStaff } from '@/lib/auth/require-staff'
import { updateService } from '../actions'

export const dynamic = 'force-dynamic'

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await requireRavaStaff()
  const { data: service } = await supabase.from('services').select('*').eq('id', id).single()
  if (!service) notFound()
  const content = service.content && typeof service.content === 'object' ? service.content as { body?: string } : {}
  const action = updateService.bind(null, id)

  return <main className="admin-shell">
    <header className="admin-head"><div><span>RAVA CONTROL CENTER</span><h1>ویرایش سرویس</h1></div><Link className="admin-link" href="/admin/services">بازگشت</Link></header>
    <form action={action} className="admin-panel admin-form">
      <label>عنوان<input name="title" required defaultValue={service.title} maxLength={160}/></label>
      <label>Slug<input name="slug" dir="ltr" defaultValue={service.slug} maxLength={140}/></label>
      <label>خلاصه<textarea name="summary" rows={3} defaultValue={service.summary ?? ''} maxLength={600}/></label>
      <label>متن کامل<textarea name="body" rows={8} defaultValue={content.body ?? ''} maxLength={20000}/></label>
      <label>Icon Key<input name="icon_key" defaultValue={service.icon_key ?? ''} maxLength={80}/></label>
      <label>ترتیب نمایش<input name="sort_order" type="number" defaultValue={service.sort_order ?? 0}/></label>
      <label>SEO Title<input name="seo_title" defaultValue={service.seo_title ?? ''} maxLength={180}/></label>
      <label>SEO Description<textarea name="seo_description" rows={3} defaultValue={service.seo_description ?? ''} maxLength={320}/></label>
      <label>Canonical URL<input name="canonical_url" dir="ltr" defaultValue={service.canonical_url ?? ''} maxLength={500}/></label>
      <label><input name="published" type="checkbox" defaultChecked={service.published}/> انتشار</label>
      <button className="admin-primary-button" type="submit">ذخیره تغییرات</button>
    </form>
  </main>
}
