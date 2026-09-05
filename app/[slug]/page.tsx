import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublishedPage } from '@/lib/cms/public-runtime'
import PublicPageView,{publicText} from '@/app/components/PublicPageView'

export const dynamic = 'force-dynamic'

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const{slug}=await params
  const payload=await getPublishedPage(slug)
  if(!payload)return{title:'این صفحه موجود نیست.'}
  const seo=payload.page.seo||{}
  return{title:publicText(seo.title||seo.metaTitle)||payload.page.title,description:publicText(seo.description||seo.metaDescription)||undefined,robots:seo.noIndex?{index:false,follow:false}:undefined}
}

export default async function PublicCmsPage({params}:{params:Promise<{slug:string}>}){
  const{slug}=await params
  const payload=await getPublishedPage(slug)
  if(!payload)notFound()
  return <PublicPageView payload={payload}/>
}
