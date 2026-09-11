import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {cache} from 'react'
import { getPublishedPage,getPublicSeoContext,getRequestSiteOrigin } from '@/lib/cms/public-runtime'
import type {PublicPagePayload} from '@/lib/cms/public-runtime'
import PublicPageView,{publicText} from '@/app/components/PublicPageView'

export const dynamic = 'force-dynamic'

const getPublicPageRequestData=cache(async(slug:string)=>Promise.all([
  getPublishedPage(slug),
  getRequestSiteOrigin(),
  getPublicSeoContext(),
]))

function canonicalPageUrl(origin:string,hostname:string,slug:string){
  const protocol=origin.startsWith('http://')?'http':'https'
  return`${protocol}://${hostname}/${encodeURIComponent(slug)}`
}

function publicPageJsonLd(payload:PublicPagePayload,canonical:string){
  const seo=payload.page.seo||{}
  const name=publicText(seo.title||seo.metaTitle)||payload.page.title
  const description=publicText(seo.description||seo.metaDescription)||undefined
  const websiteUrl=new URL('/',canonical).toString()
  const websiteId=`${websiteUrl}#website`
  return{
    '@context':'https://schema.org',
    '@graph':[
      {'@type':'WebSite','@id':websiteId,url:websiteUrl,name:payload.site.name,inLanguage:payload.site.locale},
      {'@type':'WebPage','@id':`${canonical}#webpage`,url:canonical,name,...(description?{description}:{}),inLanguage:payload.site.locale,isPartOf:{'@id':websiteId},...(payload.page.published_at?{datePublished:payload.page.published_at}:{})},
    ],
  }
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const{slug}=await params
  const[payload,requestOrigin,seoContext]=await getPublicPageRequestData(slug)
  if(!payload)return{title:'این صفحه موجود نیست.'}
  const seo=payload.page.seo||{}
  const title=publicText(seo.title||seo.metaTitle)||payload.page.title
  const description=publicText(seo.description||seo.metaDescription)||undefined
  const canonical=requestOrigin&&seoContext.canonicalHostname?canonicalPageUrl(requestOrigin,seoContext.canonicalHostname,payload.page.slug):undefined
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
  const[payload,requestOrigin,seoContext]=await getPublicPageRequestData(slug)
  if(!payload)notFound()
  const canonical=requestOrigin&&seoContext.canonicalHostname?canonicalPageUrl(requestOrigin,seoContext.canonicalHostname,payload.page.slug):null
  const jsonLd=canonical?publicPageJsonLd(payload,canonical):null
  return <>{jsonLd?<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd).replace(/</g,'\\u003c')}}/>:null}<PublicPageView payload={payload}/></>
}
