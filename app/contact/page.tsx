import ContactForm from './ContactForm'

export const metadata = {
  title: 'شروع پروژه | RAVA TEAM',
  description: 'برای طراحی وب، فروشگاه اینترنتی، محصول دیجیتال، برندینگ، محتوا یا AI با RAVA TEAM در ارتباط باشید.',
}

export default function ContactPage() {
  return <main style={{ maxWidth: 760, margin: '0 auto', padding: '96px 24px', direction: 'rtl' }}>
    <p>RAVA TEAM</p>
    <h1>پروژه‌ای دارید؟ شروع کنیم.</h1>
    <p>این صفحه فعلاً نسخه عملکردی فرم تماس است؛ طراحی نهایی آن همراه با Modern Agency/RAVA اجرا می‌شود.</p>
    <ContactForm/>
  </main>
}
