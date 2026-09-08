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
import {resolveCustomerCapabilityManifest,resolveIsPlatformOperator} from '@/lib/admin/customer-capabilities'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale=await getAdminLocale()
  const [canProvisionSites,isPlatformOperator]=await Promise.all([
    hasPermission(PERMISSIONS.PLATFORM_ORGANIZATIONS_MANAGE),
    resolveIsPlatformOperator(),
  ])
  let customerWorkspace:null|{
    identity:{name:string;role:{fa:string;en:string};initials:string}
    siteId:string
    siteName:string
    templateName:{fa:string;en:string}
    templateKey:string|null
    homeHref:string
    canViewPages:boolean
    canManageMedia:boolean
    canViewMessages:boolean
    canViewHelp:boolean
  }=null
  if(!isPlatformOperator){
    const manifest=await resolveCustomerCapabilityManifest()
    if(manifest){
      customerWorkspace={
        identity:manifest.identity,
        siteId:manifest.site.id,
        siteName:manifest.site.name,
        templateName:manifest.template?.name??{fa:manifest.site.name,en:manifest.site.name},
        templateKey:manifest.template?.key??null,
        homeHref:manifest.destination,
        canViewPages:manifest.permissions.pagesView||manifest.permissions.pagesManage,
        canManageMedia:manifest.permissions.mediaManage,
        canViewMessages:manifest.permissions.leadsView||manifest.permissions.leadsManage,
        canViewHelp:manifest.permissions.helpView,
      }
    }
  }
  return <AdminShell initialLanguage={locale} canProvisionSites={canProvisionSites} isPlatformOperator={isPlatformOperator} customerWorkspace={customerWorkspace}>{children}</AdminShell>
}
