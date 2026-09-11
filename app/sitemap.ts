import type {MetadataRoute} from 'next'
import {getPublicSeoContext,getRequestSiteOrigin} from '@/lib/cms/public-runtime'

export const dynamic='force-dynamic'

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const [requestOrigin,context]=await Promise.all([getRequestSiteOrigin(),getPublicSeoContext()])
  if(!requestOrigin||!context.canonicalHostname)return[]
  const protocol=requestOrigin.startsWith('http://')?'http':'https',origin=`${protocol}://${context.canonicalHostname}`
  return context.pages.map(page=>({
    url:`${origin}/${encodeURIComponent(page.slug)}`,
    lastModified:page.updatedAt?new Date(page.updatedAt):undefined,
    changeFrequency:'weekly' as const,
    priority:page.slug==='home'?1:.7,
  }))
}
