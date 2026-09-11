'use client'

import Link from 'next/link'
import {useState} from 'react'
import styles from './admin-editor-v2.module.css'

export type PreviewAudience = 'owner' | 'customer'

function Glyph({name}: {name: 'help' | 'bell' | 'chevron' | 'close' | 'grid'}) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    {name === 'help' ? <><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.35 2.35 0 1 1 3.42 2.1c-.75.4-1.22.9-1.22 1.9M12 17h.01"/></> : null}
    {name === 'bell' ? <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></> : null}
    {name === 'chevron' ? <path d="m9 18 6-6-6-6"/> : null}
    {name === 'close' ? <path d="m6 6 12 12M18 6 6 18"/> : null}
    {name === 'grid' ? <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></> : null}
  </svg>
}

export default function PreviewAdminHeader({pageTitle, audience = 'owner', onHelp, onNotificationAction}: {pageTitle: string; audience?: PreviewAudience; onHelp?: () => void; onNotificationAction?: () => void}) {
  const [profile, setProfile] = useState(false)
  const [notifications, setNotifications] = useState(false)
  const [navigation, setNavigation] = useState(false)
  const isOwner = audience === 'owner'
  const profileName = isOwner ? 'محمد قاسمی' : 'مدیر سایت آوید'
  const profileRole = isOwner ? 'مالک پلتفرم' : 'مدیر محتوای سایت'

  return <>
    <header className={styles.header}>
      <div className={styles.identity}>
        <button className={styles.mark} type="button" onClick={() => setNavigation(v => !v)} aria-label="باز کردن منوی اصلی مدیریت" aria-expanded={navigation}><i/><i/><i/></button>
        <div><b>راوا</b><small><Link href="/design-preview/admin-page-editor">صفحه‌ها</Link><i>/</i>{pageTitle}</small></div>
      </div>
      <div className={styles.headerActions}>
        <button className={styles.iconButton} aria-label="راهنما" onClick={onHelp}><Glyph name="help"/></button>
        <div className={styles.notificationWrap}>
          <button className={styles.iconButton} aria-label="اعلان‌ها" onClick={() => setNotifications(v => !v)} aria-expanded={notifications}><Glyph name="bell"/><strong className={styles.notificationCount}>۱</strong></button>
          {notifications ? <div className={styles.notificationMenu}>
            <div className={styles.popoverTitle}><b>اعلان‌ها</b><button aria-label="بستن" onClick={() => setNotifications(false)}><Glyph name="close"/></button></div>
            <div className={styles.notificationTodo}><i>!</i><span><b>تکمیل اطلاعات جست‌وجو</b><small>تصویر اشتراک‌گذاری و توضیح گوگل را کامل و ذخیره کنید.</small></span></div>
            {onNotificationAction ? <button className={styles.resolveButton} onClick={() => {onNotificationAction(); setNotifications(false)}}>رفتن به محل مشکل</button> : <Link className={styles.resolveLink} href="/design-preview/admin-page-editor">رفتن به ویرایش صفحه</Link>}
          </div> : null}
        </div>
        <div className={styles.profileWrap}>
          <button className={styles.profile} onClick={() => setProfile(v => !v)} aria-expanded={profile}>
            <span className={styles.avatar}><span>{isOwner ? 'م‌ق' : 'آ'}</span><i aria-label="آنلاین"/></span><span><b>{profileName}</b><small>{profileRole}</small></span><em>⌄</em>
          </button>
          {profile ? <div className={styles.profileMenu}>
            <div className={styles.profileSummary}><span className={styles.avatarLarge}><span>{isOwner ? 'م‌ق' : 'آ'}</span><i/></span><div><strong>{profileName}</strong><span>{profileRole} · آنلاین</span></div></div>
            <small className={styles.email}>{isOwner ? 'mohammad@ravateam.ir' : 'manager@avid.example'}</small>
            <div className={styles.profileContext}><span><small>سایت فعال</small><b>{isOwner ? 'راوا تیم' : 'کلینیک آوید'}</b></span><span><small>فضای کاری</small><b>لانچ‌پد</b></span></div>
            <button>حساب کاربری</button><button>تنظیمات شخصی</button><button className={styles.logout}>خروج امن</button>
          </div> : null}
        </div>
      </div>
    </header>
    {navigation ? <><button className={styles.navigationScrim} aria-label="بستن منوی مدیریت" onClick={() => setNavigation(false)}/><nav className={styles.workspaceMenu} aria-label="بخش‌های مدیریت">
      <div className={styles.workspaceMenuHead}><div><b>{isOwner ? 'مرکز مدیریت راوا' : 'مدیریت سایت کلینیک آوید'}</b><small>{isOwner ? 'سایت‌ها، قالب‌ها و عملیات مالک' : 'امکانات فعال فضای کاری لانچ‌پد'}</small></div><button aria-label="بستن" onClick={() => setNavigation(false)}><Glyph name="close"/></button></div>
      <div className={styles.workspaceMenuGrid}>
        <Link href="/admin"><Glyph name="grid"/><span><b>{isOwner ? 'نمای کلی پلتفرم' : 'نمای کلی سایت'}</b><small>{isOwner ? 'وضعیت سایت‌ها و کارهای امروز' : 'وضعیت انتشار و کارهای سایت'}</small></span></Link>
        <Link href="/admin/pages"><Glyph name="grid"/><span><b>صفحه‌ها و محتوا</b><small>ویرایش صفحه و پیش‌نمایش واقعی</small></span></Link>
        <Link href="/admin/media"><Glyph name="grid"/><span><b>کتابخانه رسانه</b><small>تصویرها، ویدئوها و فایل‌ها</small></span></Link>
        {isOwner ? <Link href="/admin/platform/sites"><Glyph name="grid"/><span><b>سایت‌ها و قالب‌ها</b><small>انتخاب سایت و تخصیص لانچ‌پد</small></span></Link> : <Link href="/admin/pages"><Glyph name="grid"/><span><b>سئو و اشتراک‌گذاری</b><small>نمایش در گوگل و شبکه‌های اجتماعی</small></span></Link>}
        <Link href="/admin/help"><Glyph name="grid"/><span><b>راهنما و آموزش</b><small>راهنمای مرحله‌ای هر عملیات</small></span></Link>
        {isOwner ? <Link href="/admin/system/access"><Glyph name="grid"/><span><b>کاربران و دسترسی</b><small>نقش‌ها و محدوده دسترسی</small></span></Link> : <Link href="/admin"><Glyph name="grid"/><span><b>همکاران سایت</b><small>دسترسی افزوده در اشتراک فعلی</small></span></Link>}
      </div>
      <div className={styles.workspaceMenuFoot}><span><i/> سایت فعال: <b>{isOwner ? 'راوا تیم' : 'کلینیک آوید'}</b></span><Link href="/admin">{isOwner ? 'تنظیمات و عملیات مالک' : 'جزئیات اشتراک لانچ‌پد'}</Link></div>
    </nav></> : null}
    <div className={styles.contextRail}>
      <div><span className={styles.liveDot}/><small>سایت فعال</small><b>{isOwner ? 'راوا تیم' : 'کلینیک آوید'}</b></div>
      <span className={styles.railDivider}/>
      <div><small>فضای کاری فعال</small><b>لانچ‌پد — خدماتی</b></div>
      <span className={styles.entitlementBadge}>{isOwner ? 'دسترسی مالک' : 'خریداری‌شده'}</span>
      <Link href="/design-preview/admin-page-editor/template-guide">معرفی و راهنمای قالب <Glyph name="chevron"/></Link>
    </div>
  </>
}
