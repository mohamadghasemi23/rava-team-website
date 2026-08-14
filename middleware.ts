import { NextRequest, NextResponse } from 'next/server'

const MAX_URL_LENGTH = 2048
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/
const TRAVERSAL = /(?:^|\/)(?:\.{1,2})(?:\/|$)|%2e/i
const BACKSLASH = /\\|%5c/i
const SQLISH = /(?:union\s+select|sleep\s*\(|benchmark\s*\(|information_schema|xp_cmdshell|<script|javascript:)/i

function securityHeaders(response: NextResponse) {
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

function badRequest(message = 'Bad Request') {
  return securityHeaders(new NextResponse(message, { status: 400 }))
}

export function middleware(request: NextRequest) {
  const rawUrl = request.url
  if (rawUrl.length > MAX_URL_LENGTH) return badRequest('Request URL is too long')

  let decodedPath = request.nextUrl.pathname
  try {
    decodedPath = decodeURIComponent(request.nextUrl.pathname)
  } catch {
    return badRequest('Malformed URL encoding')
  }

  if (CONTROL_CHARS.test(decodedPath)) return badRequest('Invalid URL')
  if (TRAVERSAL.test(request.nextUrl.pathname) || TRAVERSAL.test(decodedPath)) return badRequest('Invalid path')
  if (BACKSLASH.test(request.nextUrl.pathname) || BACKSLASH.test(decodedPath)) return badRequest('Invalid path')
  if (SQLISH.test(decodedPath) || SQLISH.test(request.nextUrl.search)) return badRequest('Invalid request')

  // Collapse accidental duplicate slashes instead of letting multiple URL shapes reach the app.
  if (/\/{2,}/.test(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = request.nextUrl.pathname.replace(/\/{2,}/g, '/')
    return securityHeaders(NextResponse.redirect(url, 308))
  }

  return securityHeaders(NextResponse.next())
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
