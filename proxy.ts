import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

const MAX_URL_LENGTH = 2048
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/
const TRAVERSAL = /(?:^|\/)(?:\.{1,2})(?:\/|$)|%2e/i
const BACKSLASH = /\\|%5c/i
const DANGEROUS_URL_INPUT = /(?:union\s+select|sleep\s*\(|benchmark\s*\(|information_schema|xp_cmdshell|<script|javascript:)/i

function secure(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  return response
}

function reject(message: string) {
  return secure(new NextResponse(message, { status: 400 }))
}

export async function proxy(request: NextRequest) {
  if (request.url.length > MAX_URL_LENGTH) return reject('Request URL is too long')

  let decodedPath = request.nextUrl.pathname
  try { decodedPath = decodeURIComponent(request.nextUrl.pathname) }
  catch { return reject('Malformed URL encoding') }

  if (CONTROL_CHARS.test(decodedPath)) return reject('Invalid URL')
  if (TRAVERSAL.test(request.nextUrl.pathname) || TRAVERSAL.test(decodedPath)) return reject('Invalid path')
  if (BACKSLASH.test(request.nextUrl.pathname) || BACKSLASH.test(decodedPath)) return reject('Invalid path')
  if (DANGEROUS_URL_INPUT.test(decodedPath) || DANGEROUS_URL_INPUT.test(request.nextUrl.search)) return reject('Invalid request')

  if (/\/{2,}/.test(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = request.nextUrl.pathname.replace(/\/{2,}/g, '/')
    return secure(NextResponse.redirect(url, 308))
  }

  const path = request.nextUrl.pathname
  if (path.startsWith('/admin') || path === '/login') {
    return secure(await updateSession(request))
  }

  return secure(NextResponse.next())
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
