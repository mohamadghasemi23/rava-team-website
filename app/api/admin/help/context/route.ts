import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function matchRoute(pattern:string,path:string){
  if(pattern===path)return true
  if(pattern.endsWith('*'))return path.startsWith(pattern.slice(0,-1))
  return false
}

export async function GET(request:NextRequest){
  const path=request.nextUrl.searchParams.get('path')??''; const locale=request.nextUrl.searchParams.get('locale')==='en'?'en':'fa'
  if(!path.startsWith('/admin'))return NextResponse.json({topic:null},{status:400})
  const supabase=await createClient(); const {data:claims}=await supabase.auth.getClaims(); if(!claims?.claims?.sub)return NextResponse.json({topic:null},{status:401})
  const {data:bindings}=await supabase.from('help_context_bindings').select('topic_id,route_pattern,context_key,priority').order('priority').limit(200)
  const binding=(bindings??[]).find(item=>matchRoute(String(item.route_pattern),path)); if(!binding)return NextResponse.json({topic:null})
  const {data:topic}=await supabase.from('help_topics').select('id,key,category,estimated_minutes,minimum_permission,status').eq('id',binding.topic_id).eq('status','published').maybeSingle(); if(!topic)return NextResponse.json({topic:null})
  const {data:tr}=await supabase.from('help_translations').select('locale,title,summary,body_markdown,example_markdown,steps,warnings,version').eq('topic_id',topic.id).eq('locale',locale).maybeSingle()
  return NextResponse.json({topic:{...topic,translation:tr,contextKey:binding.context_key}})
}
