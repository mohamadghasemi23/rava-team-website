import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { deletePage, updatePage } from '../actions'

export const dynamic = 'force-dynamic'

export default async function PageEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,active')
    .eq('id', userId)
    .single()
  if (!profile?.active) redirect('/login')

  const { data: page } = await supabase
    .from('pages')
    .select('id,title,slug,status,seo,created_at,updated_at,published_at')
    .eq('id', id)
    .single()

  if (!page) notFound()
  const seo = (page.seo ?? {}) as { title?: string; description?: string }

  return (
    <main className="admin-shell">
      <header className="admin-head">
        <div><span>RAVA CONTROL CENTER</span><h1>ویرایش صفحه</h1></div>
        <div className="admin-actions"><Link className="admin-link" href="/admin/pages">بازگشت به صفحات</Link></div>
      </header>

      <section className="admin-panel">
        <form action={updatePage} className="admin-form">
          <input type="hidden" name="id" value={page.id} />
          <div className="admin-grid-2">
            <label>عنوان صفحه<input name="title" defaultValue={page.title} required /></label>
            <label>آدرس صفحه<input name="slug" defaultValue={page.slug} required dir="ltr" /></label>
          </div>
          <label>وضعیت
            <select name="status" defaultValue={page.status}>
              <option value="draft">پیش‌نویس</option>
              <option value="published">منتشرشده</option>
              <option value="hidden">مخفی</option>
              <option value="scheduled">زمان‌بندی‌شده</option>
            </select>
          </label>
          <div className="admin-grid-2">
            <label>عنوان SEO<input name="seo_title" defaultValue={seo.title ?? ''} placeholder="عنوان نمایش در گوگل" /></label>
            <label>توضیح SEO<textarea name="seo_description" defaultValue={seo.description ?? ''} rows={4} placeholder="توضیح کوتاه برای نتایج جستجو" /></label>
          </div>
          <div className="admin-save-row">
            <button type="submit">ذخیره تغییرات</button>
            {page.status === 'published' ? <a className="admin-link" href={`/${page.slug}`} target="_blank">مشاهده صفحه</a> : null}
          </div>
        </form>
      </section>

      <section className="admin-panel">
        <h2>محتوای صفحه</h2>
        <p>ساختار Page آماده است. در قدم بعدی Block Builder را همین‌جا اضافه می‌کنیم تا متن، تصویر، Hero، CTA، گالری و سکشن‌های دلخواه را بدون کدنویسی بسازی و مرتب کنی.</p>
      </section>

      <section className="admin-panel admin-danger-zone">
        <h2>حذف صفحه</h2>
        <p>این عملیات صفحه و Blockهای وابسته به آن را حذف می‌کند.</p>
        <form action={deletePage}>
          <input type="hidden" name="id" value={page.id} />
          <button className="admin-danger-button" type="submit">حذف کامل صفحه</button>
        </form>
      </section>
    </main>
  )
}
