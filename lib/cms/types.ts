export type PublishStatus = 'draft' | 'published' | 'hidden' | 'scheduled'
export type LeadStatus = 'new' | 'in_progress' | 'replied' | 'closed' | 'spam'
export type RoleKey = 'super_admin' | 'admin' | 'content_manager' | 'crm' | 'viewer'

export type Permission =
  | 'content.read' | 'content.create' | 'content.update' | 'content.delete' | 'content.publish'
  | 'media.read' | 'media.create' | 'media.update' | 'media.delete'
  | 'leads.read' | 'leads.update' | 'leads.assign'
  | 'users.read' | 'users.create' | 'users.update' | 'users.delete'
  | 'settings.read' | 'settings.update' | 'audit.read'

export interface SeoFields {
  metaTitle?: string
  metaDescription?: string
  canonicalUrl?: string
  ogImageId?: string
  noIndex?: boolean
}

export interface CmsBlock {
  id: string
  type: 'hero' | 'heading' | 'rich_text' | 'image' | 'gallery' | 'cta' | 'services' | 'projects' | 'clients' | 'contact_form' | 'custom'
  visible: boolean
  order: number
  data: Record<string, unknown>
}

export interface CmsPage {
  id: string
  title: string
  slug: string
  status: PublishStatus
  blocks: CmsBlock[]
  seo: SeoFields
  publishedAt?: string
  scheduledAt?: string
}

export interface MediaAsset {
  id: string
  fileName: string
  path: string
  mimeType: string
  altText: string
  width?: number
  height?: number
  sizeBytes?: number
  variants?: Record<string, string>
}
