import Link from 'next/link'

export default function NotFound() {
  return <main className="auth-shell">
    <section className="auth-card">
      <span className="kicker">404</span>
      <h1>این صفحه موجود نیست.</h1>
      <p>آدرسی که وارد کرده‌اید پیدا نشد یا ممکن است منتقل شده باشد.</p>
      <div className="actions">
        <Link className="button" href="/">بازگشت به سایت</Link>
      </div>
    </section>
  </main>
}
