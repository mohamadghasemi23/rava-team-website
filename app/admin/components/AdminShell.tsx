'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type NavItem = {
  label: string
  href?: string
  icon: string
  keywords: string[]
  disabled?: boolean
}

const navigation: NavItem[] = [
  { label: 'داشبورد', href: '/admin', icon: '⌂', keywords: ['dashboard', 'home', 'داشبورد', 'آمار'] },
  { label: 'صفحه اصلی', href: '/admin/home', icon: '◫', keywords: ['home', 'homepage', 'صفحه اصلی', 'هیرو'] },
  { label: 'پروژه‌ها', href: '/admin/projects', icon: '▦', keywords: ['projects', 'work', 'پروژه', 'نمونه کار'] },
  { label: 'خدمات', href: '/admin/services', icon: '◇', keywords: ['services', 'service', 'خدمات'] },
  { label: 'درباره راوا', icon: '○', keywords: ['about', 'درباره', 'راوا'], disabled: true },
  { label: 'پیام‌ها', href: '/admin/messages', icon: '✉', keywords: ['messages', 'leads', 'contact', 'پیام', 'درخواست'] },
  { label: 'رسانه‌ها', href: '/admin/media', icon: '▧', keywords: ['media', 'image', 'upload', 'رسانه', 'تصویر', 'آپلود'] },
  { label: 'سئو', icon: '⌕', keywords: ['seo', 'search', 'سئو'], disabled: true },
  { label: 'تنظیمات', icon: '⚙', keywords: ['settings', 'enamad', 'footer', 'تنظیمات', 'اینماد'], disabled: true },
]

function itemMatches(item: NavItem, query: string): boolean {
  if (!query) return true
  const haystack = [item.label, ...item.keywords].join(' ').toLowerCase()
  return haystack.includes(query.toLowerCase())
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => setMobileOpen(false), [pathname])

  const filteredNavigation = useMemo(
    () => navigation.filter((item) => itemMatches(item, query.trim())),
    [query],
  )

  return <div className="rava-admin-frame" dir="rtl">
    <button className="rava-admin-mobile-trigger" type="button" onClick={() => setMobileOpen(true)} aria-label="منو">☰</button>
    {mobileOpen && <button className="rava-admin-scrim" type="button" aria-label="بستن" onClick={() => setMobileOpen(false)} />}

    <aside className={`rava-admin-sidebar${mobileOpen ? ' is-open' : ''}`} aria-label="منوی مدیریت">
      <div className="rava-admin-brand-row">
        <Link className="rava-admin-brand" href="/admin"><b>RAVA</b> TEAM<small>مدیریت سایت راوا</small></Link>
        <button className="rava-admin-close" type="button" onClick={() => setMobileOpen(false)} aria-label="بستن">×</button>
      </div>

      <label className="rava-admin-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجو در پنل…" /></label>

      <nav className="rava-admin-tree">
        {filteredNavigation.length === 0 && <p className="rava-admin-no-result">نتیجه‌ای پیدا نشد.</p>}
        {filteredNavigation.map((item) => {
          if (item.href) {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return <Link key={item.label} href={item.href} className={`rava-admin-nav-item${active ? ' is-active' : ''}`}><i>{item.icon}</i><span>{item.label}</span></Link>
          }
          return <div key={item.label} className="rava-admin-nav-item is-disabled" title="در فاز بعدی V1 فعال می‌شود"><i>{item.icon}</i><span>{item.label}</span><small>بعدی</small></div>
        })}
      </nav>

      <div className="rava-admin-sidebar-footer"><span>RAVA Website V1</span></div>
    </aside>

    <div className="rava-admin-content">{children}</div>
  </div>
}
