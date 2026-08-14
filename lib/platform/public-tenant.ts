import {headers} from 'next/headers';import {createClient} from '@/lib/supabase/server'
export async function getPublicTenant(){const h=await headers(),host=h.get('x-forwarded-host')||h.get('host')||'';const s=await createClient();const{data}=await s.rpc('resolve_public_tenant',{p_hostname:host});return (data||[])[0]||null}
