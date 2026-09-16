import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { publicProjectFallbacks, publicServiceFallbacks } from '@/lib/public-fallbacks'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const now = new Date()

  const staticRoutes = ['', '/work', '/services', '/about', '/contact'].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'weekly' as const : 'monthly' as const,
    priority: path === '' ? 1 : 0.8,
  }))

  try {
    const supabase = await createClient()
    const [{ data: projects }, { data: services }] = await Promise.all([
      supabase.from('projects').select('slug,updated_at').eq('published', true),
      supabase.from('services').select('slug,updated_at').eq('published', true),
    ])

    const projectSource = projects?.length ? projects : publicProjectFallbacks.map((item) => ({ slug:item.slug, updated_at:null }))
    const serviceSource = services?.length ? services : publicServiceFallbacks.map((item) => ({ slug:item.slug, updated_at:null }))

    const projectRoutes = projectSource.map((item) => ({
      url: `${base}/work/${item.slug}`,
      lastModified: item.updated_at ? new Date(item.updated_at) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

    const serviceRoutes = serviceSource.map((item) => ({
      url: `${base}/services/${item.slug}`,
      lastModified: item.updated_at ? new Date(item.updated_at) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

    return [...staticRoutes, ...projectRoutes, ...serviceRoutes]
  } catch {
    const projectRoutes = publicProjectFallbacks.map((item) => ({ url:`${base}/work/${item.slug}`, lastModified:now, changeFrequency:'monthly' as const, priority:0.7 }))
    const serviceRoutes = publicServiceFallbacks.map((item) => ({ url:`${base}/services/${item.slug}`, lastModified:now, changeFrequency:'monthly' as const, priority:0.7 }))
    return [...staticRoutes, ...projectRoutes, ...serviceRoutes]
  }
}
