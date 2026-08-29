import type {Metadata} from 'next'
import {notFound,redirect} from 'next/navigation'
import PublicPageView from '@/app/components/PublicPageView'
import {PERMISSIONS} from '@/lib/authz/permissions'
import type {PublicPagePayload} from '@/lib/cms/public-runtime'
import {authorizeSiteFeature,FeatureAccessError} from '@/lib/entitlements/runtime'
import {createClient} from '@/lib/supabase/server'

export const dynamic='force-dynamic'
export const metadata:Metadata={title:'RAVA Draft Preview',robots:{index:false,follow:false}}

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{}

export default async function SiteDraftPreview({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{page?:string}>}){
  const {id}=await params
  if(!UUID_RE.test(id))notFound()
  const {page:requestedPage}=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  if(!claims?.claims?.sub)redirect(`/login?next=${encodeURIComponent(`/preview/sites/${id}`)}`)
  const {data:site}=await supabase.from('sites').select('id,name,primary_locale,theme_config').eq('id',id).maybeSingle()
  if(!site)notFound()
  try{
    await authorizeSiteFeature({siteId:id,moduleKey:'cms',permissions:[PERMISSIONS.PLATFORM_SITES_MANAGE,PERMISSIONS.DESIGN_MANAGE,PERMISSIONS.CMS_VIEW,PERMISSIONS.CMS_MANAGE],route:`/preview/sites/${id}`,operation:'draft.preview'})
  }catch(error){if(error instanceof FeatureAccessError)notFound();throw error}
  const [{data:pages},{data:state}]=await Promise.all([
    supabase.from('pages').select('id,title,slug,seo,published_at,created_at').eq('site_id',id).order('created_at',{ascending:true}),
    supabase.from('site_design_state').select('current_revision_id,current_template_id').eq('site_id',id).maybeSingle(),
  ])
  if(!pages?.length)notFound()
  const selected=(requestedPage&&UUID_RE.test(requestedPage)?pages.find((item)=>item.id===requestedPage):null)??pages.find((item)=>item.slug==='home')??pages[0]
  const [{data:blocks},{data:revision},{data:template}]=await Promise.all([
    supabase.from('page_blocks').select('id,block_type,position,data').eq('page_id',selected.id).eq('visible',true).order('position',{ascending:true}),
    state?.current_revision_id?supabase.from('site_design_revisions').select('theme_config,layout_config').eq('id',state.current_revision_id).eq('site_id',id).maybeSingle():Promise.resolve({data:null}),
    state?.current_template_id?supabase.from('template_catalog').select('key').eq('id',state.current_template_id).maybeSingle():Promise.resolve({data:null}),
  ])
  const payload:PublicPagePayload={site:{id:site.id,name:site.name,locale:site.primary_locale||'fa',theme:object(revision?.theme_config??site.theme_config),templateKey:template?.key||'rava-service-minimal',layout:object(revision?.layout_config)},page:{id:selected.id,title:selected.title,slug:selected.slug,seo:object(selected.seo),published_at:selected.published_at},blocks:(blocks??[]).map((block)=>({id:block.id,type:block.block_type,position:block.position,data:object(block.data)}))}
  return <PublicPageView payload={payload} navigation={pages.map((page)=>({id:page.id,title:page.title,slug:page.slug}))} previewBasePath={`/preview/sites/${id}`}/>
}
