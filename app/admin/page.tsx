import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (claimsError || !userId) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role, active')
    .eq('id', userId)
    .single()

  if (!profile?.active) redirect('/login')

  const [pages, projects, leads, media] = await Promise.all([
    supabase.from('pages').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('media_assets').select('*', { count: 'exact', head: true }),
  ])

  return (
    <main className="admin-shell">
      <header className="admin-head">
        <div><span>RAVA CONTROL CENTER</span><h1>داشبورد</h1></div>
        <div className="admin-user"><b>{profile.display_name}</b><small>{profile.role}</small></div>
      </header>

      <section className="admin-stats" aria-label="آمار پنل">
        <Link href="/admin/pages"><article><span>صفحات</span><b>{pages.count ?? 0}</b><small>مدیریت صفحات ←</small></article></Link>
        <article><span>پروژه‌ها</span><b>{projects.count ?? 0}</b><small>به‌زودی</small></article>
        <article><span>پیام‌ها</span><b>{leads.count ?? 0}</b><small>به‌زودی</small></article>
        <article><span>رسانه‌ها</span><b>{media.count ?? 0}</b><small>به‌زودی</small></article>
      </section>

      <section className="admin-panel">
        <h2>Production CMS فعال است</h2>
        <p>ماژول Pages حالا فعال شده. از کارت «صفحات» واردش شو و اولین صفحه واقعی را بساز. بعد از Pages، به‌ترتیب Media، Projects، Leads و Users را کامل می‌کنیم.</p>
        <Link className="admin-link" href="/admin/pages">ورود به مدیریت صفحات</Link>
      </section>

      <form action="/auth/signout" method="post"><button className="admin-signout" type="submit">خروج از پنل</button></form>
    </main>
  )
}
