'use client'

import { ChangeEvent, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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

export default function MediaManager({ initialAssets, userId }: { initialAssets: Asset[]; userId: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [assets, setAssets] = useState(initialAssets)
  const [file, setFile] = useState<File | null>(null)
  const [alt, setAlt] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const [deleteAsset, setDeleteAsset] = useState<Asset | null>(null)

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
    if (!next.type.startsWith('image/')) return notify(false, 'فقط فایل تصویری مجاز است.')
    if (next.size > 10 * 1024 * 1024) return notify(false, 'حجم فایل باید کمتر از ۱۰ مگابایت باشد.')
    setFile(next)
    if (!alt) setAlt(next.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))
  }

  async function upload() {
    if (!file) return notify(false, 'ابتدا یک تصویر انتخاب کن.')
    const confirmed = window.confirm(`تصویر «${file.name}» روی سرور آپلود شود؟`)
    if (!confirmed) return
    setBusy(true)
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')
    const path = `${userId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`
    const uploaded = await supabase.storage.from('rava-media').upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type })
    if (uploaded.error) { setBusy(false); return notify(false, `آپلود انجام نشد: ${uploaded.error.message}`) }

    const inserted = await supabase.from('media_assets').insert({
      storage_path: path,
      file_name: file.name,
      mime_type: file.type,
      alt_text: alt.trim(),
      size_bytes: file.size,
      uploaded_by: userId,
    }).select('id,storage_path,file_name,mime_type,alt_text,size_bytes,created_at').single()

    if (inserted.error || !inserted.data) {
      await supabase.storage.from('rava-media').remove([path])
      setBusy(false)
      return notify(false, `ثبت اطلاعات فایل انجام نشد: ${inserted.error?.message ?? 'خطای ناشناخته'}`)
    }

    setAssets((current) => [inserted.data as Asset, ...current])
    setFile(null)
    setAlt('')
    setBusy(false)
    const input = document.getElementById('media-upload-input') as HTMLInputElement | null
    if (input) input.value = ''
    notify(true, 'تصویر با موفقیت آپلود و در کتابخانه رسانه ثبت شد.')
  }

  async function saveAlt(asset: Asset, value: string) {
    const confirmed = window.confirm(`متن جایگزین تصویر «${asset.file_name}» ویرایش شود؟`)
    if (!confirmed) return
    const result = await supabase.from('media_assets').update({ alt_text: value }).eq('id', asset.id)
    if (result.error) return notify(false, `ویرایش انجام نشد: ${result.error.message}`)
    setAssets((current) => current.map((item) => item.id === asset.id ? { ...item, alt_text: value } : item))
    notify(true, 'اطلاعات تصویر با موفقیت ویرایش شد.')
  }

  async function removeConfirmed() {
    if (!deleteAsset) return
    setBusy(true)
    const storageResult = await supabase.storage.from('rava-media').remove([deleteAsset.storage_path])
    if (storageResult.error) { setBusy(false); setDeleteAsset(null); return notify(false, `حذف فایل انجام نشد: ${storageResult.error.message}`) }
    const dbResult = await supabase.from('media_assets').delete().eq('id', deleteAsset.id)
    if (dbResult.error) { setBusy(false); setDeleteAsset(null); return notify(false, `حذف رکورد انجام نشد: ${dbResult.error.message}`) }
    setAssets((current) => current.filter((item) => item.id !== deleteAsset.id))
    setBusy(false)
    setDeleteAsset(null)
    notify(true, 'تصویر با موفقیت از کتابخانه رسانه حذف شد.')
  }

  return <>
    <section className="admin-panel">
      <h2>آپلود تصویر</h2>
      <p>تصویر را از گوشی یا کامپیوتر انتخاب کن. حداکثر حجم هر فایل ۱۰ مگابایت است.</p>
      <div className="admin-form">
        <label>انتخاب فایل<input id="media-upload-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" onChange={onFile}/></label>
        <label>Alt Text<input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="توضیح کوتاه و دقیق تصویر"/></label>
        {file ? <div className="admin-upload-preview"><img src={URL.createObjectURL(file)} alt="پیش‌نمایش فایل انتخاب‌شده"/><div><b>{file.name}</b><small>{Math.round(file.size / 1024)} KB</small></div></div> : null}
        <button className="admin-primary-button" type="button" disabled={busy || !file} onClick={upload}>{busy ? 'در حال آپلود…' : 'آپلود و ثبت در کتابخانه'}</button>
      </div>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><h2>کتابخانه رسانه</h2><span>{assets.length} فایل</span></div>
      {assets.length === 0 ? <div className="admin-empty">هنوز تصویری آپلود نشده.</div> : <div className="admin-media-grid">
        {assets.map((asset) => <article className="admin-media-card" key={asset.id}>
          <img src={publicUrl(asset.storage_path)} alt={asset.alt_text || asset.file_name}/>
          <div className="admin-media-meta"><b>{asset.file_name}</b><small>{asset.mime_type}{asset.size_bytes ? ` · ${Math.round(asset.size_bytes / 1024)} KB` : ''}</small></div>
          <label>Alt Text<input defaultValue={asset.alt_text} onBlur={(e) => { if (e.target.value !== asset.alt_text) saveAlt(asset, e.target.value) }}/></label>
          <button type="button" className="admin-danger-button" onClick={() => setDeleteAsset(asset)}>حذف تصویر</button>
        </article>)}
      </div>}
    </section>

    {deleteAsset ? <div className="admin-modal-backdrop" onMouseDown={() => setDeleteAsset(null)}><div className="admin-modal admin-modal-danger" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}><div className="admin-modal-icon">!</div><h3>حذف تصویر</h3><p>تصویر «{deleteAsset.file_name}» برای همیشه از Storage و کتابخانه رسانه حذف شود؟</p><div className="admin-modal-actions"><button type="button" className="admin-danger-button" disabled={busy} onClick={removeConfirmed}>بله، حذف شود</button><button type="button" className="admin-muted-button" onClick={() => setDeleteAsset(null)}>انصراف</button></div></div></div> : null}
    {toast ? <div className={`admin-toast ${toast.ok ? 'admin-toast-success' : 'admin-toast-error'}`}><b>{toast.ok ? 'انجام شد' : 'خطا'}</b><span>{toast.message}</span><button type="button" onClick={() => setToast(null)}>×</button></div> : null}
  </>
}
