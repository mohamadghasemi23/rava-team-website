import { NextRequest, NextResponse } from 'next/server'
import { logEvent, newRequestId } from '@/lib/observability/logger'

const MAX_BODY = 12_000

export async function POST(request: NextRequest) {
  const requestId = newRequestId()
  const length = Number(request.headers.get('content-length') || 0)
  if (length > MAX_BODY) return NextResponse.json({ ok:false }, { status:413 })

  let body:Record<string,unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ ok:false }, { status:400 }) }

  const message = typeof body.message === 'string' ? body.message.slice(0,1200) : 'Client-side application error'
  const route = typeof body.route === 'string' ? body.route.slice(0,1000) : undefined
  const digest = typeof body.digest === 'string' ? body.digest.slice(0,180) : undefined
  const stack = typeof body.stack === 'string' ? body.stack.slice(0,5000) : undefined

  const eventId = await logEvent({
    category:'error',severity:'error',eventName:'client.runtime_error',message,route,
    method:'CLIENT',requestId,source:'client',error:stack || message,
    metadata:{ digest, userAgent:(request.headers.get('user-agent')||'').slice(0,300) },
  })

  return NextResponse.json({ ok:true,eventId,requestId }, { headers:{'Cache-Control':'no-store'} })
}
