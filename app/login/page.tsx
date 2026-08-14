'use client'

import Script from 'next/script'
import { FormEvent, useActionState, useEffect, useState } from 'react'
import { login, type LoginState } from './actions'
import './login.css'

const initialState: LoginState = {}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

declare global { interface Window { turnstile?: { reset: () => void } } }

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, initialState)
  const [clientError, setClientError] = useState('')
  const [sessionExpired, setSessionExpired] = useState(false)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''
  useEffect(()=>{if(state.nonce)window.turnstile?.reset()},[state.nonce])
  useEffect(()=>{setSessionExpired(new URLSearchParams(window.location.search).get('reason')==='session_expired')},[])

  function validateBeforeSubmit(event:FormEvent<HTMLFormElement>){setClientError('');const data=new FormData(event.currentTarget);const email=String(data.get('email')||'').trim().toLowerCase();const password=String(data.get('password')||'');const captcha=String(data.get('cf-turnstile-response')||'');let message='';if(!email||email.length>254||!EMAIL_RE.test(email))message='یک ایمیل معتبر وارد کنید.';else if(password.length<8||password.length>128)message='رمز عبور باید بین ۸ تا ۱۲۸ کاراکتر باشد.';else if(/\p{Cc}/u.test(email)||/\p{Cc}/u.test(password))message='ورودی نامعتبر است.';else if(!captcha)message='تأیید امنیتی را کامل کنید.';if(message){event.preventDefault();setClientError(message)}}

  return <main className="auth-shell"><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive"/><section className="auth-card" aria-labelledby="login-title"><div className="auth-brand">RAVA <b>TEAM</b></div><p className="auth-kicker">CONTROL CENTER</p><h1 id="login-title">ورود به پنل مدیریت</h1><p className="auth-copy">برای مدیریت سایت با حساب مدیریتی خود وارد شوید.</p>{sessionExpired?<p className="auth-session-note">نشست مدیریتی شما به دلایل امنیتی منقضی شده است. دوباره وارد شوید.</p>:null}
    <form action={action} className="auth-form" onSubmit={validateBeforeSubmit} noValidate><label htmlFor="email">ایمیل</label><input id="email" name="email" type="email" autoComplete="email" required inputMode="email" maxLength={254} spellCheck={false}/><label htmlFor="password">رمز عبور</label><input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} maxLength={128}/><label className="auth-remember" htmlFor="remember_me"><input id="remember_me" name="remember_me" type="checkbox"/><span><b>مرا به خاطر بسپار</b><small>رمز عبور ذخیره نمی‌شود؛ فقط نشست امن تا حداکثر ۷ روز معتبر می‌ماند.</small></span></label>
      {siteKey?<div className="auth-captcha-wrap"><div className="cf-turnstile" data-sitekey={siteKey} data-action="admin-login" data-theme="dark" data-language="fa"/></div>:<p className="auth-error" role="alert">کلید امنیتی CAPTCHA هنوز روی محیط سایت تنظیم نشده است.</p>}
      {clientError?<p className="auth-error" role="alert">{clientError}</p>:null}{state.error?<div className="auth-error" role="alert"><span>{state.error}</span>{state.errorId?<small style={{display:'block',marginTop:6}} dir="ltr">Log ID: {state.errorId}</small>:null}</div>:null}<button type="submit" disabled={pending||!siteKey}>{pending?'در حال بررسی و ورود…':'ورود امن'}</button></form><a className="auth-back" href="/">بازگشت به سایت</a></section></main>
}
