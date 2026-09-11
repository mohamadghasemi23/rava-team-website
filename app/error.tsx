'use client'

import { useEffect } from 'react'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Do not render stack/message to users. Client reporting will be wired to the
    // observability endpoint in a later step; digest is retained by Next.js.
    console.error('RAVA application error', { digest: error.digest })
  }, [error])

  return <main className="auth-shell">
    <section className="auth-card">
      <span className="kicker">SYSTEM ERROR</span>
      <h1>مشکلی در اجرای این بخش پیش آمد.</h1>
      <p>اطلاعات فنی سیستم برای امنیت نمایش داده نمی‌شود. می‌توانید عملیات را دوباره امتحان کنید.</p>
      {error.digest ? <p><small>شناسه پیگیری: {error.digest}</small></p> : null}
      <div className="actions"><button className="button" type="button" onClick={reset}>تلاش دوباره</button></div>
    </section>
  </main>
}
