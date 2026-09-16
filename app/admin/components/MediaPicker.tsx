'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Asset = { id:string; storage_path:string; file_name:string; alt_text:string; mime_type:string }

export default function MediaPicker({ name, defaultValue = '' }: { name:string; defaultValue?:string }) {
  const supabase = useMemo(() => createClient(), [])
  const [value,setValue]=useState(defaultValue)
  const [open,setOpen]=useState(false)
  const [assets,setAssets]=useState<Asset[]>([])
  const [toast,setToast]=useState('')

  function publicUrl(path:string){return supabase.storage.from('rava-media').getPublicUrl(path).data.publicUrl}

  useEffect(()=>{
    if(!open)return
    void supabase.from('media_assets').select('id,storage_path,file_name,alt_text,mime_type').is('deleted_at',null).order('created_at',{ascending:false}).then(({data})=>setAssets((data??[]) as Asset[]))
  },[open,supabase])

  function notify(text:string){setToast(text);window.setTimeout(()=>setToast(''),2600)}
  function select(asset:Asset){setValue(publicUrl(asset.storage_path));setOpen(false);notify('تصویر انتخاب شد. برای ثبت نهایی، فرم را ذخیره کن.')}

  return <div className="admin-media-picker">
    <input type="hidden" name={name} value={value}/>
    {value?<div className="admin-media-picker-preview"><img src={value} alt="تصویر انتخاب‌شده"/><button type="button" className="admin-muted-button" onClick={()=>{setValue('');notify('انتخاب تصویر پاک شد؛ فرم را ذخیره کن.')}}>حذف انتخاب</button></div>:<div className="admin-empty">هنوز تصویری انتخاب نشده.</div>}
    <button type="button" className="admin-muted-button" onClick={()=>setOpen(true)}>انتخاب از کتابخانه</button>

    {open?<div className="admin-modal-backdrop" onMouseDown={()=>setOpen(false)}><div className="admin-modal admin-media-modal" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}><h3>انتخاب تصویر</h3><p>فقط تصاویر تأییدشده‌ی Media Library اینجا نمایش داده می‌شوند. برای آپلود فایل جدید از کتابخانه رسانه استفاده کن.</p><div className="admin-media-grid admin-media-picker-grid">{assets.map(asset=><button type="button" className="admin-media-card admin-media-select" key={asset.id} onClick={()=>select(asset)}><img src={publicUrl(asset.storage_path)} alt={asset.alt_text||asset.file_name}/><small>{asset.file_name}</small></button>)}</div><div className="admin-modal-actions"><Link className="admin-link" href="/admin/media">باز کردن کتابخانه رسانه</Link><button type="button" className="admin-muted-button" onClick={()=>setOpen(false)}>بستن</button></div></div></div>:null}

    {toast?<div className="admin-toast admin-toast-success" role="status" aria-live="polite"><b>انجام شد</b><span>{toast}</span><button type="button" onClick={()=>setToast('')}>×</button></div>:null}
  </div>
}
