import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const PERMISSIONS = {
  PLATFORM_ORGANIZATIONS_MANAGE: 'platform.organizations.manage',
  PLATFORM_SITES_MANAGE: 'platform.sites.manage',
  PLATFORM_MODULES_MANAGE: 'platform.modules.manage',
  PLATFORM_ROLES_MANAGE: 'platform.roles.manage',
  PLATFORM_ACCESS_MANAGE: 'platform.access.manage',
  PLATFORM_AUDIT_VIEW: 'platform.audit.view',
  PLATFORM_HELP_MANAGE: 'platform.help.manage',
  PLATFORM_SUPPORT_IMPERSONATE: 'platform.support.impersonate',
  PLATFORM_BILLING_MANAGE: 'platform.billing.manage',
  ORGANIZATIONS_VIEW: 'organizations.view',
  ORGANIZATIONS_MANAGE: 'organizations.manage',
  SITES_VIEW: 'sites.view',
  SITES_MANAGE: 'sites.manage',
  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',
  ACCESS_VIEW: 'access.view',
  ACCESS_MANAGE: 'access.manage',
  MODULES_MANAGE: 'modules.manage',
  CMS_MANAGE: 'cms.manage',
  MEDIA_MANAGE: 'media.manage',
  SEO_MANAGE: 'seo.manage',
  ANALYTICS_VIEW: 'analytics.view',
  COMMERCE_MANAGE: 'commerce.manage',
  COMMERCE_VIEW: 'commerce.view',
  COMMERCE_PRODUCTS_MANAGE: 'commerce.products.manage',
  COMMERCE_INVENTORY_MANAGE: 'commerce.inventory.manage',
  COMMERCE_ORDERS_VIEW: 'commerce.orders.view',
  COMMERCE_ORDERS_MANAGE: 'commerce.orders.manage',
  COMMERCE_ORDERS_REFUND: 'commerce.orders.refund',
  LOGS_VIEW: 'logs.view',
  ERRORS_VIEW: 'errors.view',
  ERRORS_MANAGE: 'errors.manage',
  SECURITY_EVENTS_VIEW: 'security.events.view',
  HELP_VIEW: 'help.view',
  HELP_MANAGE: 'help.manage',
  TEMPLATES_VIEW: 'templates.view',
  TEMPLATES_MANAGE: 'templates.manage',
  DESIGN_MANAGE: 'design.manage',
  DESIGN_PUBLISH: 'design.publish',
  DESIGN_ROLLBACK: 'design.rollback',
  BILLING_VIEW: 'billing.view',
  BILLING_MANAGE: 'billing.manage',
  BILLING_ISSUE: 'billing.issue',
  BILLING_PAYMENTS_MANAGE: 'billing.payments.manage',
  USAGE_VIEW: 'usage.view',
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export type PermissionScope = {
  organizationId?: string | null
  siteId?: string | null
}

export async function hasPermission(permission: PermissionKey, scope: PermissionScope = {}) {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims?.sub) return false

  const { data, error } = await supabase.rpc('has_permission', {
    required_permission: permission,
    organization_scope: scope.organizationId ?? null,
    site_scope: scope.siteId ?? null,
  })

  if (error) return false
  return data === true
}

export async function requirePermission(
  permission: PermissionKey,
  scope: PermissionScope = {},
  deniedRedirect = '/admin',
) {
  const allowed = await hasPermission(permission, scope)
  if (!allowed) redirect(deniedRedirect)
}

export async function requireAnyPermission(
  permissions: readonly PermissionKey[],
  scope: PermissionScope = {},
  deniedRedirect = '/admin',
) {
  for (const permission of permissions) {
    if (await hasPermission(permission, scope)) return
  }
  redirect(deniedRedirect)
}
