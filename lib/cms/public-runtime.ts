import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type PublicBlock = {
  id: string
  type: string
  position: number
  data: Record<string, unknown>
}

export type PublicPagePayload = {
  site: { id: string; name: string; locale: string; theme: Record<string, unknown> }
  page: { id: string; title: string; slug: string; seo: Record<string, unknown>; published_at: string | null }
  blocks: PublicBlock[]
}

function normalizedHostname(value: string) {
  const first = value.split(',')[0]?.trim().toLowerCase().replace(/\.$/, '') ?? ''
  const hostname = first.startsWith('[') ? first.slice(1, first.indexOf(']')) : first.split(':')[0]
  return hostname.length <= 253 && hostname.length > 0 && !/[\s\/:?#]/.test(hostname) ? hostname : ''
}

function normalizedSlug(value: string) {
  const slug = value.trim().toLowerCase().replace(/^\/+|\/+$/g, '')
  return slug.length <= 180 && slug.length > 0 && !/[\/\\?#\s]/.test(slug) ? slug : ''
}

export async function getRequestSiteHostname() {
  const requestHeaders = await headers()
  return normalizedHostname(
    process.env.RAVA_PUBLIC_SITE_HOSTNAME
      || requestHeaders.get('x-forwarded-host')
      || requestHeaders.get('host')
      || '',
  )
}

export async function getPublishedPage(slugInput: string): Promise<PublicPagePayload | null> {
  const hostname = await getRequestSiteHostname()
  const slug = normalizedSlug(slugInput)
  if (!hostname || !slug) return null

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_published_page', { p_hostname: hostname, p_slug: slug })
  if (error) {
    const errorId = crypto.randomUUID()
    console.error(JSON.stringify({ event: 'cms.public.resolve_failed', errorId }))
    return null
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const payload = data as unknown as PublicPagePayload
  if (!payload.site?.id || !payload.page?.id || !Array.isArray(payload.blocks)) return null
  return payload
}
