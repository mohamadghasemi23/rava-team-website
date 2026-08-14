'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type LoginState = { error?: string }

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) return { error: 'ایمیل و رمز عبور را وارد کنید.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: 'ایمیل یا رمز عبور صحیح نیست.' }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (claimsError || !userId) {
    await supabase.auth.signOut()
    return { error: 'ورود تأیید نشد. دوباره تلاش کنید.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('active, role')
    .eq('id', userId)
    .single()

  if (!profile?.active) {
    await supabase.auth.signOut()
    return { error: 'این حساب غیرفعال است.' }
  }

  redirect('/admin')
}
