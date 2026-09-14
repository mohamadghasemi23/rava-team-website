import { requireRavaStaff } from '@/lib/auth/require-staff'

export const dynamic = 'force-dynamic'

export default async function ServicesAdminPage() {
  const { supabase } = await requireRavaStaff()
  const { data: services } = await supabase
    .from('services')
    .select('id,title,slug,summary,published,sort_order,updated_at')
    .order('sort_order', { ascending: true })

  return <main className="admin-shell">
    <header className="admin-head"><div><span>RAVA CONTROL CENTER</span><h1>خدمات</h1></div></header>
    <section className="admin-panel">
      <div className="admin-section-title"><h2>خدمات اصلی RAVA</h2><span>{services?.length ?? 0} مورد</span></div>
      {!services?.length ? <div className="admin-empty">هنوز سرویسی در V1 ثبت نشده است.</div> : (
        <div className="admin-form">
          {services.map((service) => <article className="admin-panel" key={service.id}>
            <div className="admin-section-title"><div><b>{service.title}</b><small> /{service.slug}</small></div><span>{service.published ? 'منتشرشده' : 'پیش‌نویس'}</span></div>
            <p>{service.summary || 'بدون خلاصه'}</p>
          </article>)}
        </div>
      )}
    </section>
    <section className="admin-panel"><h2>مرحله بعد</h2><p>ویرایش محتوا، ترتیب نمایش و SEO هر سرویس در فرم اختصاصی همین بخش اضافه می‌شود.</p></section>
  </main>
}
