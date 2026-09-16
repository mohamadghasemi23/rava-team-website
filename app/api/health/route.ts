import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({ ok: true, app: 'rava-v1', contact_flow: 'gateway-rpc-v1' }, {
    headers: { 'cache-control': 'no-store, max-age=0' },
  })
}
