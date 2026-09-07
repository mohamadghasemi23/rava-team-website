import '@fontsource-variable/noto-sans-arabic'
import Link from 'next/link'
import PreviewAdminHeader from '../PreviewAdminHeader'
import styles from '../admin-editor-v2.module.css'

export default function TemplateGuidePreview() {
  return <main className={styles.page} dir="rtl"><div className={styles.shell}>
    <PreviewAdminHeader pageTitle="راهنمای قالب"/>
    <div className={styles.guidePage}>
      <nav className={styles.guideSide} aria-label="بخش‌های راهنما">
        <span>راهنمای قالب</span>
        <a href="#overview" className={styles.guideActive}>معرفی کلی</a>
        <a href="#fit">مناسب چه کسب‌وکارهایی است؟</a>
        <a href="#features">امکانات و اجزای قالب</a>
        <a href="#editable">چه چیزهایی قابل مدیریت است؟</a>
        <a href="#limits">محدودیت‌های محافظ طراحی</a>
      </nav>
      <article className={styles.guide}>
        <Link className={styles.backLink} href="/design-preview/admin-page-editor">← بازگشت به ویرایش صفحه</Link>
        <header id="overview" className={styles.guideHero}>
          <span>قالب فعال سایت راوا تیم</span>
          <h1>لانچ‌پد راوا — خدماتی</h1>
          <p>قالبی مینیمال و محتواآماده برای معرفی روشن خدمات، نمایش مسیر همکاری و تبدیل بازدیدکننده به درخواست مشاوره.</p>
          <div><b>فارسی و انگلیسی</b><b>واکنش‌گرا</b><b>مناسب خدمات حرفه‌ای</b><b>آماده سئو</b></div>
        </header>
        <section id="fit" className={styles.guideSection}><div><small>۰۱</small><h2>برای چه کسب‌وکارهایی مناسب است؟</h2></div><ul><li>شرکت‌ها و تیم‌های خدمات حرفه‌ای</li><li>مشاوران، آژانس‌ها و استودیوها</li><li>مراکز آموزشی و درمانی خدمات‌محور</li><li>کسب‌وکارهایی با هدف دریافت درخواست همکاری</li></ul></section>
        <section id="features" className={styles.guideSection}><div><small>۰۲</small><h2>امکانات اصلی</h2></div><ul><li>معرفی خدمات و مزیت‌ها</li><li>نمایش قالب‌ها و حوزه‌های کاری</li><li>پرسش‌های پرتکرار</li><li>دعوت روشن به شروع پروژه</li><li>پیش‌نمایش پیش از انتشار</li></ul></section>
        <section id="editable" className={styles.guideSection}><div><small>۰۳</small><h2>چه چیزهایی قابل مدیریت است؟</h2></div><ul><li>عنوان‌ها، توضیحات و دکمه‌ها</li><li>تصاویر، ویدئوها و متن جایگزین</li><li>ترتیب و نمایش بخش‌های مجاز</li><li>اطلاعات گوگل و اشتراک‌گذاری</li></ul></section>
        <section id="limits" className={styles.guideSection}><div><small>۰۴</small><h2>محافظت از کیفیت طراحی</h2></div><ul><li>تعداد بخش‌ها در محدوده استاندارد قالب</li><li>اندازه و نوع رسانه کنترل‌شده</li><li>انتشار جدا از ذخیره پیش‌نویس</li><li>امکان بازگشت به نسخه قبلی</li></ul></section>
      </article>
    </div>
  </div></main>
}
