import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GettingStarted from './components/GettingStarted'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || !userId) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('display_name, role, active').eq('id', userId).single()
  if (!profile?.active) redirect('/login')

  const [sites, pages, projects, leads, media] = await Promise.all([
    supabase.from('sites').select('*', { count: 'exact', head: true }),
    supabase.from('pages').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('media_assets').select('*', { count: 'exact', head: true }).is('deleted_at', null),
  ])

  return <main className="admin-shell">
    <GettingStarted siteCount={sites.count??0} pageCount={pages.count??0} mediaCount={media.count??0} displayName={profile.display_name??'مالک راوا'}/>
    <section className="admin-stats" aria-label="آمار پنل">
      <Link href="/admin/pages"><article><span>صفحات</span><b>{pages.count ?? 0}</b><small>مدیریت صفحات ←</small></article></Link>
      <article><span>پروژه‌ها</span><b>{projects.count ?? 0}</b><small>به‌زودی</small></article>
      <article><span>پیام‌ها</span><b>{leads.count ?? 0}</b><small>به‌زودی</small></article>
      <Link href="/admin/media"><article><span>رسانه‌ها</span><b>{media.count ?? 0}</b><small>مدیریت رسانه‌ها ←</small></article></Link>
    </section>
    <section className="admin-panel"><h2>فضای مدیریت محتوای شما آماده است</h2><p>صفحه‌ها هنوز پیش‌نویس‌اند و تا زمان بازبینی و تأیید شما به‌شکل عمومی منتشر نمی‌شوند.</p><div className="admin-actions"><Link className="admin-link" href="/admin/pages">بازبینی صفحه‌ها</Link><Link className="admin-link" href="/admin/media">مدیریت تصاویر و فایل‌ها</Link></div></section>
    <form action="/auth/signout" method="post"><button className="admin-signout" type="submit">خروج از پنل</button></form>
  </main>
}
