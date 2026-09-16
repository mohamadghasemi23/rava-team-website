'use server'

import { revalidatePath } from 'next/cache'
import { requireRavaStaff } from '@/lib/auth/require-staff'

async function assertProjectAndMedia(projectId:string, mediaId?:string) {
  const { supabase } = await requireRavaStaff()
  const project = await supabase.from('projects').select('id').eq('id', projectId).single()
  if (project.error || !project.data) throw new Error('پروژه پیدا نشد.')
  if (mediaId) {
    const media = await supabase.from('media_assets').select('id').eq('id', mediaId).is('deleted_at', null).single()
    if (media.error || !media.data) throw new Error('تصویر معتبر نیست.')
  }
  return supabase
}

export async function setProjectCover(projectId:string, mediaId:string|null):Promise<void> {
  const supabase = await assertProjectAndMedia(projectId, mediaId ?? undefined)
  const result = await supabase.from('projects').update({ cover_media_id: mediaId, updated_at: new Date().toISOString() }).eq('id', projectId)
  if (result.error) throw new Error('ذخیره کاور انجام نشد.')
  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath('/admin/projects')
  revalidatePath('/')
}

export async function addProjectMedia(projectId:string, mediaId:string):Promise<void> {
  const supabase = await assertProjectAndMedia(projectId, mediaId)
  const { count } = await supabase.from('project_media').select('media_id', { count:'exact', head:true }).eq('project_id', projectId)
  const result = await supabase.from('project_media').upsert({ project_id: projectId, media_id: mediaId, sort_order: count ?? 0 }, { onConflict:'project_id,media_id', ignoreDuplicates:true })
  if (result.error) throw new Error('افزودن تصویر انجام نشد.')
  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath('/')
}

export async function removeProjectMedia(projectId:string, mediaId:string):Promise<void> {
  const supabase = await assertProjectAndMedia(projectId)
  const result = await supabase.from('project_media').delete().eq('project_id', projectId).eq('media_id', mediaId)
  if (result.error) throw new Error('حذف تصویر از گالری انجام نشد.')

  const { data: remaining } = await supabase.from('project_media').select('media_id').eq('project_id', projectId).order('sort_order', { ascending:true })
  if (remaining?.length) {
    await Promise.all(remaining.map((item,index)=>supabase.from('project_media').update({ sort_order:index }).eq('project_id',projectId).eq('media_id',item.media_id)))
  }
  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath('/')
}

export async function moveProjectMedia(projectId:string, orderedMediaIds:string[]):Promise<void> {
  const supabase = await assertProjectAndMedia(projectId)
  const current = await supabase.from('project_media').select('media_id').eq('project_id', projectId)
  const currentIds = new Set((current.data ?? []).map(item=>item.media_id))
  if (orderedMediaIds.length !== currentIds.size || orderedMediaIds.some(id=>!currentIds.has(id))) throw new Error('ترتیب گالری نامعتبر است.')

  const updates = await Promise.all(orderedMediaIds.map((mediaId,index)=>supabase.from('project_media').update({ sort_order:index }).eq('project_id',projectId).eq('media_id',mediaId)))
  if (updates.some(result=>result.error)) throw new Error('ذخیره ترتیب گالری انجام نشد.')
  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath('/')
}
