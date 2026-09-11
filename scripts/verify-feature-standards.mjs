import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const registryPath=path.join(root,'config/feature-standards.json')
const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'))

if(registry.schemaVersion!==1||!Array.isArray(registry.features)){
  throw new Error('Invalid feature standards registry schema')
}

const requiredTrue=[
  'bilingualHelp',
  'serverValidation',
  'permissionEnforced',
  'auditLogged',
  'structuredErrors',
  'tenantScoped',
  'rlsOrSecureRpc',
]

const featureKeys=new Set()
const routes=new Set()
const errors=[]

function walk(dir){
  if(!fs.existsSync(dir))return []
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name)
    return entry.isDirectory()?walk(full):[full]
  })
}

const migrationText=walk(path.join(root,'supabase','migrations'))
  .filter(file=>file.endsWith('.sql'))
  .map(file=>fs.readFileSync(file,'utf8'))
  .join('\n')
const permissionText=fs.readFileSync(path.join(root,'lib','authz','permissions.ts'),'utf8')

for(const feature of registry.features){
  if(!feature.key||typeof feature.key!=='string')errors.push('Feature missing key')
  if(featureKeys.has(feature.key))errors.push(`Duplicate feature key: ${feature.key}`)
  featureKeys.add(feature.key)

  if(!feature.route||typeof feature.route!=='string')errors.push(`${feature.key}: missing route`)
  if(routes.has(feature.route)&&feature.route!=='/internal/entitlement-runtime')errors.push(`${feature.key}: duplicate route ${feature.route}`)
  routes.add(feature.route)

  if(!feature.helpKey||typeof feature.helpKey!=='string')errors.push(`${feature.key}: missing helpKey`)
  else if(!migrationText.includes(`'${feature.helpKey}'`))errors.push(`${feature.key}: helpKey not found in migrations: ${feature.helpKey}`)

  if(!Array.isArray(feature.permissions)||feature.permissions.length===0)errors.push(`${feature.key}: permissions must be non-empty`)
  for(const permission of feature.permissions??[]){
    if(!permissionText.includes(`'${permission}'`))errors.push(`${feature.key}: permission missing from permission registry: ${permission}`)
  }

  if(!feature.moduleKey||typeof feature.moduleKey!=='string')errors.push(`${feature.key}: missing moduleKey`)
  for(const flag of requiredTrue){
    if(feature[flag]!==true)errors.push(`${feature.key}: ${flag} must be true`)
  }
  if(feature.contextualHelp!==true&&feature.contextualHelp!==false)errors.push(`${feature.key}: contextualHelp must be boolean`)
  if(feature.entitlementRequired!==true&&feature.entitlementRequired!==false)errors.push(`${feature.key}: entitlementRequired must be boolean`)

  if(feature.entitlementRequired===true&&!['design','commerce','crm','automation','seo_ai','analytics_pro','booking','membership','loyalty','support'].includes(feature.moduleKey)){
    errors.push(`${feature.key}: entitlementRequired feature uses unexpected module ${feature.moduleKey}`)
  }
}

const dynamicAdminFeatureRoots=[
  ['design','design.engine'],
  ['commerce','commerce.core'],
]
for(const [folder,featureKey] of dynamicAdminFeatureRoots){
  const featureDir=path.join(root,'app','admin','platform','sites','[id]',folder)
  if(fs.existsSync(featureDir)&&!featureKeys.has(featureKey))errors.push(`Admin feature folder ${folder} is not registered`)
}

if(errors.length){
  console.error('\nRAVA feature standards verification failed:\n')
  for(const error of errors)console.error(`- ${error}`)
  process.exit(1)
}

console.log(`RAVA feature standards verified for ${registry.features.length} registered features.`)
