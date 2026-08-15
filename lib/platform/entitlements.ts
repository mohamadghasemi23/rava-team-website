import type{SupabaseClient}from'@supabase/supabase-js'
export const PREMIUM_THEME_KEYS=new Set(['rava-commerce-flow'])
export async function hasEntitlement(s:SupabaseClient,tenantId:string,feature:string){const{data,error}=await s.rpc('has_entitlement',{p_tenant:tenantId,p_feature:feature});if(error)return false;return data===true}
export async function requireEntitlement(s:SupabaseClient,tenantId:string,feature:string){if(!await hasEntitlement(s,tenantId,feature))throw new Error(`entitlement_required:${feature}`)}
export async function canUseTheme(s:SupabaseClient,tenantId:string,themeKey:string){if(!PREMIUM_THEME_KEYS.has(themeKey))return true;return hasEntitlement(s,tenantId,themeKey==='rava-commerce-flow'?'theme.commerce':'theme.premium')}
