import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

const MAX_URL_LENGTH = 2048
const MAX_QUERY_PARAMS = 50
const MAX_QUERY_VALUE_LENGTH = 2048
const MAX_APP_BODY_BYTES = 2 * 1024 * 1024
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/
const TRAVERSAL = /(?:^|\/)(?:\.{1,2})(?:\/|$)|%2e/i
const BACKSLASH = /\\|%5c/i
const DANGEROUS_URL_INPUT = /(?:union\s+select|sleep\s*\(|benchmark\s*\(|information_schema|xp_cmdshell|<script|javascript:)/i
const BLOCKED_METHODS = new Set(['TRACE', 'TRACK', 'CONNECT'])

function contentSecurityPolicy() {
  let supabaseOrigin = ''
  try { supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').origin } catch {}
  const remote = supabaseOrigin ? ` ${supabaseOrigin}` : ''
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `img-src 'self' data: blob:${remote}`,
    `media-src 'self' blob:${remote}`,
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    `connect-src 'self'${remote} https://challenges.cloudflare.com`,
    'upgrade-insecure-requests',
  ].join('; ')
}

function secure(response: NextResponse, request?: NextRequest) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set('Content-Security-Policy', contentSecurityPolicy())
  if (request && (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname === '/login')) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0')
    response.headers.set('Pragma', 'no-cache')
  }
  return response
}

function reject(message: string, status = 400, request?: NextRequest) {
  return secure(new NextResponse(message, { status }), request)
}

function invalidQuery(request: NextRequest) {
  const entries = [...request.nextUrl.searchParams.entries()]
  if (entries.length > MAX_QUERY_PARAMS) return true
  return entries.some(([key, value]) =>
    key.length > 256 || value.length > MAX_QUERY_VALUE_LENGTH || CONTROL_CHARS.test(key) || CONTROL_CHARS.test(value),
  )
}

export async function proxy(request: NextRequest) {
  if (BLOCKED_METHODS.has(request.method.toUpperCase())) return reject('Method not allowed', 405, request)
  if (request.url.length > MAX_URL_LENGTH) return reject('Request URL is too long', 414, request)
  if (invalidQuery(request)) return reject('Invalid query string', 400, request)

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_APP_BODY_BYTES) return reject('Request body is too large', 413, request)

  let decodedPath = request.nextUrl.pathname
  try { decodedPath = decodeURIComponent(request.nextUrl.pathname) }
  catch { return reject('Malformed URL encoding', 400, request) }

  if (CONTROL_CHARS.test(decodedPath)) return reject('Invalid URL', 400, request)
  if (TRAVERSAL.test(request.nextUrl.pathname) || TRAVERSAL.test(decodedPath)) return reject('Invalid path', 400, request)
  if (BACKSLASH.test(request.nextUrl.pathname) || BACKSLASH.test(decodedPath)) return reject('Invalid path', 400, request)
  if (DANGEROUS_URL_INPUT.test(decodedPath) || DANGEROUS_URL_INPUT.test(request.nextUrl.search)) return reject('Invalid request', 400, request)

  if (/\/{2,}/.test(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = request.nextUrl.pathname.replace(/\/{2,}/g, '/')
    return secure(NextResponse.redirect(url, 308), request)
  }

  const path = request.nextUrl.pathname
  if (path.startsWith('/admin') || path === '/login') {
    return secure(await updateSession(request), request)
  }

  return secure(NextResponse.next(), request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
