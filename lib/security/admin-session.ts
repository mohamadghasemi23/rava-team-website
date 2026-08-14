import { createHash, randomBytes } from 'crypto'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const ADMIN_SESSION_COOKIE = 'rava_admin_session'

const NORMAL_ABSOLUTE_HOURS = 8
const NORMAL_IDLE_MINUTES = 45
const REMEMBER_ABSOLUTE_DAYS = 7
const REMEMBER_IDLE_MINUTES = 12 * 60

export function hashAdminSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

async function userAgentHash() {
  const h = await headers()
  return createHash('sha256').update((h.get('user-agent') || 'unknown').slice(0, 512)).digest('hex')
}

export async function createAdminSession(userId: string, rememberMe: boolean) {
  const supabase = await createClient()
  const rawToken = randomBytes(32).toString('base64url')
  const tokenHash = hashAdminSessionToken(rawToken)
  const now = Date.now()
  const absoluteMs = rememberMe
    ? REMEMBER_ABSOLUTE_DAYS * 24 * 60 * 60 * 1000
    : NORMAL_ABSOLUTE_HOURS * 60 * 60 * 1000
  const expiresAt = new Date(now + absoluteMs)
  const idleTimeoutMinutes = rememberMe ? REMEMBER_IDLE_MINUTES : NORMAL_IDLE_MINUTES

  const { error } = await supabase.from('admin_sessions').insert({
    user_id: userId,
    token_hash: tokenHash,
    remember_me: rememberMe,
    idle_timeout_minutes: idleTimeoutMinutes,
    expires_at: expiresAt.toISOString(),
    user_agent_hash: await userAgentHash(),
  })
  if (error) throw error

  const store = await cookies()
  store.set(ADMIN_SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    ...(rememberMe ? { maxAge: Math.floor(absoluteMs / 1000) } : {}),
  })
}

export async function revokeCurrentAdminSession() {
  const store = await cookies()
  const raw = store.get(ADMIN_SESSION_COOKIE)?.value
  if (raw) {
    const supabase = await createClient()
    await supabase
      .from('admin_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', hashAdminSessionToken(raw))
      .is('revoked_at', null)
  }
  store.delete(ADMIN_SESSION_COOKIE)
}
