'use client'
import {useEffect,useMemo} from 'react';import {usePathname} from 'next/navigation';import {createClient} from '@/lib/supabase/client'
function getId(key:string,storage:Storage){let v=storage.getItem(key);if(!v){v=crypto.randomUUID();storage.setItem(key,v)}return v}
function device(){const w=window.innerWidth;return w<768?'mobile':w<1024?'tablet':'desktop'}
export default function AnalyticsTracker(){const path=usePathname(),s=useMemo(()=>createClient(),[]);useEffect(()=>{if(!path||path.startsWith('/admin')||path.startsWith('/login'))return;const visitor=getId('rava_vid',localStorage),session=getId('rava_sid',sessionStorage);let ref='';try{ref=document.referrer?new URL(document.referrer).hostname:''}catch{};s.rpc('record_analytics_event',{p_event_type:'page_view',p_path:path,p_visitor_id:visitor,p_session_id:session,p_referrer_host:ref||null,p_device_class:device(),p_metadata:{language:navigator.language}}).then(()=>{})},[path,s]);return null}
