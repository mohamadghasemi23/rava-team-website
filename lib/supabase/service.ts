import 'server-only';import{createClient}from'@supabase/supabase-js';
export function createServiceClient(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error('server_service_credentials_missing');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})}
// Service role bypasses RLS. Import this module only from trusted server routes/actions after tenant and entitlement checks.
