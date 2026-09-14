'use server'

import { revalidatePath } from 'next/cache'
import { requireRavaStaff } from '@/lib/auth/require-staff'

function text(formData: FormData, key: string, max = 5000) {
  return String(formData.get(key) ?? '').trim().slice(0, max)
}

export async function saveHomeContent(formData: FormData): Promise<void> {
  const { supabase, user } = await requireRavaStaff()
  const content = {
    hero: {
      badge: text(formData, 'hero_badge', 180),
      title: text(formData, 'hero_title', 240),
      description: text(formData, 'hero_description', 700),
      primary_cta: text(formData, 'hero_primary_cta', 100),
      secondary_cta: text(formData, 'hero_secondary_cta', 100),
    },
    stats: [
      { value: text(formData, 'stat_1_value', 40), label: text(formData, 'stat_1_label', 120) },
      { value: text(formData, 'stat_2_value', 40), label: text(formData, 'stat_2_label', 120) },
      { value: text(formData, 'stat_3_value', 40), label: text(formData, 'stat_3_label', 120) },
    ],
    marquee: text(formData, 'marquee', 1000),
    services_intro: text(formData, 'services_intro', 800),
    about: {
      title: text(formData, 'about_title', 240),
      body: text(formData, 'about_body', 3000),
    },
    values: [
      { title: text(formData, 'value_1_title', 120), body: text(formData, 'value_1_body', 500) },
      { title: text(formData, 'value_2_title', 120), body: text(formData, 'value_2_body', 500) },
      { title: text(formData, 'value_3_title', 120), body: text(formData, 'value_3_body', 500) },
      { title: text(formData, 'value_4_title', 120), body: text(formData, 'value_4_body', 500) },
    ],
    final_cta: {
      title: text(formData, 'final_cta_title', 240),
      body: text(formData, 'final_cta_body', 800),
      button: text(formData, 'final_cta_button', 100),
    },
  }

  const result = await supabase.from('site_content').upsert({
    section_key: 'home',
    content,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'section_key' })

  if (result.error) throw new Error('ذخیره محتوای صفحه اصلی انجام نشد.')
  revalidatePath('/admin/home')
  revalidatePath('/')
}
