import Link from 'next/link'
import { requireRavaStaff } from '@/lib/auth/require-staff'
import AdminAnalyticsCharts from './components/AdminAnalyticsCharts'

export const dynamic = 'force-dynamic'

function sumViews(rows: { views: number }[] | null) {
  return (rows ?? []).reduce((total, row) => total + Number(row.views ?? 0), 0)
}

export default async function AdminPage() {
  const { supabase, user } = await requireRavaStaff()
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 6)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 29)
  const isoDay = (date: Date) => date.toISOString().slice(0, 10)

  const [projects, services, newLeads, media, todayViews, weekViews, monthRows] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('services').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('media_assets').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('page_views_daily').select('views').eq('day', isoDay(today)),
    supabase.from('page_views_daily').select('views').gte('day', isoDay(sevenDaysAgo)),
    supabase.from('page_views_daily').select('day,path,views').gte('day', isoDay(thirtyDaysAgo)).order('day', { ascending: true }),
  ])

  const rawMonth = monthRows.data ?? []
  const dailyMap = new Map<string, number>()
  const pathMap = new Map<string, number>()
  for (const row of rawMonth) {
    const views = Number(row.views ?? 0)
    dailyMap.set(row.day, (dailyMap.get(row.day) ?? 0) + views)
    pathMap.set(row.path, (pathMap.get(row.path) ?? 0) + views)
  }

  const daily = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(thirtyDaysAgo)
    date.setDate(thirtyDaysAgo.getDate() + index)
    const day = isoDay(date)
    return { day, views: dailyMap.get(day) ?? 0 }
  })

  const topPages = [...pathMap.entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 6)

  return <main className="admin-shell">
    <header className="admin-head">
      <div><span>RAVA CONTROL CENTER</span><h1>داشبورد</h1></div>
      <div className="admin-user"><b>{user.displayName}</b><small>{user.role === 'admin' ? 'مدیر' : 'ویرایشگر'}</small></div>
    </header>

    <section className="admin-stats" aria-label="آمار سایت">
      <article><span>بازدید امروز</span><b>{sumViews(todayViews.data)}</b><small>Analytics</small></article>
      <article><span>۷ روز اخیر</span><b>{sumViews(weekViews.data)}</b><small>بازدید</small></article>
      <article><span>۳۰ روز اخیر</span><b>{sumViews(rawMonth)}</b><small>بازدید</small></article>
      <Link href="/admin/messages"><article><span>پیام‌های جدید</span><b>{newLeads.count ?? 0}</b><small>مشاهده پیام‌ها ←</small></article></Link>
    </section>

    <AdminAnalyticsCharts daily={daily} topPages={topPages} />

    <section className="admin-stats" aria-label="محتوای سایت">
      <Link href="/admin/projects"><article><span>پروژه‌ها</span><b>{projects.count ?? 0}</b><small>مدیریت پروژه‌ها ←</small></article></Link>
      <Link href="/admin/services"><article><span>خدمات</span><b>{services.count ?? 0}</b><small>مدیریت خدمات ←</small></article></Link>
      <Link href="/admin/media"><article><span>رسانه‌ها</span><b>{media.count ?? 0}</b><small>کتابخانه رسانه ←</small></article></Link>
    </section>

    <section className="admin-panel">
      <h2>RAVA Website V1</h2>
      <p>CMS عمومی و Page Builder حذف شده‌اند. این پنل فقط محتوای سایت راوا، پروژه‌ها، خدمات، پیام‌ها، رسانه و آمار ضروری را مدیریت می‌کند.</p>
    </section>

    <form action="/auth/signout" method="post"><button className="admin-signout" type="submit">خروج از پنل</button></form>
  </main>
}
