import { createHash } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const SERVICES = new Set(['web-design','ecommerce','digital-product','brand-content','ai-automation','other'])

function clean(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max)
}

function validEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function bucketStart(date = new Date()) {
  const ms = 10 * 60 * 1000
  return new Date(Math.floor(date.getTime() / ms) * ms).toISOString()
}

function fingerprint(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  const realIp = request.headers.get('x-real-ip')?.trim() ?? ''
  const ip = forwarded || realIp || 'unknown'
  const ua = request.headers.get('user-agent') ?? ''
  const salt = process.env.CONTACT_RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'rava-contact'
  return createHash('sha256').update(`${salt}|${ip}|${ua}`).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ ok: false, message: 'درخواست نامعتبر است.' }, { status: 415 })
    }

    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body) return NextResponse.json({ ok: false, message: 'اطلاعات فرم نامعتبر است.' }, { status: 400 })

    // Honeypot: normal users never fill this hidden field.
    if (clean(body.company_website, 200)) {
      return NextResponse.json({ ok: true, message: 'پیام شما دریافت شد.' })
    }

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

    const supabase = createAdminClient()
    const keyHash = fingerprint(request)
    const { data: allowed, error: rateError } = await supabase.rpc('consume_contact_rate_limit', {
      p_key_hash: keyHash,
      p_window_start: bucketStart(),
      p_limit: 5,
    })

    if (rateError) {
      console.error('Contact rate limit failed', rateError)
      return NextResponse.json({ ok: false, message: 'ارسال پیام موقتاً در دسترس نیست.' }, { status: 503 })
    }
    if (!allowed) {
      return NextResponse.json({ ok: false, message: 'تعداد درخواست‌ها زیاد بوده. چند دقیقه بعد دوباره تلاش کنید.' }, { status: 429 })
    }

    const { error } = await supabase.from('leads').insert({
      name,
      email: email || null,
      phone: phone || null,
      service_interest: serviceInterest,
      message,
      source_path: sourcePath,
      status: 'new',
    })

    if (error) {
      console.error('Lead insert failed', error)
      return NextResponse.json({ ok: false, message: 'ثبت پیام انجام نشد. دوباره تلاش کنید.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: 'پیام شما دریافت شد. با شما در ارتباط خواهیم بود.' })
  } catch (error) {
    console.error('Contact endpoint failed', error)
    return NextResponse.json({ ok: false, message: 'خطای غیرمنتظره‌ای رخ داد.' }, { status: 500 })
  }
}
