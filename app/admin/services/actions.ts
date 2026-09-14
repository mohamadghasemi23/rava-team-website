'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireRavaStaff } from '@/lib/auth/require-staff'

function text(formData: FormData, key: string, max = 5000) {
  return String(formData.get(key) ?? '').trim().slice(0, max)
}

function slug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
}

function intValue(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function createService(formData: FormData): Promise<void> {
  const { supabase } = await requireRavaStaff()
  const title = text(formData, 'title', 160)
  const serviceSlug = slug(text(formData, 'slug', 140) || title)
  if (!title || !serviceSlug) throw new Error('عنوان و slug سرویس الزامی است.')

  const result = await supabase.from('services').insert({
    title,
    slug: serviceSlug,
    summary: text(formData, 'summary', 600),
    content: { body: text(formData, 'body', 20000) },
    icon_key: text(formData, 'icon_key', 80) || null,
    sort_order: intValue(text(formData, 'sort_order', 6)),
    published: formData.get('published') === 'on',
    seo_title: text(formData, 'seo_title', 180) || null,
    seo_description: text(formData, 'seo_description', 320) || null,
    canonical_url: text(formData, 'canonical_url', 500) || null,
  }).select('id').single()

  if (result.error || !result.data) throw new Error('ثبت سرویس انجام نشد.')
  revalidatePath('/admin/services')
  revalidatePath('/')
  redirect(`/admin/services/${result.data.id}`)
}

export async function updateService(id: string, formData: FormData): Promise<void> {
  const { supabase } = await requireRavaStaff()
  const title = text(formData, 'title', 160)
  const serviceSlug = slug(text(formData, 'slug', 140) || title)
  if (!title || !serviceSlug) throw new Error('عنوان و slug سرویس الزامی است.')

  const result = await supabase.from('services').update({
    title,
    slug: serviceSlug,
    summary: text(formData, 'summary', 600),
    content: { body: text(formData, 'body', 20000) },
    icon_key: text(formData, 'icon_key', 80) || null,
    sort_order: intValue(text(formData, 'sort_order', 6)),
    published: formData.get('published') === 'on',
    seo_title: text(formData, 'seo_title', 180) || null,
    seo_description: text(formData, 'seo_description', 320) || null,
    canonical_url: text(formData, 'canonical_url', 500) || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (result.error) throw new Error('ویرایش سرویس انجام نشد.')
  revalidatePath('/admin/services')
  revalidatePath(`/admin/services/${id}`)
  revalidatePath('/')
}
