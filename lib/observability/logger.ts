import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { explainError } from './error-explainer'

type Category = 'audit'|'error'|'security'|'auth'|'system'|'performance'
type Severity = 'debug'|'info'|'warning'|'error'|'critical'

type LogInput = {
  category: Category
  severity?: Severity
  eventName: string
  message?: string
  summaryFa?: string
  causeFa?: string
  route?: string
  method?: string
  actorUserId?: string | null
  actorRole?: string | null
  sessionId?: string | null
  requestId?: string | null
  source?: 'server'|'client'|'proxy'|'database'
  httpStatus?: number | null
  error?: unknown
  metadata?: Record<string, unknown>
}

const SENSITIVE_KEYS = /password|passwd|secret|token|authorization|cookie|session_token|service_role|api[_-]?key|captcha/i

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[max-depth]'
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'string') return value.length > 1200 ? `${value.slice(0,1200)}…` : value
  if (Array.isArray(value)) return value.slice(0,50).map(v=>sanitize(v,depth+1))
  if (typeof value === 'object') {
    const out: Record<string,unknown> = {}
    for (const [key,val] of Object.entries(value as Record<string,unknown>).slice(0,80)) {
      out[key] = SENSITIVE_KEYS.test(key) ? '[redacted]' : sanitize(val,depth+1)
    }
    return out
  }
  return String(value)
}

function errorFields(error: unknown) {
  if (!error) return { error_name:null,error_code:null,error_stack:null }
  if (error instanceof Error) {
    const anyError = error as Error & { code?: string|number }
    return {
      error_name: error.name?.slice(0,160) || 'Error',
      error_code: anyError.code == null ? null : String(anyError.code).slice(0,160),
      error_stack: error.stack ? error.stack.slice(0,8000) : null,
    }
  }
  const anyError = typeof error === 'object' && error !== null ? error as Record<string,unknown> : null
  return {
    error_name: anyError?.name ? String(anyError.name).slice(0,160) : 'UnknownError',
    error_code: anyError?.code == null ? null : String(anyError.code).slice(0,160),
    error_stack: String(anyError?.message ?? error).slice(0,2000)
  }
}

function eventPrefix(category:Category){ return category === 'error' ? 'ERR' : category === 'security' ? 'SEC' : 'EVT' }

export function newRequestId(){ return `REQ-${randomUUID()}` }

export async function logEvent(input: LogInput) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const eventId = `${eventPrefix(input.category)}-${randomUUID()}`
  if (!url || !serviceKey) {
    console.error('[RAVA-LOGGER-CONFIG]', eventId, input.eventName)
    return eventId
  }

  const admin = createClient(url, serviceKey, { auth:{ persistSession:false, autoRefreshToken:false } })
  const err = errorFields(input.error)
  const explanation = input.category === 'error' || input.error
    ? explainError(input.error ?? { name:input.eventName, code:err.error_code, message:input.message }, input.eventName)
    : { summaryFa: input.summaryFa ?? input.message ?? 'یک رویداد در سیستم ثبت شد.', causeFa: input.causeFa ?? 'این رویداد در نتیجه اجرای یکی از فرایندهای سیستم یا عملیات مدیریتی ثبت شده است.' }

  const payload = {
    event_id:eventId,
    request_id:input.requestId ?? null,
    category:input.category,
    severity:input.severity ?? (input.category==='error'?'error':'info'),
    event_name:input.eventName.slice(0,180),
    message:input.message?.slice(0,2000) ?? null,
    summary_fa:(input.summaryFa ?? explanation.summaryFa).slice(0,2000),
    cause_fa:(input.causeFa ?? explanation.causeFa).slice(0,3000),
    route:input.route?.slice(0,1000) ?? null,
    method:input.method?.slice(0,16) ?? null,
    actor_user_id:input.actorUserId ?? null,
    actor_role:input.actorRole?.slice(0,80) ?? null,
    session_id:input.sessionId ?? null,
    source:input.source ?? 'server',
    http_status:input.httpStatus ?? null,
    ...err,
    metadata:sanitize(input.metadata ?? {}),
  }
  const { error } = await admin.from('system_events').insert(payload)
  if (error) console.error('[RAVA-LOGGER-FAILED]', eventId, error.message)
  return eventId
}
