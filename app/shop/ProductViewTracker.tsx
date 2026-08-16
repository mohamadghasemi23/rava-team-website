'use client'
import{useEffect,useMemo}from'react';import{createClient}from'@/lib/supabase/client';
export default function ProductViewTracker({tenantId,productId}:{tenantId:string;productId:string}){const s=useMemo(()=>createClient(),[]);useEffect(()=>{const key=`rava_pv_${tenantId}_${productId}`,last=Number(sessionStorage.getItem(key)||0),now=Date.now();if(now-last<5*60*1000)return;sessionStorage.setItem(key,String(now));s.rpc('record_customer_product_view',{p_tenant:tenantId,p_product:productId}).then(()=>{})},[s,tenantId,productId]);return null}
