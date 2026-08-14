import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revokeCurrentAdminSession } from '@/lib/security/admin-session'
import { logEvent, newRequestId } from '@/lib/observability/logger'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  const requestId = newRequestId()

  if (userId) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
    await revokeCurrentAdminSession()
    await supabase.auth.signOut()
    await logEvent({
      category:'auth', severity:'info', eventName:'auth.logout.success',
      message:'Admin logged out', summaryFa:'مدیر با موفقیت از پنل خارج شد.',
      causeFa:'این رویداد در اثر انتخاب خروج از حساب مدیریتی ثبت شده است.',
      route:'/auth/signout', method:'POST', actorUserId:userId,
      actorRole:profile?.role ?? null, requestId, source:'server'
    })
  }

  revalidatePath('/', 'layout')
  return NextResponse.redirect(new URL('/login', request.url), { status: 302 })
}
