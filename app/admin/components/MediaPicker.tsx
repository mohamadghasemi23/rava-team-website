'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Asset = { id:string; storage_path:string; file_name:string; alt_text:string; mime_type:string }

export default function MediaPicker({ name, defaultValue = '' }: { name:string; defaultValue?:string }) {
  const supabase = useMemo(() => createClient(), [])
  const [value,setValue]=useState(defaultValue)
  const [open,setOpen]=useState(false)
  const [assets,setAssets]=useState<Asset[]>([])
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')

  function publicUrl(path:string){return supabase.storage.from('rava-media').getPublicUrl(path).data.publicUrl}
  async function load(){const{data}=await supabase.from('media_assets').select('id,storage_path,file_name,alt_text,mime_type').is('deleted_at',null).order('created_at',{ascending:false});setAssets((data??[]) as Asset[])}
  useEffect(()=>{if(open)load()},[open])

  async function quickUpload(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){setMessage('فقط فایل تصویری مجاز است.');return}if(file.size>10*1024*1024){setMessage('حجم فایل باید کمتر از ۱۰ مگابایت باشد.');return}
    setBusy(true);setMessage('');const{data:userData}=await supabase.auth.getUser();const userId=userData.user?.id;if(!userId){setBusy(false);setMessage('نشست کاربری معتبر نیست.');return}
    const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-');const path=`${userId}/${Date.now()}-${crypto.randomUUID()}-${safe}`;const up=await supabase.storage.from('rava-media').upload(path,file,{cacheControl:'31536000',contentType:file.type});if(up.error){setBusy(false);setMessage(up.error.message);return}
    const ins=await supabase.from('media_assets').insert({storage_path:path,file_name:file.name,mime_type:file.type,alt_text:file.name.replace(/\.[^.]+$/,''),size_bytes:file.size,uploaded_by:userId}).select('id,storage_path,file_name,alt_text,mime_type').single();if(ins.error||!ins.data){await supabase.storage.from('rava-media').remove([path]);setBusy(false);setMessage(ins.error?.message??'ثبت فایل انجام نشد.');return}
    const asset=ins.data as Asset;setAssets(a=>[asset,...a]);setValue(publicUrl(asset.storage_path));setBusy(false);setOpen(false)
  }

  return <div className="admin-media-picker">
    <input type="hidden" name={name} value={value}/>
    {value?<div className="admin-media-picker-preview"><img src={value} alt="تصویر انتخاب‌شده"/><button type="button" className="admin-muted-button" onClick={()=>setValue('')}>حذف انتخاب</button></div>:<div className="admin-empty">هنوز تصویری انتخاب نشده.</div>}
    <button type="button" className="admin-muted-button" onClick={()=>setOpen(true)}>انتخاب / آپلود تصویر</button>
    {open?<div className="admin-modal-backdrop" onMouseDown={()=>setOpen(false)}><div className="admin-modal admin-media-modal" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}><h3>انتخاب تصویر</h3><label className="admin-upload-button">{busy?'در حال آپلود…':'آپلود تصویر جدید'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" disabled={busy} onChange={quickUpload}/></label>{message?<p className="auth-error">{message}</p>:null}<div className="admin-media-grid admin-media-picker-grid">{assets.map(asset=><button type="button" className="admin-media-card admin-media-select" key={asset.id} onClick={()=>{setValue(publicUrl(asset.storage_path));setOpen(false)}}><img src={publicUrl(asset.storage_path)} alt={asset.alt_text||asset.file_name}/><small>{asset.file_name}</small></button>)}</div><div className="admin-modal-actions"><Link className="admin-link" href="/admin/media">باز کردن کتابخانه کامل</Link><button type="button" className="admin-muted-button" onClick={()=>setOpen(false)}>بستن</button></div></div></div>:null}
  </div>
}
