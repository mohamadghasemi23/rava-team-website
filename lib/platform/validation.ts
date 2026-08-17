export type ProvisionSiteInput = {
  organizationName: string
  organizationSlug: string
  siteName: string
  siteSlug: string
  primaryLocale: string
  defaultCurrency: string
  timezone: string
}

const slugPattern = /^[a-z0-9][a-z0-9-]{1,62}$/
const localePattern = /^[a-z]{2}(-[A-Z]{2})?$/
const currencyPattern = /^[A-Z]{3}$/

function cleanName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function cleanSlug(value: string) {
  return value.trim().toLowerCase().replace(/^\/+|\/+$/g, '')
}

export function validateProvisionSiteInput(input: ProvisionSiteInput): ProvisionSiteInput {
  const normalized: ProvisionSiteInput = {
    organizationName: cleanName(input.organizationName),
    organizationSlug: cleanSlug(input.organizationSlug),
    siteName: cleanName(input.siteName),
    siteSlug: cleanSlug(input.siteSlug),
    primaryLocale: input.primaryLocale.trim(),
    defaultCurrency: input.defaultCurrency.trim().toUpperCase(),
    timezone: input.timezone.trim(),
  }

  if (normalized.organizationName.length < 2 || normalized.organizationName.length > 120) throw new Error('invalid_organization_name')
  if (!slugPattern.test(normalized.organizationSlug)) throw new Error('invalid_organization_slug')
  if (normalized.siteName.length < 2 || normalized.siteName.length > 120) throw new Error('invalid_site_name')
  if (!slugPattern.test(normalized.siteSlug)) throw new Error('invalid_site_slug')
  if (!localePattern.test(normalized.primaryLocale)) throw new Error('invalid_locale')
  if (!currencyPattern.test(normalized.defaultCurrency)) throw new Error('invalid_currency')
  if (normalized.timezone.length < 3 || normalized.timezone.length > 64) throw new Error('invalid_timezone')

  return normalized
}
