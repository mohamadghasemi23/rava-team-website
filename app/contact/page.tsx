import type { Metadata } from 'next'
import RavaInnerFrame from '../components/RavaInnerFrame'
import ContactForm from './ContactForm'
import styles from './contact.module.css'

export const metadata: Metadata = {
  title: 'شروع پروژه',
  description: 'برای طراحی وب، فروشگاه اینترنتی، محصول دیجیتال، برندینگ، محتوا یا AI با RAVA TEAM در ارتباط باشید.',
}

export default function ContactPage() {
  return <RavaInnerFrame eyebrow="Start a project" title="پروژه‌ای دارید؟ شروع کنیم." intro="کمی درباره پروژه، مسئله یا هدفی که دارید بنویسید. پیام شما مستقیم وارد Inbox پنل RAVA می‌شود و برای پیگیری در دسترس تیم خواهد بود.">
    <section className={styles.layout}>
      <aside className={styles.aside}>
        <h2>از مسئله شروع می‌کنیم.</h2>
        <p>لازم نیست Brief کامل داشته باشید. اگر فقط ایده، هدف یا مسئله‌ای دارید، همان نقطه شروع کافی است. جزئیات پروژه بعد از بررسی اولیه دقیق‌تر می‌شود.</p>
      </aside>
      <ContactForm/>
    </section>
  </RavaInnerFrame>
}
