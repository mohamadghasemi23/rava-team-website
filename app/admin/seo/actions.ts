'use server'

import { revalidatePath } from 'next/cache'
import { requireRavaAdmin } from '@/lib/auth/require-staff'

function text(formData: FormData, key: string, max = 500) {
  return String(formData.get(key) ?? '').trim().slice(0, max)
}

export async function saveSeoSettings(formData: FormData): Promise<void> {
  const { supabase, user } = await requireRavaAdmin()
  const value = {
    title: text(formData, 'title', 120),
    description: text(formData, 'description', 300),
    og_image_url: text(formData, 'og_image_url', 1000),
    twitter_handle: text(formData, 'twitter_handle', 120),
    search_console_verification: text(formData, 'search_console_verification', 300),
  }

  const { error } = await supabase.from('site_settings').upsert({
    key: 'seo',
    value,
    is_public: true,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  })

  if (error) throw new Error('ذخیره تنظیمات سئو انجام نشد.')
  revalidatePath('/admin/seo')
  revalidatePath('/', 'layout')
}
