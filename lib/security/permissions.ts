import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type PermissionKey='logs.view'|'errors.view'|'security_logs.view'|'audit_logs.view'|'logs.export'

export async function getAdminAccess(){
 const supabase=await createClient();const{data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub;if(!userId)redirect('/login')
 const{data:profile}=await supabase.from('profiles').select('display_name,role,active').eq('id',userId).single();if(!profile?.active)redirect('/login')
 if(profile.role==='super_admin')return{userId,profile,permissions:new Set<PermissionKey>(['logs.view','errors.view','security_logs.view','audit_logs.view','logs.export']),isSuperAdmin:true}
 const{data:rows}=await supabase.from('admin_permissions').select('permission_key').eq('user_id',userId)
 return{userId,profile,permissions:new Set<PermissionKey>((rows||[]).map((r:any)=>r.permission_key)),isSuperAdmin:false}
}

export async function requirePermission(permission:PermissionKey){const access=await getAdminAccess();if(!access.permissions.has(permission))redirect('/admin');return access}
