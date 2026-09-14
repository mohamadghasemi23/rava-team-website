import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const supabase = await createClient()
  const [{ data: projects }, { data: services }] = await Promise.all([
    supabase.from('projects').select('slug,updated_at').eq('published', true),
    supabase.from('services').select('slug,updated_at').eq('published', true),
  ])

  const staticRoutes = ['', '/work', '/services', '/about', '/contact'].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'weekly' as const : 'monthly' as const,
    priority: path === '' ? 1 : 0.8,
  }))

  const projectRoutes = (projects ?? []).map((item) => ({
    url: `${base}/work/${item.slug}`,
    lastModified: item.updated_at ? new Date(item.updated_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const serviceRoutes = (services ?? []).map((item) => ({
    url: `${base}/services/${item.slug}`,
    lastModified: item.updated_at ? new Date(item.updated_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...projectRoutes, ...serviceRoutes]
}
