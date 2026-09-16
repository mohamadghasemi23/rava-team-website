import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type RavaStaffRole = 'admin' | 'editor'

export async function getRavaStaff() {
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (claimsError || !userId) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,display_name,role,active')
    .eq('id', userId)
    .single()

  if (!profile?.active || !['admin', 'editor'].includes(profile.role)) return null

  return {
    supabase,
    user: {
      id: userId,
      displayName: profile.display_name as string,
      role: profile.role as RavaStaffRole,
    },
  }
}

export async function requireRavaStaff() {
  const staff = await getRavaStaff()
  if (!staff) redirect('/login')
  return staff
}

export async function requireRavaAdmin() {
  const staff = await requireRavaStaff()
  if (staff.user.role !== 'admin') redirect('/admin')
  return staff
}
