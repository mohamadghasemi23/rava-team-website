'use server'

import { revalidatePath } from 'next/cache'
import { requireRavaAdmin } from '@/lib/auth/require-staff'

function text(formData: FormData, key: string, max = 1000) {
  return String(formData.get(key) ?? '').trim().slice(0, max)
}

function safeHttpUrl(value: string) {
  if (!value) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : ''
  } catch {
    return ''
  }
}

export async function saveSiteSettings(formData: FormData): Promise<void> {
  const { supabase, user } = await requireRavaAdmin()

  const general = {
    email: text(formData, 'email', 240),
    phone: text(formData, 'phone', 80),
    address: text(formData, 'address', 500),
    instagram: safeHttpUrl(text(formData, 'instagram', 500)),
    telegram: safeHttpUrl(text(formData, 'telegram', 500)),
    linkedin: safeHttpUrl(text(formData, 'linkedin', 500)),
    footer_note: text(formData, 'footer_note', 500),
  }

  const enamad = {
    enabled: formData.get('enamad_enabled') === 'on',
    title: text(formData, 'enamad_title', 120) || 'نماد اعتماد الکترونیکی',
    validation_url: safeHttpUrl(text(formData, 'enamad_validation_url', 1000)),
    logo_url: safeHttpUrl(text(formData, 'enamad_logo_url', 1000)),
  }

  const now = new Date().toISOString()
  const result = await supabase.from('site_settings').upsert([
    { key: 'general', value: general, is_public: true, updated_by: user.id, updated_at: now },
    { key: 'enamad', value: enamad, is_public: true, updated_by: user.id, updated_at: now },
  ])

  if (result.error) throw new Error('ذخیره تنظیمات انجام نشد.')
  revalidatePath('/admin/settings')
  revalidatePath('/')
  revalidatePath('/contact')
}
