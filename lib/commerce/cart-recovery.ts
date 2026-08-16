import 'server-only';import{createServiceClient}from'@/lib/supabase/service';
export async function runCartRecoveryBatch(limit=200,tenantId?:string){const s=createServiceClient(),safe=Math.max(1,Math.min(Math.trunc(limit)||200,500));const{data,error}=await s.rpc('prepare_abandoned_cart_recoveries',{p_limit:safe,p_tenant:tenantId||null});if(error)throw error;return{prepared:Number(data||0)}}
