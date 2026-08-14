import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revokeCurrentAdminSession } from '@/lib/security/admin-session'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (data?.claims) {
    await revokeCurrentAdminSession()
    await supabase.auth.signOut()
  }

  revalidatePath('/', 'layout')
  return NextResponse.redirect(new URL('/login', request.url), { status: 302 })
}
