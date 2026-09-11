import {createClient} from '@/lib/supabase/server'
import {hasPermission,PERMISSIONS,type PermissionKey} from '@/lib/authz/permissions'

const LAUNCHPAD_TEMPLATE_KEY='rava-service-living-system'
const PLATFORM_OPERATOR_PERMISSIONS=[
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

export type CustomerCapabilityManifest={
  identity:{name:string;role:{fa:string;en:string};initials:string}
  site:{id:string;organizationId:string;name:string}
  template:{key:string;name:{fa:string;en:string}}|null
  permissions:{
    pagesView:boolean
    pagesManage:boolean
    pagesPublish:boolean
    mediaManage:boolean
    leadsView:boolean
    leadsManage:boolean
    seoManage:boolean
    helpView:boolean
  }
  entitlements:{commerce:boolean;analytics:boolean}
  destination:string
}

async function permission(
  permissionKey:PermissionKey,
  organizationId:string,
  siteId:string,
){
  const supabase=await createClient()
  const{data,error}=await supabase.rpc('has_permission',{
    required_permission:permissionKey,
    organization_scope:organizationId,
    site_scope:siteId,
  })
  return !error&&data===true
}

export async function resolveCustomerCapabilityManifest():Promise<CustomerCapabilityManifest|null>{
  const supabase=await createClient()
  const{data:claimsData,error:claimsError}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(claimsError||!userId)return null

  const{data:profile}=await supabase.from('profiles').select('active,display_name,role').eq('id',userId).maybeSingle()
  if(!profile?.active)return null

  const{data:sites}=await supabase
    .from('sites')
    .select('id,organization_id,name')
    .in('status',['draft','active'])
    .order('created_at',{ascending:true})
    .limit(1)
  const site=sites?.[0]
  if(!site)return null

  const scope=[site.organization_id,site.id] as const
  const[
    launchPadResult,
    pagesView,
    pagesManage,
    pagesPublish,
    mediaManage,
    leadsView,
    leadsManage,
    seoManage,
    helpView,
    entitlementsResult,
  ]=await Promise.all([
    supabase.rpc('has_template_workspace_access',{p_site_id:site.id,p_template_key:LAUNCHPAD_TEMPLATE_KEY}),
    permission(PERMISSIONS.CMS_VIEW,...scope),
    permission(PERMISSIONS.CMS_MANAGE,...scope),
    permission(PERMISSIONS.CMS_PUBLISH,...scope),
    permission(PERMISSIONS.MEDIA_MANAGE,...scope),
    permission(PERMISSIONS.LEADS_VIEW,...scope),
    permission(PERMISSIONS.LEADS_MANAGE,...scope),
    permission(PERMISSIONS.SEO_MANAGE,...scope),
    permission(PERMISSIONS.HELP_VIEW,...scope),
    supabase.from('site_entitlements').select('module_key,status,enabled').eq('site_id',site.id),
  ])

  if(!pagesView&&!pagesManage)return null

  const entitlementEnabled=(moduleKey:string)=>Boolean(entitlementsResult.data?.some(item=>
    item.module_key===moduleKey&&item.enabled&&['active','trial','grace'].includes(item.status),
  ))
  const hasLaunchPad=!launchPadResult.error&&launchPadResult.data===true
  return{
    identity:{
      name:String(profile.display_name??'').trim()||'RAVA user',
      role:{fa:'مدیر سایت',en:'Site manager'},
      initials:(String(profile.display_name??'').trim()||'RAVA user').split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase(),
    },
    site:{id:site.id,organizationId:site.organization_id,name:site.name},
    template:hasLaunchPad?{key:LAUNCHPAD_TEMPLATE_KEY,name:{fa:'لانچ‌پد راوا',en:'RAVA LaunchPad'}}:null,
    permissions:{pagesView,pagesManage,pagesPublish,mediaManage,leadsView,leadsManage,seoManage,helpView},
    entitlements:{commerce:entitlementEnabled('commerce'),analytics:entitlementEnabled('analytics')},
    destination:'/admin',
  }
}

export async function canAccessAdminLearning(){
  if(await hasPermission(PERMISSIONS.PLATFORM_HELP_MANAGE))return true
  const manifest=await resolveCustomerCapabilityManifest()
  return manifest?.permissions.helpView===true
}

export async function resolveIsPlatformOperator(){
  const decisions=await Promise.all(PLATFORM_OPERATOR_PERMISSIONS.map(permissionKey=>hasPermission(permissionKey)))
  return decisions.some(Boolean)
}
