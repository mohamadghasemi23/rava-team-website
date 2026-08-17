import { createClient } from '@/lib/supabase/server'
import type { PermissionKey } from '@/lib/authz/permissions'
import { recordSecurityEvent, sanitizeLogContext } from '@/lib/observability/events'

export type EntitlementDecision = {
  allowed: boolean
  reason: string
  entitlementStatus: string | null
  tier: string | null
  limits: Record<string, unknown>
  config: Record<string, unknown>
  startsAt: string | null
  endsAt: string | null
  graceUntil: string | null
}

export type UsageDecision = {
  allowed: boolean
  reason: string
  eventId: number | null
  warning: boolean
  usedBefore: number
  usedAfter: number
  softLimit: number | null
  hardLimit: number | null
  periodStart: string | null
  periodEnd: string | null
}

export class FeatureAccessError extends Error {
  readonly code: string
  readonly siteId: string
  readonly moduleKey: string

  constructor(code: string, siteId: string, moduleKey: string) {
    super(code)
    this.name = 'FeatureAccessError'
    this.code = code
    this.siteId = siteId
    this.moduleKey = moduleKey
  }
}

function firstRow<T>(data: T | T[] | null): T | null {
  if (Array.isArray(data)) return data[0] ?? null
  return data ?? null
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function asNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function hasSitePermission(permission: PermissionKey, siteId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('has_site_permission', {
    required_permission: permission,
    site_scope: siteId,
  })
  return !error && data === true
}

export async function hasAnySitePermission(permissions: readonly PermissionKey[], siteId: string) {
  for (const permission of permissions) {
    if (await hasSitePermission(permission, siteId)) return true
  }
  return false
}

export async function checkSiteEntitlement(siteId: string, moduleKey: string): Promise<EntitlementDecision> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('check_site_entitlement_access', {
    p_site_id: siteId,
    p_module_key: moduleKey,
  })
  if (error) throw new FeatureAccessError('entitlement_check_failed', siteId, moduleKey)

  const row = firstRow(data) as Record<string, unknown> | null
  if (!row) throw new FeatureAccessError('entitlement_check_empty', siteId, moduleKey)

  return {
    allowed: row.allowed === true,
    reason: String(row.reason ?? 'not_entitled'),
    entitlementStatus: row.entitlement_status ? String(row.entitlement_status) : null,
    tier: row.tier ? String(row.tier) : null,
    limits: asObject(row.limits),
    config: asObject(row.config),
    startsAt: row.starts_at ? String(row.starts_at) : null,
    endsAt: row.ends_at ? String(row.ends_at) : null,
    graceUntil: row.grace_until ? String(row.grace_until) : null,
  }
}

export async function authorizeSiteFeature(input: {
  siteId: string
  moduleKey: string
  permissions: readonly PermissionKey[]
  route?: string
  operation?: string
}) {
  const permissionAllowed = await hasAnySitePermission(input.permissions, input.siteId)
  if (!permissionAllowed) {
    await recordSecurityEvent({
      eventType: 'feature.access.blocked',
      outcome: 'blocked',
      siteId: input.siteId,
      route: input.route ?? null,
      severity: 'warning',
      context: { moduleKey: input.moduleKey, permissions: [...input.permissions], operation: input.operation ?? null, reason: 'permission_denied' },
    })
    throw new FeatureAccessError('permission_denied', input.siteId, input.moduleKey)
  }

  const entitlement = await checkSiteEntitlement(input.siteId, input.moduleKey)
  if (!entitlement.allowed) {
    await recordSecurityEvent({
      eventType: 'feature.entitlement.blocked',
      outcome: 'blocked',
      siteId: input.siteId,
      route: input.route ?? null,
      severity: 'notice',
      context: { moduleKey: input.moduleKey, operation: input.operation ?? null, reason: entitlement.reason, status: entitlement.entitlementStatus, tier: entitlement.tier },
    })
    throw new FeatureAccessError(entitlement.reason, input.siteId, input.moduleKey)
  }

  return entitlement
}

export async function consumeMeteredFeature(input: {
  siteId: string
  moduleKey: string
  meterKey: string
  quantity: number
  idempotencyKey: string
  context?: Record<string, unknown>
}): Promise<UsageDecision> {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new FeatureAccessError('invalid_quantity', input.siteId, input.moduleKey)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('consume_metered_feature', {
    p_site_id: input.siteId,
    p_module_key: input.moduleKey,
    p_meter_key: input.meterKey,
    p_quantity: input.quantity,
    p_idempotency_key: input.idempotencyKey,
    p_context: sanitizeLogContext(input.context),
  })
  if (error) throw new FeatureAccessError('usage_enforcement_failed', input.siteId, input.moduleKey)

  const row = firstRow(data) as Record<string, unknown> | null
  if (!row) throw new FeatureAccessError('usage_enforcement_empty', input.siteId, input.moduleKey)

  const decision: UsageDecision = {
    allowed: row.allowed === true,
    reason: String(row.reason ?? 'blocked'),
    eventId: asNumber(row.event_id),
    warning: row.warning === true,
    usedBefore: asNumber(row.used_before) ?? 0,
    usedAfter: asNumber(row.used_after) ?? 0,
    softLimit: asNumber(row.soft_limit),
    hardLimit: asNumber(row.hard_limit),
    periodStart: row.period_start ? String(row.period_start) : null,
    periodEnd: row.period_end ? String(row.period_end) : null,
  }

  if (!decision.allowed) {
    await recordSecurityEvent({
      eventType: 'feature.usage.blocked',
      outcome: 'blocked',
      siteId: input.siteId,
      severity: 'notice',
      context: {
        moduleKey: input.moduleKey,
        meterKey: input.meterKey,
        reason: decision.reason,
        usedAfter: decision.usedAfter,
        hardLimit: decision.hardLimit,
      },
    })
  }

  return decision
}
