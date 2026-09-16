'use server'

import { revalidatePath } from 'next/cache'
import { requireRavaStaff } from '@/lib/auth/require-staff'

const allowedStatuses = ['new', 'in_progress', 'replied', 'closed', 'spam'] as const
type LeadStatus = typeof allowedStatuses[number]

export async function updateLeadStatus(leadId: string, status: LeadStatus, _formData: FormData): Promise<void> {
  if (!allowedStatuses.includes(status)) return
  const { supabase } = await requireRavaStaff()
  const { error } = await supabase.from('leads').update({ status }).eq('id', leadId)
  if (error) throw new Error('تغییر وضعیت پیام انجام نشد.')
  revalidatePath('/admin/leads')
  revalidatePath('/admin/messages')
  revalidatePath('/admin')
}
