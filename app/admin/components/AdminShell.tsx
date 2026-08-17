'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type AdminLanguage = 'fa' | 'en'

type NavItem = {
  label: { fa: string; en: string }
  href?: string
  icon: string
  keywords: string[]
  children?: NavItem[]
  disabled?: boolean
}

const navigation: NavItem[] = [
  { label: { fa: 'داشبورد', en: 'Dashboard' }, href: '/admin', icon: '⌂', keywords: ['dashboard', 'home', 'داشبورد'] },
  {
    label: { fa: 'کنترل مالک', en: 'Owner Control' }, icon: '◆', keywords: ['owner', 'platform', 'tenant', 'customer', 'مالک', 'مشتری', 'سایت'], children: [
      { label: { fa: 'مشتری‌ها و سایت‌ها', en: 'Customers & Sites' }, href: '/admin/platform/sites', icon: '◈', keywords: ['organizations', 'sites', 'tenants', 'customers', 'مشتری', 'سایت'] },
      { label: { fa: 'ساخت سایت جدید', en: 'Provision Site' }, href: '/admin/platform/sites/new', icon: '+', keywords: ['new', 'provision', 'create site', 'ساخت سایت', 'مشتری جدید'] },
    ],
  },
  {
    label: { fa: 'محتوا', en: 'Content' }, icon: '◫', keywords: ['content', 'cms', 'محتوا'], children: [
      { label: { fa: 'صفحات', en: 'Pages' }, href: '/admin/pages', icon: '▤', keywords: ['pages', 'page', 'صفحه', 'صفحات'] },
      { label: { fa: 'رسانه‌ها', en: 'Media Library' }, href: '/admin/media', icon: '▧', keywords: ['media', 'image', 'upload', 'رسانه', 'تصویر', 'آپلود'] },
    ],
  },
  {
    label: { fa: 'مدیریت سیستم', en: 'System Management' }, icon: '⚙', keywords: ['system', 'security', 'logs', 'errors', 'سیستم', 'امنیت', 'لاگ', 'خطا'], children: [
      { label: { fa: 'لاگ‌ها', en: 'Logs' }, icon: '≡', keywords: ['logs', 'audit', 'لاگ'], disabled: true },
      { label: { fa: 'خطاها', en: 'Errors' }, icon: '!', keywords: ['errors', 'exceptions', 'خطا'], disabled: true },
      { label: { fa: 'دسترسی‌ها', en: 'Access Control' }, icon: '♙', keywords: ['roles', 'permissions', 'access', 'دسترسی', 'نقش'], disabled: true },
    ],
  },
]

const copy = {
  fa: {
    controlCenter: 'مرکز کنترل RAVA',
    search: 'جست‌وجو در پنل…',
    noResult: 'نتیجه‌ای پیدا نشد.',
    menu: 'منو',
    close: 'بستن',
    language: 'EN',
    soon: 'به‌زودی',
    helpTitle: 'راهنمای این بخش',
    helpText: 'این دکمه راهنمای همان بخش را بدون خروج از صفحه نمایش می‌دهد. متن‌های آموزشی به‌صورت فارسی و انگلیسی قابل نمایش خواهند بود.',
  },
  en: {
    controlCenter: 'RAVA Control Center',
    search: 'Search admin…',
    noResult: 'No result found.',
    menu: 'Menu',
    close: 'Close',
    language: 'FA',
    soon: 'Soon',
    helpTitle: 'Section help',
    helpText: 'This control shows contextual help without leaving the current page. Training content can be displayed in Persian or English.',
  },
}

function itemMatches(item: NavItem, query: string): boolean {
  if (!query) return true
  const haystack = [item.label.fa, item.label.en, ...item.keywords].join(' ').toLowerCase()
  return haystack.includes(query.toLowerCase()) || Boolean(item.children?.some((child): boolean => itemMatches(child, query)))
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [language, setLanguage] = useState<AdminLanguage>('fa')
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem('rava-admin-language')
    if (saved === 'en' || saved === 'fa') setLanguage(saved)
  }, [])

  useEffect(() => setMobileOpen(false), [pathname])

  function toggleLanguage() {
    const next: AdminLanguage = language === 'fa' ? 'en' : 'fa'
    setLanguage(next)
    window.localStorage.setItem('rava-admin-language', next)
  }

  const filteredNavigation = useMemo(() => navigation.filter((item) => itemMatches(item, query.trim())), [query])
  const t = copy[language]
  const isRtl = language === 'fa'

  return <div className="rava-admin-frame" dir={isRtl ? 'rtl' : 'ltr'}>
    <button className="rava-admin-mobile-trigger" type="button" onClick={() => setMobileOpen(true)} aria-label={t.menu}>☰</button>
    {mobileOpen && <button className="rava-admin-scrim" type="button" aria-label={t.close} onClick={() => setMobileOpen(false)} />}

    <aside className={`rava-admin-sidebar${mobileOpen ? ' is-open' : ''}`} aria-label={t.menu}>
      <div className="rava-admin-brand-row">
        <Link className="rava-admin-brand" href="/admin"><b>RAVA</b> TEAM<small>{t.controlCenter}</small></Link>
        <button className="rava-admin-close" type="button" onClick={() => setMobileOpen(false)} aria-label={t.close}>×</button>
      </div>

      <label className="rava-admin-search">
        <span>⌕</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
      </label>

      <nav className="rava-admin-tree">
        {filteredNavigation.length === 0 && <p className="rava-admin-no-result">{t.noResult}</p>}
        {filteredNavigation.map((item) => {
          const visibleChildren = item.children?.filter((child) => itemMatches(child, query.trim()))
          if (item.href) {
            const active = pathname === item.href
            return <Link key={item.href} href={item.href} className={`rava-admin-nav-item${active ? ' is-active' : ''}`}><i>{item.icon}</i><span>{item.label[language]}</span></Link>
          }
          return <section className="rava-admin-nav-group" key={item.label.en}>
            <div className="rava-admin-nav-group-title"><i>{item.icon}</i><span>{item.label[language]}</span></div>
            <div className="rava-admin-nav-children">
              {visibleChildren?.map((child) => child.href
                ? <Link key={child.href} href={child.href} className={`rava-admin-nav-item${pathname.startsWith(child.href) ? ' is-active' : ''}`}><i>{child.icon}</i><span>{child.label[language]}</span></Link>
                : <div key={child.label.en} className="rava-admin-nav-item is-disabled" title={t.soon}><i>{child.icon}</i><span>{child.label[language]}</span><small>{t.soon}</small></div>)}
            </div>
          </section>
        })}
      </nav>

      <div className="rava-admin-sidebar-footer">
        <button type="button" onClick={() => setHelpOpen(true)}>؟ <span>{t.helpTitle}</span></button>
        <button type="button" onClick={toggleLanguage}>文 <span>{t.language}</span></button>
      </div>
    </aside>

    <div className="rava-admin-content">{children}</div>

    {helpOpen && <div className="admin-modal-backdrop" role="presentation" onMouseDown={() => setHelpOpen(false)}>
      <section className="admin-modal rava-admin-help-modal" role="dialog" aria-modal="true" aria-labelledby="admin-help-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="admin-modal-icon">؟</div>
        <h3 id="admin-help-title">{t.helpTitle}</h3>
        <p>{t.helpText}</p>
        <div className="admin-modal-actions"><button className="admin-primary-button" type="button" onClick={() => setHelpOpen(false)}>{t.close}</button></div>
      </section>
    </div>}
  </div>
}
