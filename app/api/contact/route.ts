import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'nodejs'

const SERVICES = new Set(['web-design','ecommerce','digital-product','brand-content','ai-automation','other'])

function clean(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max)
}

function validEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function fingerprint(request: NextRequest, salt: string) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  const realIp = request.headers.get('x-real-ip')?.trim() ?? ''
  const ip = forwarded || realIp || 'unknown'
  const ua = request.headers.get('user-agent') ?? ''
  return createHash('sha256').update(`${salt}|${ip}|${ua}`).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ ok: false, message: 'درخواست نامعتبر است.' }, { status: 415 })
    }

    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body) return NextResponse.json({ ok: false, message: 'اطلاعات فرم نامعتبر است.' }, { status: 400 })

    const honeypot = clean(body.company_website, 200)
    if (honeypot) return NextResponse.json({ ok: true, message: 'پیام شما دریافت شد.' })

    const name = clean(body.name, 120)
    const email = clean(body.email, 240).toLowerCase()
    const phone = clean(body.phone, 80)
    const message = clean(body.message, 5000)
    const serviceRaw = clean(body.service_interest, 80)
    const serviceInterest = SERVICES.has(serviceRaw) ? serviceRaw : 'other'
    const sourcePath = clean(body.source_path, 300) || '/contact'

    if (name.length < 2 || message.length < 10) {
      return NextResponse.json({ ok: false, message: 'نام و توضیح پروژه را کامل‌تر وارد کنید.' }, { status: 400 })
    }
    if (!email && !phone) {
      return NextResponse.json({ ok: false, message: 'حداقل ایمیل یا شماره تماس را وارد کنید.' }, { status: 400 })
    }
    if (!validEmail(email)) {
      return NextResponse.json({ ok: false, message: 'فرمت ایمیل صحیح نیست.' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const gatewayToken = process.env.CONTACT_RPC_GATEWAY_TOKEN
    const rateSalt = process.env.CONTACT_RATE_LIMIT_SALT
    if (!url || !publishableKey || !gatewayToken || !rateSalt) {
      console.error('Contact server configuration is incomplete')
      return NextResponse.json({ ok: false, message: 'ارسال پیام موقتاً در دسترس نیست.' }, { status: 503 })
    }

    const clientKey = fingerprint(request, rateSalt)
    const supabase = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'x-rava-gateway-token': gatewayToken, 'x-rava-client-key': clientKey } },
    })

    const { data, error } = await supabase.rpc('submit_contact_lead', {
      p_name: name,
      p_email: email,
      p_phone: phone,
      p_service_interest: serviceInterest,
      p_message: message,
      p_source_path: sourcePath,
      p_company_website: '',
    })

    if (error) {
      console.error('Contact RPC failed', { code: error.code, message: error.message })
      return NextResponse.json({ ok: false, message: 'ارسال پیام موقتاً در دسترس نیست.' }, { status: 503 })
    }

    const result = data && typeof data === 'object' && !Array.isArray(data)
      ? data as { ok?: boolean; code?: string; message?: string }
      : null

    if (!result?.ok) {
      const status = result?.code === 'rate_limit' ? 429 : 400
      return NextResponse.json({ ok: false, message: result?.message || 'اطلاعات فرم نامعتبر است.' }, { status })
    }

    return NextResponse.json({ ok: true, message: result.message || 'پیام شما دریافت شد. با شما در ارتباط خواهیم بود.' })
  } catch (error) {
    console.error('Contact endpoint failed', error)
    return NextResponse.json({ ok: false, message: 'خطای غیرمنتظره‌ای رخ داد.' }, { status: 500 })
  }
}
