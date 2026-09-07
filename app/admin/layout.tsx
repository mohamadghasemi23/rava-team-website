import '@fontsource-variable/vazirmatn'
import '@fontsource-variable/estedad'
import '@fontsource-variable/noto-sans-arabic'
import '@fontsource-variable/cairo'
import '@fontsource-variable/noto-kufi-arabic'
import '@fontsource/ibm-plex-sans-arabic/400.css'
import '@fontsource/ibm-plex-sans-arabic/700.css'
import '@fontsource-variable/inter'
import '@fontsource-variable/manrope'
import '@fontsource-variable/source-sans-3'
import './admin-media.css'
import './admin-shell.css'
import './admin-experience.css'
import './admin-fixes.css'
import AdminShell from './components/AdminShell'
import {getAdminLocale} from '@/lib/i18n/admin-locale'
import {hasPermission,PERMISSIONS} from '@/lib/authz/permissions'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale=await getAdminLocale()
  const platformPermissions=[
    PERMISSIONS.PLATFORM_ORGANIZATIONS_MANAGE,
    PERMISSIONS.PLATFORM_SITES_MANAGE,
    PERMISSIONS.PLATFORM_MODULES_MANAGE,
    PERMISSIONS.PLATFORM_ROLES_MANAGE,
    PERMISSIONS.PLATFORM_ACCESS_MANAGE,
    PERMISSIONS.PLATFORM_AUDIT_VIEW,
    PERMISSIONS.PLATFORM_BILLING_MANAGE,
    PERMISSIONS.PLATFORM_HELP_MANAGE,
    PERMISSIONS.PLATFORM_SUPPORT_IMPERSONATE,
    PERMISSIONS.TEMPLATES_MANAGE,
  ] as const
  const [canProvisionSites,...platformDecisions]=await Promise.all([
    hasPermission(PERMISSIONS.PLATFORM_ORGANIZATIONS_MANAGE),
    ...platformPermissions.map(permission=>hasPermission(permission)),
  ])
  const isPlatformOperator=platformDecisions.some(Boolean)
  return <AdminShell initialLanguage={locale} canProvisionSites={canProvisionSites} isPlatformOperator={isPlatformOperator}>{children}</AdminShell>
}
