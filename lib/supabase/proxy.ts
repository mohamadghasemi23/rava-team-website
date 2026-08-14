import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_SESSION_COOKIE = 'rava_admin_session'
const ADMIN_ROLES = ['super_admin', 'admin', 'content_manager', 'viewer']
const TOUCH_INTERVAL_MS = 5 * 60 * 1000

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((x) => x.toString(16).padStart(2, '0')).join('')
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie))
  return to
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
        },
      },
    },
  )

  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  const authenticated = Boolean(userId)
  const path = request.nextUrl.pathname
  let appSessionValid = false

  if (authenticated && userId) {
    const rawToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
    if (rawToken && rawToken.length <= 128) {
      const tokenHash = await sha256(rawToken)
      const { data: session } = await supabase
        .from('admin_sessions')
        .select('id,last_seen_at,expires_at,idle_timeout_minutes,revoked_at,user_agent_hash')
        .eq('user_id', userId)
        .eq('token_hash', tokenHash)
        .is('revoked_at', null)
        .maybeSingle()

      const { data: profile } = await supabase
        .from('profiles')
        .select('active,role')
        .eq('id', userId)
        .maybeSingle()

      if (session && profile?.active && ADMIN_ROLES.includes(profile.role)) {
        const now = Date.now()
        const expiresAt = Date.parse(session.expires_at)
        const lastSeenAt = Date.parse(session.last_seen_at)
        const idleMs = session.idle_timeout_minutes * 60 * 1000
        const currentUaHash = await sha256((request.headers.get('user-agent') || 'unknown').slice(0, 512))
        const uaMatches = !session.user_agent_hash || session.user_agent_hash === currentUaHash
        appSessionValid = uaMatches && now < expiresAt && now - lastSeenAt <= idleMs

        if (appSessionValid && now - lastSeenAt >= TOUCH_INTERVAL_MS) {
          await supabase.from('admin_sessions').update({ last_seen_at: new Date(now).toISOString() }).eq('id', session.id)
        }
      }
    }
  }

  if (path.startsWith('/admin')) {
    if (!authenticated || !appSessionValid) {
      if (authenticated) await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.search = ''
      url.searchParams.set('reason', 'session_expired')
      const redirect = copyCookies(response, NextResponse.redirect(url))
      redirect.cookies.delete(ADMIN_SESSION_COOKIE)
      return redirect
    }
    return response
  }

  if (path === '/login') {
    if (authenticated && appSessionValid) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      url.search = ''
      return copyCookies(response, NextResponse.redirect(url))
    }

    if (authenticated && !appSessionValid) {
      await supabase.auth.signOut()
      response.cookies.delete(ADMIN_SESSION_COOKIE)
    }
  }

  return response
}
