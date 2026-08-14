'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AdminActionState = {
  ok?: boolean
  message?: string
  redirectTo?: string
  nonce?: number
}

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

function errorMessage(error: { code?: string; message?: string } | null, fallback: string) {
  if (!error) return fallback
  if (error.code === '23505') return 'این آدرس صفحه قبلاً استفاده شده است. یک آدرس دیگر انتخاب کنید.'
  return error.message ? `خطای سرور: ${error.message}` : fallback
}

export async function createPage(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const { supabase, userId } = await getEditor()
  const title = String(formData.get('title') ?? '').trim()
  const slug = cleanSlug(String(formData.get('slug') ?? ''))
  if (!title || !slug) return { ok: false, message: 'عنوان و آدرس صفحه الزامی است.', nonce: Date.now() }

  const { data, error } = await supabase
    .from('pages')
    .insert({ title, slug, status: 'draft', created_by: userId, updated_by: userId })
    .select('id')
    .single()

  if (error || !data) return { ok: false, message: errorMessage(error, 'ساخت صفحه انجام نشد.'), nonce: Date.now() }

  revalidatePath('/admin')
  revalidatePath('/admin/pages')
  return {
    ok: true,
    message: `صفحه «${title}» با موفقیت ساخته شد.`,
    redirectTo: `/admin/pages/${data.id}`,
    nonce: Date.now(),
  }
}

export async function updatePage(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const { supabase, userId } = await getEditor()
  const id = String(formData.get('id') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  const slug = cleanSlug(String(formData.get('slug') ?? ''))
  const status = String(formData.get('status') ?? 'draft')
  const seoTitle = String(formData.get('seo_title') ?? '').trim()
  const seoDescription = String(formData.get('seo_description') ?? '').trim()

  if (!id || !title || !slug || !['draft', 'published', 'hidden', 'scheduled'].includes(status)) {
    return { ok: false, message: 'اطلاعات فرم کامل یا معتبر نیست.', nonce: Date.now() }
  }

  const { data, error } = await supabase
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
    .select('id')
    .single()

  if (error || !data) return { ok: false, message: errorMessage(error, 'ویرایش صفحه انجام نشد.'), nonce: Date.now() }

  revalidatePath('/admin')
  revalidatePath('/admin/pages')
  revalidatePath(`/admin/pages/${id}`)
  revalidatePath(`/${slug}`)
  return { ok: true, message: `تغییرات صفحه «${title}» با موفقیت ذخیره شد.`, nonce: Date.now() }
}

export async function setPageStatus(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const { supabase, userId } = await getEditor()
  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!id || !['draft', 'published', 'hidden'].includes(status)) {
    return { ok: false, message: 'وضعیت انتخاب‌شده معتبر نیست.', nonce: Date.now() }
  }

  const { error } = await supabase
    .from('pages')
    .update({
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { ok: false, message: errorMessage(error, 'تغییر وضعیت صفحه انجام نشد.'), nonce: Date.now() }

  revalidatePath('/admin')
  revalidatePath('/admin/pages')
  return {
    ok: true,
    message: status === 'published' ? 'صفحه با موفقیت منتشر شد.' : status === 'hidden' ? 'صفحه با موفقیت مخفی شد.' : 'صفحه به پیش‌نویس منتقل شد.',
    nonce: Date.now(),
  }
}

export async function deletePage(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const { supabase } = await getEditor()
  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, message: 'شناسه صفحه معتبر نیست.', nonce: Date.now() }

  const { data: page } = await supabase.from('pages').select('title').eq('id', id).single()

  const { error: blocksError } = await supabase.from('page_blocks').delete().eq('page_id', id)
  if (blocksError) return { ok: false, message: errorMessage(blocksError, 'حذف محتوای صفحه انجام نشد.'), nonce: Date.now() }

  const { error } = await supabase.from('pages').delete().eq('id', id)
  if (error) return { ok: false, message: errorMessage(error, 'حذف صفحه انجام نشد.'), nonce: Date.now() }

  revalidatePath('/admin')
  revalidatePath('/admin/pages')
  return {
    ok: true,
    message: `صفحه${page?.title ? ` «${page.title}»` : ''} با موفقیت حذف شد.`,
    redirectTo: '/admin/pages',
    nonce: Date.now(),
  }
}
