'use client'

import { FormEvent, useState } from 'react'
import styles from './contact.module.css'

export default function ContactForm() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [ok, setOk] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setBusy(true); setMessage(''); setOk(false)

    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: data.get('name'),
        email: data.get('email'),
        phone: data.get('phone'),
        service_interest: data.get('service_interest'),
        message: data.get('message'),
        company_website: data.get('company_website'),
        source_path: window.location.pathname,
      }),
    }).catch(() => null)

    const result = response ? await response.json().catch(() => null) : null
    setBusy(false)
    setOk(Boolean(response?.ok && result?.ok))
    setMessage(result?.message ?? 'ارسال پیام انجام نشد. دوباره تلاش کنید.')
    if (response?.ok && result?.ok) form.reset()
  }

  return <form className={styles.form} onSubmit={submit}>
    <label>نام و نام خانوادگی<input name="name" required minLength={2} maxLength={120} autoComplete="name"/></label>
    <label>ایمیل<input name="email" type="email" maxLength={240} autoComplete="email" inputMode="email"/></label>
    <label>شماره تماس<input name="phone" inputMode="tel" maxLength={80} autoComplete="tel"/></label>
    <label>نوع پروژه<select name="service_interest" defaultValue="web-design"><option value="web-design">طراحی و توسعه وب</option><option value="ecommerce">فروشگاه اینترنتی</option><option value="digital-product">محصول دیجیتال</option><option value="brand-content">برندینگ و محتوا</option><option value="ai-automation">AI و اتوماسیون</option><option value="other">سایر</option></select></label>
    <label>درباره پروژه<textarea name="message" required minLength={10} maxLength={5000} rows={7}/></label>
    <label className={styles.honeypot} aria-hidden="true">Website<input name="company_website" tabIndex={-1} autoComplete="off"/></label>
    <button type="submit" disabled={busy}>{busy ? 'در حال ارسال…' : 'ارسال درخواست'}</button>
    {message ? <p className={styles.status} role="status" aria-live="polite">{ok ? '✓ ' : ''}{message}</p> : null}
  </form>
}
