'use server'

import { createHash, randomUUID } from 'crypto'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminSession } from '@/lib/security/admin-session'
import { logEvent, newRequestId } from '@/lib/observability/logger'

export type LoginState = { error?: string; errorId?: string; nonce?: number }
type TurnstileResult = { success:boolean; hostname?:string; action?:string; 'error-codes'?:string[] }
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/
const GENERIC_ERROR='ورود انجام نشد. اطلاعات واردشده و تأیید امنیتی را بررسی کنید.'

function invalidInput(email:string,password:string,token:string){return !email||!password||!token||email.length>254||!EMAIL_RE.test(email)||password.length<8||password.length>128||token.length>2048||/\p{Cc}/u.test(email)||/\p{Cc}/u.test(password)}
async function getClientFingerprint(){const h=await headers();const ip=(h.get('cf-connecting-ip')||h.get('x-nf-client-connection-ip')||h.get('x-forwarded-for')||'unknown').split(',')[0].trim();const ua=(h.get('user-agent')||'unknown').slice(0,256);return createHash('sha256').update(`${ip}|${ua}`).digest('hex')}
async function verifyTurnstile(token:string){const secret=process.env.TURNSTILE_SECRET_KEY;if(!secret)return false;const h=await headers();const remoteIp=(h.get('cf-connecting-ip')||h.get('x-nf-client-connection-ip')||h.get('x-forwarded-for')||'').split(',')[0].trim();const body=new FormData();body.append('secret',secret);body.append('response',token);body.append('idempotency_key',randomUUID());if(remoteIp)body.append('remoteip',remoteIp);const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),7000);try{const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body,signal:controller.signal,cache:'no-store'});if(!response.ok)return false;const result=(await response.json()) as TurnstileResult;if(!result.success)return false;const hosts=(process.env.TURNSTILE_ALLOWED_HOSTNAMES||'ravateam.ir,www.ravateam.ir').split(',').map(x=>x.trim()).filter(Boolean);if(result.hostname&&hosts.length&&!hosts.includes(result.hostname))return false;if(result.action&&result.action!=='admin-login')return false;return true}catch{return false}finally{clearTimeout(timeout)}}

export async function login(_state:LoginState,formData:FormData):Promise<LoginState>{
 const email=String(formData.get('email')??'').trim().toLowerCase();const password=String(formData.get('password')??'');const captchaToken=String(formData.get('cf-turnstile-response')??'');const rememberMe=String(formData.get('remember_me')??'')==='on';const nonce=Date.now();const requestId=newRequestId();const fingerprint=await getClientFingerprint()
 async function fail(eventName:string,message=GENERIC_ERROR,severity:'warning'|'error'='warning',metadata:Record<string,unknown>={}){const errorId=await logEvent({category:'auth',severity,eventName,message:'Admin login rejected',route:'/login',method:'POST',requestId,source:'server',metadata:{fingerprint,rememberMe,...metadata}});return{error:message,errorId,nonce}}
 if(invalidInput(email,password,captchaToken))return fail('auth.login.invalid_input')
 const supabase=await createClient();const{data:allowed,error:rateError}=await supabase.rpc('consume_login_rate_limit',{p_key:fingerprint});if(rateError||allowed!==true)return fail('auth.login.rate_limited','تعداد تلاش‌های ورود بیش از حد مجاز است. چند دقیقه دیگر دوباره تلاش کنید.','warning',{rateLimitError:Boolean(rateError)})
 if(!(await verifyTurnstile(captchaToken)))return fail('auth.login.captcha_failed')
 const{error}=await supabase.auth.signInWithPassword({email,password});if(error)return fail('auth.login.credentials_failed')
 const{data:claimsData,error:claimsError}=await supabase.auth.getClaims();const userId=claimsData?.claims?.sub;if(claimsError||!userId){await supabase.auth.signOut();return fail('auth.login.claims_failed',GENERIC_ERROR,'error')}
 const{data:profile}=await supabase.from('profiles').select('active,role').eq('id',userId).single();if(!profile?.active||!['super_admin','admin','content_manager','viewer'].includes(profile.role)){await supabase.auth.signOut();return fail('auth.login.unauthorized_profile')}
 try{await createAdminSession(userId,rememberMe)}catch(error){await supabase.auth.signOut();const errorId=await logEvent({category:'error',severity:'error',eventName:'auth.session.create_failed',message:'Secure admin session creation failed',route:'/login',method:'POST',actorUserId:userId,actorRole:profile.role,requestId,error,metadata:{rememberMe}});return{error:'ایجاد نشست امن انجام نشد. دوباره تلاش کنید.',errorId,nonce}}
 await supabase.rpc('reset_login_rate_limit',{p_key:fingerprint});await logEvent({category:'auth',severity:'info',eventName:'auth.login.success',message:'Admin logged in',route:'/login',method:'POST',actorUserId:userId,actorRole:profile.role,requestId,metadata:{rememberMe}});redirect('/admin')
}
