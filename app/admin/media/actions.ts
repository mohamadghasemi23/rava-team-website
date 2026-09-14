'use server'

import { revalidatePath } from 'next/cache'
import { requireRavaStaff } from '@/lib/auth/require-staff'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

export type MediaActionResult<T = undefined> =
  | { ok: true; message: string; data?: T }
  | { ok: false; message: string }

function signatureMatches(bytes: Uint8Array, mime: string) {
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mime === 'image/png') return bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index])
  if (mime === 'image/webp') return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  if (mime === 'image/avif') return String.fromCharCode(...bytes.slice(4, 12)).includes('ftyp')
  return false
}

function publicUrl(supabase: Awaited<ReturnType<typeof requireRavaStaff>>['supabase'], path: string) {
  return supabase.storage.from('rava-media').getPublicUrl(path).data.publicUrl
}

export async function uploadMedia(formData: FormData): Promise<MediaActionResult<Record<string, unknown>>> {
  const { supabase, user } = await requireRavaStaff()
  const file = formData.get('file')
  const altText = String(formData.get('altText') ?? '').trim().slice(0, 300)

  if (!(file instanceof File)) return { ok: false, message: 'فایل معتبر انتخاب نشده است.' }
  if (!MIME_EXTENSION[file.type]) return { ok: false, message: 'فقط JPG، PNG، WebP و AVIF مجاز هستند.' }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) return { ok: false, message: 'حجم تصویر باید حداکثر ۵ مگابایت باشد.' }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!signatureMatches(bytes.slice(0, 16), file.type)) return { ok: false, message: 'محتوای فایل با نوع تصویر اعلام‌شده مطابقت ندارد.' }

  const extension = MIME_EXTENSION[file.type]
  const storagePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`
  const upload = await supabase.storage.from('rava-media').upload(storagePath, bytes, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  })

  if (upload.error) return { ok: false, message: 'آپلود تصویر انجام نشد.' }

  const inserted = await supabase
    .from('media_assets')
    .insert({
      storage_path: storagePath,
      file_name: file.name.slice(0, 255),
      mime_type: file.type,
      alt_text: altText,
      size_bytes: file.size,
      uploaded_by: user.id,
    })
    .select('id,storage_path,file_name,mime_type,alt_text,size_bytes,created_at')
    .single()

  if (inserted.error || !inserted.data) {
    await supabase.storage.from('rava-media').remove([storagePath])
    return { ok: false, message: 'ثبت تصویر در کتابخانه انجام نشد.' }
  }

  revalidatePath('/admin/media')
  return {
    ok: true,
    message: 'تصویر با موفقیت آپلود شد.',
    data: { ...inserted.data, public_url: publicUrl(supabase, storagePath) },
  }
}

export async function updateMediaAlt(assetId: string, value: string): Promise<MediaActionResult> {
  const { supabase } = await requireRavaStaff()
  const altText = value.trim().slice(0, 300)
  const result = await supabase.from('media_assets').update({ alt_text: altText }).eq('id', assetId).is('deleted_at', null)
  if (result.error) return { ok: false, message: 'ویرایش Alt Text انجام نشد.' }
  revalidatePath('/admin/media')
  return { ok: true, message: 'Alt Text ذخیره شد.' }
}

export async function deleteMedia(assetId: string): Promise<MediaActionResult> {
  const { supabase } = await requireRavaStaff()
  const asset = await supabase.from('media_assets').select('storage_path').eq('id', assetId).is('deleted_at', null).single()
  if (asset.error || !asset.data) return { ok: false, message: 'تصویر پیدا نشد.' }

  const [{ count: coverCount }, { count: galleryCount }, { count: ogProjectCount }, { count: ogServiceCount }] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('cover_media_id', assetId),
    supabase.from('project_media').select('project_id', { count: 'exact', head: true }).eq('media_id', assetId),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('og_media_id', assetId),
    supabase.from('services').select('id', { count: 'exact', head: true }).eq('og_media_id', assetId),
  ])

  if ((coverCount ?? 0) + (galleryCount ?? 0) + (ogProjectCount ?? 0) + (ogServiceCount ?? 0) > 0) {
    return { ok: false, message: 'این تصویر در سایت استفاده شده و تا زمان حذف آن از محتوا قابل حذف نیست.' }
  }

  const removedRecord = await supabase.from('media_assets').delete().eq('id', assetId)
  if (removedRecord.error) return { ok: false, message: 'حذف رکورد تصویر انجام نشد.' }

  const removedStorage = await supabase.storage.from('rava-media').remove([asset.data.storage_path])
  if (removedStorage.error) return { ok: false, message: 'رکورد حذف شد اما پاک‌سازی فایل Storage کامل نشد؛ نیاز به بررسی ادمین دارد.' }

  revalidatePath('/admin/media')
  return { ok: true, message: 'تصویر با موفقیت حذف شد.' }
}
