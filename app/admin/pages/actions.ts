'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function getEditor() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', userId)
    .single()

  if (!profile?.active || !['super_admin', 'admin', 'content_manager'].includes(profile.role)) {
    redirect('/admin')
  }

  return { supabase, userId }
}

function cleanSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06ff-]/g, '')
}

export async function createPage(formData: FormData) {
  const { supabase, userId } = await getEditor()
  const title = String(formData.get('title') ?? '').trim()
  const slug = cleanSlug(String(formData.get('slug') ?? ''))
  if (!title || !slug) return

  const { data, error } = await supabase
    .from('pages')
    .insert({ title, slug, status: 'draft', created_by: userId, updated_by: userId })
    .select('id')
    .single()

  if (error || !data) return
  revalidatePath('/admin')
  revalidatePath('/admin/pages')
  redirect(`/admin/pages/${data.id}`)
}

export async function updatePage(formData: FormData) {
  const { supabase, userId } = await getEditor()
  const id = String(formData.get('id') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  const slug = cleanSlug(String(formData.get('slug') ?? ''))
  const status = String(formData.get('status') ?? 'draft')
  const seoTitle = String(formData.get('seo_title') ?? '').trim()
  const seoDescription = String(formData.get('seo_description') ?? '').trim()
  if (!id || !title || !slug || !['draft', 'published', 'hidden', 'scheduled'].includes(status)) return

  await supabase
    .from('pages')
    .update({
      title,
      slug,
      status,
      seo: { title: seoTitle, description: seoDescription },
      published_at: status === 'published' ? new Date().toISOString() : null,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  revalidatePath('/admin')
  revalidatePath('/admin/pages')
  revalidatePath(`/admin/pages/${id}`)
}

export async function setPageStatus(formData: FormData) {
  const { supabase, userId } = await getEditor()
  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!id || !['draft', 'published', 'hidden'].includes(status)) return

  await supabase
    .from('pages')
    .update({
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  revalidatePath('/admin')
  revalidatePath('/admin/pages')
}

export async function deletePage(formData: FormData) {
  const { supabase } = await getEditor()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  await supabase.from('pages').delete().eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/admin/pages')
  redirect('/admin/pages')
}
