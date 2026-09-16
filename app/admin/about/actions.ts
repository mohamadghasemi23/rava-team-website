'use server'

import { revalidatePath } from 'next/cache'
import { requireRavaStaff } from '@/lib/auth/require-staff'

function text(formData: FormData, key: string, max = 5000) {
  return String(formData.get(key) ?? '').trim().slice(0, max)
}

export async function saveAboutContent(formData: FormData): Promise<void> {
  const { supabase, user } = await requireRavaStaff()

  const values = [1, 2, 3, 4].map((index) => ({
    title: text(formData, `value_${index}_title`, 120),
    body: text(formData, `value_${index}_body`, 500),
  }))

  const stats = [1, 2, 3].map((index) => ({
    value: text(formData, `stat_${index}_value`, 60),
    label: text(formData, `stat_${index}_label`, 160),
  }))

  const content = {
    eyebrow: text(formData, 'eyebrow', 120),
    title: text(formData, 'title', 220),
    intro: text(formData, 'intro', 2500),
    body: text(formData, 'body', 12000),
    stats,
    values,
    cta: {
      title: text(formData, 'cta_title', 220),
      body: text(formData, 'cta_body', 1200),
      button: text(formData, 'cta_button', 100),
    },
  }

  const result = await supabase.from('site_content').upsert({
    section_key: 'about',
    content,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  })

  if (result.error) throw new Error('ذخیره صفحه درباره راوا انجام نشد.')
  revalidatePath('/admin/about')
  revalidatePath('/about')
}
