import Link from 'next/link'
import styles from './components/rava-inner.module.css'

export default function NotFound(){
  return <div className={styles.site}>
    <main className={styles.main}>
      <section className={styles.hero}>
        <span>404 / NOT FOUND</span>
        <h1>این صفحه اینجا نیست.</h1>
        <p>ممکن است آدرس تغییر کرده باشد یا پروژه هنوز منتشر نشده باشد. از صفحه اصلی ادامه بدهید یا پروژه‌های راوا را ببینید.</p>
      </section>
      <section className={styles.projectCta}>
        <span>RAVA TEAM</span>
        <h2>از مسیر درست ادامه بدیم.</h2>
        <p><Link href="/">بازگشت به صفحه اصلی ↗</Link></p>
        <p><Link href="/work">مشاهده پروژه‌ها ↗</Link></p>
      </section>
    </main>
  </div>
}
