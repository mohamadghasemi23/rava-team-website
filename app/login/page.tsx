'use client'

import { useActionState } from 'react'
import { login, type LoginState } from './actions'

const initialState: LoginState = {}

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, initialState)

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand">RAVA <b>TEAM</b></div>
        <p className="auth-kicker">CONTROL CENTER</p>
        <h1 id="login-title">ورود به پنل مدیریت</h1>
        <p className="auth-copy">برای مدیریت سایت با حساب مدیریتی خود وارد شوید.</p>

        <form action={action} className="auth-form">
          <label htmlFor="email">ایمیل</label>
          <input id="email" name="email" type="email" autoComplete="email" required inputMode="email" />
          <label htmlFor="password">رمز عبور</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
          {state.error ? <p className="auth-error" role="alert">{state.error}</p> : null}
          <button type="submit" disabled={pending}>{pending ? 'در حال ورود…' : 'ورود امن'}</button>
        </form>
        <a className="auth-back" href="/">بازگشت به سایت</a>
      </section>
    </main>
  )
}
