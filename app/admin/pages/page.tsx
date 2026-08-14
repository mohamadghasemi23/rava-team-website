import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ActionForm from '../components/ActionForm'
import { createPage, deletePage, setPageStatus } from './actions'

export const dynamic = 'force-dynamic'

export default async function PagesAdminPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role, active')
    .eq('id', userId)
    .single()

  if (!profile?.active) redirect('/login')

  const { data } = await supabase
    .from('pages')
    .select('id,title,slug,status,updated_at')
    .order('updated_at', { ascending: false })

  const pages = data ?? []

  return (
    <main className="admin-shell">
      <header className="admin-head">
        <div><span>RAVA CONTROL CENTER</span><h1>مدیریت صفحات</h1></div>
        <div className="admin-actions"><Link className="admin-link" href="/admin">داشبورد</Link></div>
      </header>

      <section className="admin-panel">
        <h2>ساخت صفحه جدید</h2>
        <ActionForm
          action={createPage}
          className="admin-form admin-form-inline"
          confirmTitle="ساخت صفحه جدید"
          confirmMessage="اطلاعات واردشده ثبت شود و صفحه جدید ساخته شود؟"
          confirmLabel="بله، صفحه ساخته شود"
        >
          <label>عنوان<input name="title" required placeholder="مثلاً خدمات طراحی سایت" /></label>
          <label>آدرس صفحه<input name="slug" required dir="ltr" placeholder="web-design" /></label>
          <button type="submit">ساخت صفحه</button>
        </ActionForm>
      </section>

      <section className="admin-panel">
        <div className="admin-section-title"><h2>همه صفحات</h2><span>{pages.length} صفحه</span></div>
        {pages.length === 0 ? (
          <div className="admin-empty">هنوز صفحه‌ای ساخته نشده. اولین صفحه را از فرم بالا بساز.</div>
        ) : (
          <div className="admin-list">
            {pages.map((page) => {
              const isPublished = page.status === 'published'
              return (
                <article className="admin-list-item" key={page.id}>
                  <div className="admin-list-main">
                    <div><b>{page.title}</b><small dir="ltr">/{page.slug}</small></div>
                    <span className={`status-pill status-${page.status}`}>{page.status}</span>
                  </div>
                  <div className="admin-row-actions">
                    <Link className="admin-link" href={`/admin/pages/${page.id}`}>ویرایش</Link>
                    <ActionForm
                      action={setPageStatus}
                      confirmTitle={isPublished ? 'مخفی کردن صفحه' : 'انتشار صفحه'}
                      confirmMessage={isPublished ? `صفحه «${page.title}» از دید کاربران مخفی شود؟` : `صفحه «${page.title}» روی سایت منتشر شود؟`}
                      confirmLabel={isPublished ? 'بله، مخفی شود' : 'بله، منتشر شود'}
                    >
                      <input type="hidden" name="id" value={page.id} />
                      <input type="hidden" name="status" value={isPublished ? 'hidden' : 'published'} />
                      <button className="admin-muted-button" type="submit">{isPublished ? 'مخفی کن' : 'منتشر کن'}</button>
                    </ActionForm>
                    <ActionForm
                      action={deletePage}
                      danger
                      confirmTitle="حذف کامل صفحه"
                      confirmMessage={`صفحه «${page.title}» و تمام محتوای وابسته به آن حذف شود؟ این عملیات قابل بازگشت نیست.`}
                      confirmLabel="بله، برای همیشه حذف شود"
                    >
                      <input type="hidden" name="id" value={page.id} />
                      <button className="admin-danger-button" type="submit">حذف</button>
                    </ActionForm>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
