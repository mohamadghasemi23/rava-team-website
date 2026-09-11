import type {MetadataRoute} from 'next'
import {getRequestSiteOrigin} from '@/lib/cms/public-runtime'

export const dynamic='force-dynamic'

export default async function robots():Promise<MetadataRoute.Robots>{
  const origin=await getRequestSiteOrigin()
  return{
    rules:{userAgent:'*',allow:'/',disallow:['/admin/','/api/','/auth/','/login','/preview/','/design-preview/']},
    sitemap:origin?`${origin}/sitemap.xml`:undefined,
    host:origin??undefined,
  }
}
