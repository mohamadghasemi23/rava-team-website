'use server'

import { revalidatePath } from 'next/cache'
import { requireRavaStaff } from '@/lib/auth/require-staff'

const allowedStatuses = ['new', 'in_progress', 'replied', 'closed', 'spam'] as const
type LeadStatus = typeof allowedStatuses[number]

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  if (!allowedStatuses.includes(status)) return { ok: false, message: 'وضعیت نامعتبر است.' }
  const { supabase } = await requireRavaStaff()
  const result = await supabase.from('leads').update({ status }).eq('id', leadId)
  if (result.error) return { ok: false, message: 'تغییر وضعیت انجام نشد.' }
  revalidatePath('/admin/messages')
  revalidatePath('/admin')
  return { ok: true, message: 'وضعیت پیام ذخیره شد.' }
}
