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

function lines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 20)
}

function intOrNull(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

export async function createProject(formData: FormData): Promise<void> {
  const { supabase } = await requireRavaStaff()
  const title = text(formData, 'title', 160)
  const projectSlug = slug(text(formData, 'slug', 140) || title)
  if (!title || !projectSlug) throw new Error('عنوان و slug پروژه الزامی است.')

  const result = await supabase.from('projects').insert({
    title,
    slug: projectSlug,
    project_kind: formData.get('project_kind') === 'concept' ? 'concept' : 'real',
    published: formData.get('published') === 'on',
    summary: text(formData, 'summary', 600),
    content: { body: text(formData, 'body', 20000) },
    client_name: text(formData, 'client_name', 160) || null,
    project_year: intOrNull(text(formData, 'project_year', 4)),
    role_text: text(formData, 'role_text', 300) || null,
    scope: lines(text(formData, 'scope', 2000)),
    kpis: lines(text(formData, 'kpis', 2000)),
    featured: formData.get('featured') === 'on',
    show_on_home: formData.get('show_on_home') === 'on',
    sort_order: intOrNull(text(formData, 'sort_order', 6)) ?? 0,
    seo_title: text(formData, 'seo_title', 180) || null,
    seo_description: text(formData, 'seo_description', 320) || null,
    canonical_url: text(formData, 'canonical_url', 500) || null,
  }).select('id').single()

  if (result.error || !result.data) throw new Error('ثبت پروژه انجام نشد.')
  revalidatePath('/admin/projects')
  revalidatePath('/')
  redirect(`/admin/projects/${result.data.id}`)
}

export async function updateProject(id: string, formData: FormData): Promise<void> {
  const { supabase } = await requireRavaStaff()
  const title = text(formData, 'title', 160)
  const projectSlug = slug(text(formData, 'slug', 140) || title)
  if (!title || !projectSlug) throw new Error('عنوان و slug پروژه الزامی است.')

  const result = await supabase.from('projects').update({
    title,
    slug: projectSlug,
    project_kind: formData.get('project_kind') === 'concept' ? 'concept' : 'real',
    published: formData.get('published') === 'on',
    summary: text(formData, 'summary', 600),
    content: { body: text(formData, 'body', 20000) },
    client_name: text(formData, 'client_name', 160) || null,
    project_year: intOrNull(text(formData, 'project_year', 4)),
    role_text: text(formData, 'role_text', 300) || null,
    scope: lines(text(formData, 'scope', 2000)),
    kpis: lines(text(formData, 'kpis', 2000)),
    featured: formData.get('featured') === 'on',
    show_on_home: formData.get('show_on_home') === 'on',
    sort_order: intOrNull(text(formData, 'sort_order', 6)) ?? 0,
    seo_title: text(formData, 'seo_title', 180) || null,
    seo_description: text(formData, 'seo_description', 320) || null,
    canonical_url: text(formData, 'canonical_url', 500) || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (result.error) throw new Error('ویرایش پروژه انجام نشد.')
  revalidatePath('/admin/projects')
  revalidatePath(`/admin/projects/${id}`)
  revalidatePath('/')
}
