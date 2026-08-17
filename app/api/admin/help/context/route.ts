import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function matchRoute(pattern:string,path:string){
  const p=pattern.split('/').filter(Boolean)
  const a=path.split('/').filter(Boolean)
  for(let i=0,j=0;i<p.length;i++,j++){
    const token=p[i]
    if(token==='*')return true
    if(token.endsWith('*')){
      const prefix=token.slice(0,-1)
      return a.slice(j).join('/').startsWith(prefix)
    }
    if(j>=a.length)return false
    if(token.startsWith(':'))continue
    if(token!==a[j])return false
  }
  return p.length===a.length
}

async function resolveScope(path:string,supabase:Awaited<ReturnType<typeof createClient>>){
  const parts=path.split('/').filter(Boolean)
  const sitesIndex=parts.indexOf('sites')
  if(sitesIndex>=0){
    const candidate=parts[sitesIndex+1]
    if(candidate&&UUID_RE.test(candidate)){
      const {data:site}=await supabase.from('sites').select('id,organization_id').eq('id',candidate).maybeSingle()
      if(site)return {organizationId:site.organization_id as string,siteId:site.id as string}
    }
  }

  const billingIndex=parts.indexOf('billing')
  if(billingIndex>=0){
    const candidate=parts[billingIndex+1]
    if(candidate&&UUID_RE.test(candidate)){
      const {data:contract}=await supabase.from('customer_contracts').select('organization_id').eq('id',candidate).maybeSingle()
      if(contract)return {organizationId:contract.organization_id as string,siteId:null}
    }
  }

  return {organizationId:null as string|null,siteId:null as string|null}
}

async function hasPermission(
  supabase:Awaited<ReturnType<typeof createClient>>,
  permission:string,
  organizationId:string|null,
  siteId:string|null,
){
  const {data,error}=await supabase.rpc('has_permission',{
    required_permission:permission,
    organization_scope:organizationId,
    site_scope:siteId,
  })
  return !error&&data===true
}

async function permissionInAnyOwnedScope(
  supabase:Awaited<ReturnType<typeof createClient>>,
  userId:string,
  permission:string,
){
  if(await hasPermission(supabase,permission,null,null))return true
  const {data:memberships}=await supabase
    .from('memberships')
    .select('organization_id,site_id')
    .eq('user_id',userId)
    .eq('status','active')
    .limit(50)
  for(const membership of memberships??[]){
    if(await hasPermission(
      supabase,
      permission,
      (membership.organization_id as string|null)??null,
      (membership.site_id as string|null)??null,
    ))return true
  }
  return false
}

async function audienceAllowed(
  supabase:Awaited<ReturnType<typeof createClient>>,
  audience:string,
  minimumPermissionAllowed:boolean,
){
  if(audience==='all')return true
  if(audience==='owner'){
    return await hasPermission(supabase,'platform.help.manage',null,null)
      ||await hasPermission(supabase,'platform.sites.manage',null,null)
      ||await hasPermission(supabase,'platform.billing.manage',null,null)
  }
  if(audience==='admin')return minimumPermissionAllowed
  return minimumPermissionAllowed
}

export async function GET(request:NextRequest){
  const path=request.nextUrl.searchParams.get('path')??''
  const locale=request.nextUrl.searchParams.get('locale')==='en'?'en':'fa'
  if(!path.startsWith('/admin')||path.length>512)return NextResponse.json({topic:null},{status:400})

  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)return NextResponse.json({topic:null},{status:401})

  const {data:bindings}=await supabase
    .from('help_context_bindings')
    .select('topic_id,route_pattern,context_key,priority')
    .order('priority')
    .limit(300)
  const binding=(bindings??[]).find(item=>matchRoute(String(item.route_pattern),path))
  if(!binding)return NextResponse.json({topic:null})

  const {data:topic}=await supabase
    .from('help_topics')
    .select('id,key,category,audience,estimated_minutes,minimum_permission,status')
    .eq('id',binding.topic_id)
    .eq('status','published')
    .maybeSingle()
  if(!topic)return NextResponse.json({topic:null})

  const scope=await resolveScope(path,supabase)
  let minimumPermissionAllowed=true
  if(topic.minimum_permission){
    minimumPermissionAllowed=scope.organizationId||scope.siteId
      ? await hasPermission(supabase,String(topic.minimum_permission),scope.organizationId,scope.siteId)
      : await permissionInAnyOwnedScope(supabase,String(userId),String(topic.minimum_permission))
  }
  if(!minimumPermissionAllowed)return NextResponse.json({topic:null},{status:403})
  if(!await audienceAllowed(supabase,String(topic.audience??'all'),minimumPermissionAllowed)){
    return NextResponse.json({topic:null},{status:403})
  }

  const {data:tr}=await supabase
    .from('help_translations')
    .select('locale,title,summary,body_markdown,example_markdown,steps,warnings,version')
    .eq('topic_id',topic.id)
    .eq('locale',locale)
    .maybeSingle()

  return NextResponse.json(
    {topic:{...topic,translation:tr,contextKey:binding.context_key}},
    {headers:{'Cache-Control':'private, no-store'}},
  )
}
