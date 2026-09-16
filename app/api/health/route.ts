import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({
    ok: true,
    app: 'rava-v1',
    contact_flow: 'gateway-rpc-v4',
    contact_env: {
      supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      publishable_key: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      gateway_token: Boolean(process.env.CONTACT_RPC_GATEWAY_TOKEN),
      rate_salt: Boolean(process.env.CONTACT_RATE_LIMIT_SALT),
    },
  }, {
    headers: { 'cache-control': 'no-store, max-age=0' },
  })
}
