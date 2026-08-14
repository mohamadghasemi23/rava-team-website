'use server'

import { createHash, randomUUID } from 'crypto'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type LoginState = { error?: string; nonce?: number }

type TurnstileResult = {
  success: boolean
  hostname?: string
  action?: string
  'error-codes'?: string[]
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const GENERIC_ERROR = 'ورود انجام نشد. اطلاعات واردشده و تأیید امنیتی را بررسی کنید.'

function invalidInput(email: string, password: string, token: string) {
  if (!email || !password || !token) return true
  if (email.length > 254 || !EMAIL_RE.test(email)) return true
  if (password.length < 8 || password.length > 128) return true
  if (token.length > 2048) return true
  if (/\p{Cc}/u.test(email) || /\p{Cc}/u.test(password)) return true
  return false
}

async function getClientFingerprint() {
  const h = await headers()
  const rawIp = (h.get('cf-connecting-ip') || h.get('x-nf-client-connection-ip') || h.get('x-forwarded-for') || 'unknown')
    .split(',')[0]
    .trim()
  const ua = (h.get('user-agent') || 'unknown').slice(0, 256)
  return createHash('sha256').update(`${rawIp}|${ua}`).digest('hex')
}

async function verifyTurnstile(token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return false

  const h = await headers()
  const remoteIp = (h.get('cf-connecting-ip') || h.get('x-nf-client-connection-ip') || h.get('x-forwarded-for') || '')
    .split(',')[0]
    .trim()

  const body = new FormData()
  body.append('secret', secret)
  body.append('response', token)
  body.append('idempotency_key', randomUUID())
  if (remoteIp) body.append('remoteip', remoteIp)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 7000)

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!response.ok) return false
    const result = (await response.json()) as TurnstileResult
    if (!result.success) return false

    const allowedHosts = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || 'ravateam.ir,www.ravateam.ir')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)

    if (result.hostname && allowedHosts.length > 0 && !allowedHosts.includes(result.hostname)) return false
    if (result.action && result.action !== 'admin-login') return false
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const captchaToken = String(formData.get('cf-turnstile-response') ?? '')
  const nonce = Date.now()

  if (invalidInput(email, password, captchaToken)) return { error: GENERIC_ERROR, nonce }

  const supabase = await createClient()
  const fingerprint = await getClientFingerprint()

  const { data: allowed, error: rateError } = await supabase.rpc('consume_login_rate_limit', { p_key: fingerprint })
  if (rateError || allowed !== true) {
    return { error: 'تعداد تلاش‌های ورود بیش از حد مجاز است. چند دقیقه دیگر دوباره تلاش کنید.', nonce }
  }

  const captchaOk = await verifyTurnstile(captchaToken)
  if (!captchaOk) return { error: GENERIC_ERROR, nonce }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: GENERIC_ERROR, nonce }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (claimsError || !userId) {
    await supabase.auth.signOut()
    return { error: GENERIC_ERROR, nonce }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('active, role')
    .eq('id', userId)
    .single()

  if (!profile?.active || !['super_admin', 'admin', 'content_manager', 'viewer'].includes(profile.role)) {
    await supabase.auth.signOut()
    return { error: GENERIC_ERROR, nonce }
  }

  await supabase.rpc('reset_login_rate_limit', { p_key: fingerprint })
  redirect('/admin')
}
