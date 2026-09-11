import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (data?.claims) await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  return new NextResponse(null, {
    status: 303,
    headers: { Location: '/login' },
  })
}
