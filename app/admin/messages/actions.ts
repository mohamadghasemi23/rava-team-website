'use server'

import { revalidatePath } from 'next/cache'
import { requireRavaStaff } from '@/lib/auth/require-staff'

const allowedStatuses = ['new', 'in_progress', 'replied', 'closed', 'spam'] as const
type LeadStatus = typeof allowedStatuses[number]

export async function updateLeadStatus(leadId: string, status: LeadStatus, _formData: FormData): Promise<void> {
  if (!allowedStatuses.includes(status)) return
  const { supabase } = await requireRavaStaff()
  await supabase.from('leads').update({ status }).eq('id', leadId)
  revalidatePath('/admin/messages')
  revalidatePath('/admin')
}
