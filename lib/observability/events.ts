import { createHash, randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
export type LogSeverity = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical'

const SENSITIVE_KEYS = /password|passcode|token|secret|cookie|authorization|api[_-]?key|session|credit|card|cvv|otp/i
const SENSITIVE_MESSAGE_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi,
  /\b(password|passcode|token|secret|cookie|authorization|api[_-]?key|session|otp)\s*[:=]\s*([^\s,;]+)/gi,
  /\b(sk|pk)_[A-Za-z0-9_-]{12,}\b/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
]

function sanitizeValue(value: unknown, depth = 0): JsonValue {
  if (depth > 5) return '[max-depth]'
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'string') return sanitizeTechnicalMessage(value)
  if (Array.isArray(value)) return value.slice(0, 100).map((entry) => sanitizeValue(entry, depth + 1))
  if (typeof value === 'object') {
    const source = value as Record<string, unknown>
    const safe: Record<string, JsonValue> = {}
    for (const [key, entry] of Object.entries(source).slice(0, 100)) {
      safe[key] = SENSITIVE_KEYS.test(key) ? '[redacted]' : sanitizeValue(entry, depth + 1)
    }
    return safe
  }
  return sanitizeTechnicalMessage(String(value))
}

export function sanitizeTechnicalMessage(value: unknown) {
  let safe = String(value ?? '')
  for (const pattern of SENSITIVE_MESSAGE_PATTERNS) {
    safe = safe.replace(pattern, (match, key: string | undefined) => key ? `${key}=[redacted]` : '[redacted]')
  }
  return safe.slice(0, 4000)
}

export function sanitizeLogContext(context: Record<string, unknown> = {}) {
  return sanitizeValue(context) as Record<string, JsonValue>
}

export function createTraceContext(existingCorrelationId?: string | null) {
  return {
    requestId: randomUUID(),
    correlationId: existingCorrelationId || randomUUID(),
  }
}

function errorFingerprint(error: unknown, eventType: string) {
  const source = technicalErrorMessage(error)
  return createHash('sha256').update(`${eventType}:${source}`).digest('hex').slice(0, 32)
}

function technicalErrorMessage(error: unknown) {
  if (error instanceof Error) return `${error.name}: ${sanitizeTechnicalMessage(error.message)}`
  if (error && typeof error === 'object') {
    const value=error as Record<string,unknown>
    return ['code','message','details','hint'].filter(key=>value[key]).map(key=>`${key}=${sanitizeTechnicalMessage(value[key])}`).join('; ').slice(0,4000) || 'structured error without public details'
  }
  return sanitizeTechnicalMessage(error)
}

export async function recordAuditEvent(input: {
  action: string
  entityType: string
  entityId?: string | null
  organizationId?: string | null
  siteId?: string | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  context?: Record<string, unknown>
  requestId?: string | null
  correlationId?: string | null
  severity?: LogSeverity
}) {
  const supabase = await createClient()
  return supabase.rpc('record_audit_event', {
    p_action: input.action,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId ?? null,
    p_organization_id: input.organizationId ?? null,
    p_site_id: input.siteId ?? null,
    p_before_data: input.before ? sanitizeLogContext(input.before) : null,
    p_after_data: input.after ? sanitizeLogContext(input.after) : null,
    p_context: sanitizeLogContext(input.context),
    p_request_id: input.requestId ?? null,
    p_correlation_id: input.correlationId ?? null,
    p_severity: input.severity ?? 'info',
  })
}

export async function recordSecurityEvent(input: {
  eventType: string
  outcome?: 'success' | 'failure' | 'blocked' | 'challenged'
  organizationId?: string | null
  siteId?: string | null
  route?: string | null
  subjectType?: string | null
  subjectId?: string | null
  context?: Record<string, unknown>
  requestId?: string | null
  correlationId?: string | null
  severity?: LogSeverity
}) {
  const supabase = await createClient()
  return supabase.rpc('record_security_event', {
    p_event_type: input.eventType,
    p_outcome: input.outcome ?? 'success',
    p_organization_id: input.organizationId ?? null,
    p_site_id: input.siteId ?? null,
    p_route: input.route ?? null,
    p_subject_type: input.subjectType ?? null,
    p_subject_id: input.subjectId ?? null,
    p_context: sanitizeLogContext(input.context),
    p_request_id: input.requestId ?? null,
    p_correlation_id: input.correlationId ?? null,
    p_severity: input.severity ?? 'notice',
  })
}

export async function recordErrorEvent(input: {
  error: unknown
  category: string
  eventType: string
  publicMessage?: string
  organizationId?: string | null
  siteId?: string | null
  route?: string | null
  context?: Record<string, unknown>
  requestId?: string | null
  correlationId?: string | null
  severity?: LogSeverity
  explanationFa?: string | null
  explanationEn?: string | null
  probableCauses?: string[]
}) {
  const supabase = await createClient()
  const technicalMessage = technicalErrorMessage(input.error)

  return supabase.rpc('record_error_event', {
    p_category: input.category,
    p_event_type: input.eventType,
    p_public_message: input.publicMessage ?? 'خطایی رخ داده است. لطفاً شناسه خطا را برای پشتیبانی ارسال کنید.',
    p_technical_message: technicalMessage,
    p_organization_id: input.organizationId ?? null,
    p_site_id: input.siteId ?? null,
    p_route: input.route ?? null,
    p_context: sanitizeLogContext(input.context),
    p_request_id: input.requestId ?? null,
    p_correlation_id: input.correlationId ?? null,
    p_severity: input.severity ?? 'error',
    p_explanation_fa: input.explanationFa ?? null,
    p_explanation_en: input.explanationEn ?? null,
    p_probable_causes: input.probableCauses ?? [],
    p_fingerprint: errorFingerprint(input.error, input.eventType),
  })
}

export function safeFailure(message = 'عملیات انجام نشد. لطفاً دوباره تلاش کنید.', errorId?: string | null) {
  return {
    ok: false as const,
    message: errorId ? `${message} شناسه خطا: ${errorId}` : message,
    errorId: errorId ?? undefined,
  }
}
