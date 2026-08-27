'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { uploadMedia } from '@/app/admin/media/actions'
import {useAdminLocale} from './AdminLocale'

type Asset = { id:string; storage_path:string; file_name:string; alt_text:string; mime_type:string }
type Pending = { kind:'select'; asset:Asset } | { kind:'upload'; file:File } | null

export default function MediaPicker({ name, siteId, defaultValue = '' }: { name:string; siteId:string; defaultValue?:string }) {
  const{language}=useAdminLocale(),l=(fa:string,en:string)=>language==='fa'?fa:en
  const supabase = useMemo(() => createClient(), [])
  const [value,setValue]=useState(defaultValue)
  const [open,setOpen]=useState(false)
  const [assets,setAssets]=useState<Asset[]>([])
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [pending,setPending]=useState<Pending>(null)
  const [toast,setToast]=useState('')

  function publicUrl(path:string){return supabase.storage.from('rava-media').getPublicUrl(path).data.publicUrl}
  async function load(){const{data}=await supabase.from('media_assets').select('id,storage_path,file_name,alt_text,mime_type').eq('site_id',siteId).is('deleted_at',null).order('created_at',{ascending:false});setAssets((data??[]) as Asset[])}
  useEffect(()=>{if(open)load()},[open])

  function notify(text:string){setToast(text);window.setTimeout(()=>setToast(''),2600)}

  function requestUpload(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];if(!file)return
    event.target.value=''
    if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)){setMessage(l('فقط قالب‌های تصویری مجاز هستند.','Only supported image formats are allowed.'));return}
    if(file.size>10*1024*1024){setMessage(l('حجم فایل باید کمتر از ۱۰ مگابایت باشد.','The file must be smaller than 10 MB.'));return}
    setMessage('');setPending({kind:'upload',file})
  }

  async function uploadConfirmed(file:File){
    setPending(null);setBusy(true);setMessage('')
    const formData=new FormData();formData.set('site_id',siteId);formData.set('file',file);formData.set('alt_text',file.name.replace(/\.[^.]+$/,''))
    const result=await uploadMedia(formData);if(!result.ok||!result.asset){setBusy(false);setMessage(result.message);return}
    const asset=result.asset as Asset;setAssets(a=>[asset,...a]);setValue(publicUrl(asset.storage_path));setBusy(false);setOpen(false);notify(l('تصویر بارگذاری و برای این بخش انتخاب شد.','The image was uploaded and selected for this section.'))
  }

  function selectConfirmed(asset:Asset){setValue(publicUrl(asset.storage_path));setPending(null);setOpen(false);notify(l('تصویر از کتابخانه انتخاب شد. برای ثبت نهایی، تغییرات بخش را ذخیره کنید.','The library image was selected. Save the section to apply the change.'))}

  return <div className="admin-media-picker">
    <input type="hidden" name={name} value={value}/>
    {value?<div className="admin-media-picker-preview"><img src={value} alt={l('تصویر انتخاب‌شده','Selected image')}/><button type="button" className="admin-muted-button" onClick={()=>{setValue('');notify(l('انتخاب تصویر پاک شد؛ برای ثبت نهایی بخش را ذخیره کنید.','The image selection was cleared. Save the section to apply the change.'))}}>{l('حذف انتخاب','Clear selection')}</button></div>:<div className="admin-empty">{l('هنوز تصویری انتخاب نشده است.','No image has been selected yet.')}</div>}
    <button type="button" className="admin-muted-button" onClick={()=>setOpen(true)}>{l('انتخاب یا بارگذاری تصویر','Select or upload image')}</button>

    {open?<div className="admin-modal-backdrop" onMouseDown={()=>!busy&&setOpen(false)}><div className="admin-modal admin-media-modal" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}><h3>{l('انتخاب تصویر','Select image')}</h3><p>{l('از کتابخانه همین سایت انتخاب کنید یا تصویر جدیدی بارگذاری کنید.','Choose from this site’s library or upload a new image.')}</p><label className="admin-upload-button">{busy?l('در حال بارگذاری…','Uploading…'):l('بارگذاری تصویر جدید','Upload new image')}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={requestUpload}/></label>{message?<p className="auth-error">{message}</p>:null}<div className="admin-media-grid admin-media-picker-grid">{assets.map(asset=><button type="button" className="admin-media-card admin-media-select" key={asset.id} onClick={()=>setPending({kind:'select',asset})}><img src={publicUrl(asset.storage_path)} alt={asset.alt_text||asset.file_name}/><small>{asset.file_name}</small></button>)}</div><div className="admin-modal-actions"><Link className="admin-link" href={`/admin/media?site=${siteId}`}>{l('باز کردن کتابخانه کامل','Open full library')}</Link><button type="button" className="admin-muted-button" onClick={()=>setOpen(false)}>{l('بستن','Close')}</button></div></div></div>:null}

    {pending?<div className="admin-modal-backdrop" onMouseDown={()=>!busy&&setPending(null)}><div className="admin-modal" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}><div className="admin-modal-icon">✓</div><h3>{pending.kind==='upload'?l('تأیید بارگذاری','Confirm upload'):l('تأیید انتخاب تصویر','Confirm image selection')}</h3><p>{pending.kind==='upload'?l(`تصویر «${pending.file.name}» روی سرور بارگذاری و برای این بخش انتخاب شود؟`,`Upload “${pending.file.name}” and select it for this section?`):l(`تصویر «${pending.asset.file_name}» برای این بخش انتخاب شود؟`,`Select “${pending.asset.file_name}” for this section?`)}</p><div className="admin-modal-actions"><button type="button" className="admin-primary-button" disabled={busy} onClick={()=>pending.kind==='upload'?uploadConfirmed(pending.file):selectConfirmed(pending.asset)}>{l('بله، انجام شود','Yes, continue')}</button><button type="button" className="admin-muted-button" disabled={busy} onClick={()=>setPending(null)}>{l('انصراف','Cancel')}</button></div></div></div>:null}

    {toast?<div className="admin-toast admin-toast-success" role="status" aria-live="polite"><b>{l('انجام شد','Completed')}</b><span>{toast}</span><button type="button" onClick={()=>setToast('')}>×</button></div>:null}
  </div>
}
