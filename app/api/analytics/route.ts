import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BLOCKED_PREFIXES = ['/admin', '/login', '/api', '/_next']
const ALLOWED_PATH = /^\/[a-zA-Z0-9\-_/]*$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as { path?: unknown } | null
    const path = typeof body?.path === 'string' ? body.path.slice(0, 240) : ''
    if (!path || !ALLOWED_PATH.test(path) || BLOCKED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return new NextResponse(null, { status: 204 })
    }

    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ''
    const userAgent = request.headers.get('user-agent') || ''
    const salt = process.env.ANALYTICS_HASH_SALT
    if (!salt) return new NextResponse(null, { status: 204 })

    const visitorHash = createHash('sha256')
      .update(`${salt}|${forwarded}|${userAgent}`)
      .digest('hex')

    const admin = createAdminClient()
    const { error } = await admin.rpc('record_page_view', {
      p_path: path,
      p_visitor_hash: visitorHash,
    })

    if (error) return new NextResponse(null, { status: 204 })
    return new NextResponse(null, { status: 204 })
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}
