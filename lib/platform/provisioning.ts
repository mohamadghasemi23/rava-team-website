'use server'

import { createClient } from '@/lib/supabase/server'
import { validateProvisionSiteInput, type ProvisionSiteInput } from '@/lib/platform/validation'

export type ProvisionedSite = {
  organizationId: string
  siteId: string
  organizationSlug: string
  siteSlug: string
}

export async function provisionOrganizationSite(input: ProvisionSiteInput): Promise<ProvisionedSite> {
  const validated = validateProvisionSiteInput(input)
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims?.sub) throw new Error('authentication_required')

  const { data, error } = await supabase.rpc('provision_organization_site', {
    organization_name: validated.organizationName,
    organization_slug: validated.organizationSlug,
    site_name: validated.siteName,
    site_slug: validated.siteSlug,
    primary_locale: validated.primaryLocale,
    default_currency: validated.defaultCurrency,
    site_timezone: validated.timezone,
  })

  if (error) {
    // Do not leak database internals to the UI. The centralized error/logging layer
    // will attach a traceable error ID in the next platform-core phase.
    if (error.code === '23505') throw new Error('organization_or_site_already_exists')
    if (error.code === '42501') throw new Error('permission_denied')
    if (error.code === '22023') throw new Error('invalid_provisioning_input')
    throw new Error('provisioning_failed')
  }

  const result = data as {
    organization_id?: string
    site_id?: string
    organization_slug?: string
    site_slug?: string
  } | null

  if (!result?.organization_id || !result.site_id || !result.organization_slug || !result.site_slug) {
    throw new Error('invalid_provisioning_result')
  }

  return {
    organizationId: result.organization_id,
    siteId: result.site_id,
    organizationSlug: result.organization_slug,
    siteSlug: result.site_slug,
  }
}
