import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublishedPage,getPublicSeoContext,getRequestSiteOrigin } from '@/lib/cms/public-runtime'
import PublicPageView,{publicText} from '@/app/components/PublicPageView'

export const dynamic = 'force-dynamic'

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const{slug}=await params
  const [payload,requestOrigin,seoContext]=await Promise.all([getPublishedPage(slug),getRequestSiteOrigin(),getPublicSeoContext()])
  if(!payload)return{title:'این صفحه موجود نیست.'}
  const seo=payload.page.seo||{}
  const title=publicText(seo.title||seo.metaTitle)||payload.page.title
  const description=publicText(seo.description||seo.metaDescription)||undefined
  const protocol=requestOrigin?.startsWith('http://')?'http':'https'
  const canonical=seoContext.canonicalHostname?`${protocol}://${seoContext.canonicalHostname}/${encodeURIComponent(payload.page.slug)}`:undefined
  return{
    title,
    description,
    alternates:canonical?{canonical}:undefined,
    robots:seo.noIndex?{index:false,follow:false,nocache:true}:{index:true,follow:true},
    openGraph:{title,description,url:canonical,siteName:payload.site.name,locale:payload.site.locale,type:'website'},
    twitter:{card:'summary_large_image',title,description},
  }
}

export default async function PublicCmsPage({params}:{params:Promise<{slug:string}>}){
  const{slug}=await params
  const payload=await getPublishedPage(slug)
  if(!payload)notFound()
  return <PublicPageView payload={payload}/>
}
