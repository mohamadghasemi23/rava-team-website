import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="not-found-shell">
      <section className="not-found-card">
        <span className="not-found-code">404</span>
        <h1>این صفحه موجود نیست</h1>
        <p>آدرسی که وارد کرده‌ای پیدا نشد یا ممکن است تغییر کرده باشد.</p>
        <div className="actions">
          <Link className="button" href="/">بازگشت به صفحه اصلی</Link>
          <Link className="button ghost" href="/login">ورود به پنل</Link>
        </div>
      </section>
    </main>
  )
}
