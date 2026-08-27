'use client'

import { ChangeEvent, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { deleteMedia, updateMediaAlt, uploadMedia } from './actions'
import {useAdminLocale} from '@/app/admin/components/AdminLocale'

type Asset = {
  id: string
  storage_path: string
  file_name: string
  mime_type: string
  alt_text: string
  size_bytes: number | null
  created_at: string
}

type Toast = { ok: boolean; message: string } | null
type ConfirmState =
  | { kind: 'upload' }
  | { kind: 'delete'; asset: Asset }
  | { kind: 'alt'; asset: Asset; value: string }
  | null

export default function MediaManager({ initialAssets, siteId }: { initialAssets: Asset[]; siteId: string }) {
  const {language}=useAdminLocale(),l=(fa:string,en:string)=>language==='fa'?fa:en
  const supabase = useMemo(() => createClient(), [])
  const [assets, setAssets] = useState(initialAssets)
  const [file, setFile] = useState<File | null>(null)
  const [alt, setAlt] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null)
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>(() => Object.fromEntries(initialAssets.map((a) => [a.id, a.alt_text])))
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function publicUrl(path: string) {
    return supabase.storage.from('rava-media').getPublicUrl(path).data.publicUrl
  }

  function notify(ok: boolean, message: string) {
    setToast({ ok, message })
    window.setTimeout(() => setToast(null), 4200)
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null
    if (!next) return
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(next.type)) return notify(false,l('فقط قالب‌های تصویری مجاز هستند.','Only supported image formats are allowed.'))
    if (next.size > 10 * 1024 * 1024) return notify(false,l('حجم فایل باید کمتر از ۱۰ مگابایت باشد.','The file must be smaller than 10 MB.'))
    setFile(next)
    if (!alt) setAlt(next.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))
  }

  async function uploadConfirmed() {
    if (!file) return
    setConfirmState(null)
    setBusy(true)
    const formData=new FormData();formData.set('site_id',siteId);formData.set('file',file);formData.set('alt_text',alt)
    const result=await uploadMedia(formData)
    if(!result.ok||!result.asset){setBusy(false);return notify(false,result.message)}
    const asset=result.asset as Asset
    setAssets((current) => [asset, ...current])
    setAltDrafts((current) => ({ ...current, [asset.id]: asset.alt_text }))
    setFile(null)
    setAlt('')
    setBusy(false)
    const input = document.getElementById('media-upload-input') as HTMLInputElement | null
    if (input) input.value = ''
    notify(true,l('تصویر با موفقیت بارگذاری و در کتابخانه ثبت شد.','The image was uploaded to the media library.'))
  }

  async function saveAltConfirmed() {
    if (!confirmState || confirmState.kind !== 'alt') return
    const { asset, value } = confirmState
    setConfirmState(null)
    setBusy(true)
    const result = await updateMediaAlt(asset.id,value)
    setBusy(false)
    if (!result.ok) return notify(false,result.message)
    setAssets((current) => current.map((item) => item.id === asset.id ? { ...item, alt_text: value } : item))
    notify(true,l('متن جایگزین تصویر ذخیره شد.','The image alternative text was saved.'))
  }

  async function removeConfirmed() {
    if (!confirmState || confirmState.kind !== 'delete') return
    const asset = confirmState.asset
    setConfirmState(null)
    setBusy(true)
    const result=await deleteMedia(asset.id)
    if(!result.ok){setBusy(false);return notify(false,result.message)}
    setAssets((current) => current.filter((item) => item.id !== asset.id))
    setBusy(false)
    notify(true,l('تصویر با موفقیت از فضای ذخیره‌سازی و کتابخانه حذف شد.','The image was removed from storage and the media library.'))
  }

  async function copyUrl(asset: Asset) {
    const url = publicUrl(asset.storage_path)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(asset.id)
      window.setTimeout(() => setCopiedId(null), 1800)
      notify(true,l('پیوند عمومی تصویر کپی شد.','The public image link was copied.'))
    } catch {
      window.prompt(l('پیوند تصویر را کپی کنید:','Copy the image link:'), url)
    }
  }

  function confirmTitle() {
    if (!confirmState) return ''
    if (confirmState.kind === 'upload') return l('تأیید بارگذاری تصویر','Confirm image upload')
    if (confirmState.kind === 'delete') return l('حذف تصویر','Delete image')
    return l('تأیید ویرایش متن جایگزین','Confirm alternative text update')
  }

  function confirmMessage() {
    if (!confirmState) return ''
    if (confirmState.kind === 'upload') return l(`تصویر «${file?.name ?? ''}» بارگذاری و در کتابخانه ثبت شود؟`,`Upload “${file?.name ?? ''}” to the media library?`)
    if (confirmState.kind === 'delete') return l(`تصویر «${confirmState.asset.file_name}» برای همیشه از فضای ذخیره‌سازی و کتابخانه حذف شود؟`,`Permanently delete “${confirmState.asset.file_name}” from storage and the media library?`)
    return l(`متن جایگزین تصویر «${confirmState.asset.file_name}» به «${confirmState.value || 'بدون متن'}» تغییر کند؟`,`Change the alternative text for “${confirmState.asset.file_name}” to “${confirmState.value || 'No text'}”?`)
  }

  return <>
    <section className="admin-panel">
      <h2>{l('بارگذاری تصویر','Upload image')}</h2>
      <p>{l('تصویر را از گوشی یا رایانه انتخاب کنید. حداکثر حجم هر فایل ۱۰ مگابایت است.','Choose an image from your device. The maximum file size is 10 MB.')}</p>
      <div className="admin-form">
        <label>{l('انتخاب فایل','Choose file')}<input id="media-upload-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onFile}/></label>
        <label>{l('متن جایگزین','Alternative text')}<input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder={l('توضیح کوتاه و دقیق تصویر','A concise, accurate image description')}/></label>
        {file ? <div className="admin-upload-preview"><img src={URL.createObjectURL(file)} alt={l('پیش‌نمایش فایل انتخاب‌شده','Selected file preview')}/><div><b>{file.name}</b><small>{Math.round(file.size / 1024)} KB</small></div></div> : null}
        <button className="admin-primary-button" type="button" disabled={busy || !file} onClick={() => setConfirmState({ kind: 'upload' })}>{busy ? l('در حال انجام عملیات…','Processing…') : l('بارگذاری و ثبت در کتابخانه','Upload to library')}</button>
      </div>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><h2>{l('کتابخانه رسانه','Media library')}</h2><span>{assets.length} {l('فایل','files')}</span></div>
      {assets.length === 0 ? <div className="admin-empty">{l('هنوز تصویری بارگذاری نشده است.','No images have been uploaded yet.')}</div> : <div className="admin-media-grid">
        {assets.map((asset) => <article className="admin-media-card" key={asset.id}>
          <button type="button" className="admin-media-image-button" onClick={() => setPreviewAsset(asset)} aria-label={l(`پیش‌نمایش ${asset.file_name}`,`Preview ${asset.file_name}`)}><img src={publicUrl(asset.storage_path)} alt={asset.alt_text || asset.file_name}/></button>
          <div className="admin-media-meta"><b>{asset.file_name}</b><small>{asset.mime_type}{asset.size_bytes ? ` · ${Math.round(asset.size_bytes / 1024)} KB` : ''}</small></div>
          <label>{l('متن جایگزین','Alternative text')}<input value={altDrafts[asset.id] ?? ''} onChange={(e) => setAltDrafts((current) => ({ ...current, [asset.id]: e.target.value }))}/></label>
          <div className="admin-media-actions">
            <button type="button" className="admin-primary-button" disabled={busy || (altDrafts[asset.id] ?? '') === asset.alt_text} onClick={() => setConfirmState({ kind: 'alt', asset, value: altDrafts[asset.id] ?? '' })}>{l('ذخیره متن جایگزین','Save alternative text')}</button>
            <button type="button" className="admin-muted-button" onClick={() => setPreviewAsset(asset)}>{l('پیش‌نمایش','Preview')}</button>
            <button type="button" className="admin-muted-button" onClick={() => copyUrl(asset)}>{copiedId === asset.id ? l('کپی شد ✓','Copied ✓') : l('کپی پیوند','Copy link')}</button>
            <button type="button" className="admin-danger-button" onClick={() => setConfirmState({ kind: 'delete', asset })}>{l('حذف تصویر','Delete image')}</button>
          </div>
        </article>)}
      </div>}
    </section>

    {previewAsset ? <div className="admin-modal-backdrop" onMouseDown={() => setPreviewAsset(null)}><div className="admin-modal admin-media-preview-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}><h3>{previewAsset.file_name}</h3><img className="admin-media-large-preview" src={publicUrl(previewAsset.storage_path)} alt={previewAsset.alt_text || previewAsset.file_name}/><p>{previewAsset.alt_text || l('متن جایگزین ثبت نشده است.','No alternative text has been provided.')}</p><div className="admin-modal-actions"><button type="button" className="admin-muted-button" onClick={() => setPreviewAsset(null)}>{l('بستن','Close')}</button></div></div></div> : null}

    {confirmState ? <div className="admin-modal-backdrop" onMouseDown={() => !busy && setConfirmState(null)}><div className={`admin-modal ${confirmState.kind === 'delete' ? 'admin-modal-danger' : ''}`} role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}><div className="admin-modal-icon">{confirmState.kind === 'delete' ? '!' : '✓'}</div><h3>{confirmTitle()}</h3><p>{confirmMessage()}</p><div className="admin-modal-actions"><button type="button" className={confirmState.kind === 'delete' ? 'admin-danger-button' : 'admin-primary-button'} disabled={busy} onClick={confirmState.kind === 'upload' ? uploadConfirmed : confirmState.kind === 'delete' ? removeConfirmed : saveAltConfirmed}>{busy ? l('در حال انجام…','Processing…') : l('بله، انجام شود','Yes, continue')}</button><button type="button" className="admin-muted-button" disabled={busy} onClick={() => setConfirmState(null)}>{l('انصراف','Cancel')}</button></div></div></div> : null}

    {toast ? <div className={`admin-toast ${toast.ok ? 'admin-toast-success' : 'admin-toast-error'}`} role="status" aria-live="polite"><b>{toast.ok ? l('انجام شد','Completed') : l('خطا','Error')}</b><span>{toast.message}</span><button type="button" aria-label={l('بستن پیام','Dismiss message')} onClick={() => setToast(null)}>×</button></div> : null}
  </>
}
