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
  const canProvisionSites=await hasPermission(PERMISSIONS.PLATFORM_ORGANIZATIONS_MANAGE)
  return <AdminShell initialLanguage={locale} canProvisionSites={canProvisionSites}>{children}</AdminShell>
}
