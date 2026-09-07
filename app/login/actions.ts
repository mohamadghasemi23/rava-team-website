'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type LoginState = { error?: string }

function safeAdminDestination(value:FormDataEntryValue|null){
  const candidate=String(value??'').trim()
  if(!candidate||candidate.startsWith('//')||candidate.includes('\\'))return null
  try{
    const url=new URL(candidate,'http://rava.local')
    if(url.origin!=='http://rava.local')return null
    const adminPath=url.pathname==='/admin'||url.pathname.startsWith('/admin/')
    const designPreviewPath=url.pathname==='/design-preview'||url.pathname.startsWith('/design-preview/')
    if(!adminPath&&!designPreviewPath)return null
    return `${url.pathname}${url.search}${url.hash}`
  }catch{return null}
}

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

  const requestedDestination=safeAdminDestination(formData.get('next'))
  if(requestedDestination)redirect(requestedDestination)

  const {data:isPlatformOperator}=await supabase.rpc('has_permission',{
    required_permission:'platform.sites.manage',organization_scope:null,site_scope:null,
  })
  if(isPlatformOperator!==true){
    const{data:sites}=await supabase.from('sites').select('id').order('created_at',{ascending:true}).limit(1)
    if(sites?.[0]?.id)redirect(`/admin/pages?site=${encodeURIComponent(sites[0].id)}`)
  }
  redirect('/admin')
}
