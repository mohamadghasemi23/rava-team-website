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
type ConfirmState =
  | { kind: 'upload' }
  | { kind: 'delete'; asset: Asset }
  | { kind: 'alt'; asset: Asset; value: string }
  | null

export default function MediaManager({ initialAssets, userId }: { initialAssets: Asset[]; userId: string }) {
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
    if (!next.type.startsWith('image/')) return notify(false, 'فقط فایل تصویری مجاز است.')
    if (next.size > 10 * 1024 * 1024) return notify(false, 'حجم فایل باید کمتر از ۱۰ مگابایت باشد.')
    setFile(next)
    if (!alt) setAlt(next.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))
  }

  async function uploadConfirmed() {
    if (!file) return
    setConfirmState(null)
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

    const asset = inserted.data as Asset
    setAssets((current) => [asset, ...current])
    setAltDrafts((current) => ({ ...current, [asset.id]: asset.alt_text }))
    setFile(null)
    setAlt('')
    setBusy(false)
    const input = document.getElementById('media-upload-input') as HTMLInputElement | null
    if (input) input.value = ''
    notify(true, 'تصویر با موفقیت آپلود و در کتابخانه رسانه ثبت شد.')
  }

  async function saveAltConfirmed() {
    if (!confirmState || confirmState.kind !== 'alt') return
    const { asset, value } = confirmState
    setConfirmState(null)
    setBusy(true)
    const result = await supabase.from('media_assets').update({ alt_text: value }).eq('id', asset.id)
    setBusy(false)
    if (result.error) return notify(false, `ویرایش انجام نشد: ${result.error.message}`)
    setAssets((current) => current.map((item) => item.id === asset.id ? { ...item, alt_text: value } : item))
    notify(true, 'Alt Text تصویر با موفقیت روی سرور ویرایش شد.')
  }

  async function removeConfirmed() {
    if (!confirmState || confirmState.kind !== 'delete') return
    const asset = confirmState.asset
    setConfirmState(null)
    setBusy(true)
    const storageResult = await supabase.storage.from('rava-media').remove([asset.storage_path])
    if (storageResult.error) { setBusy(false); return notify(false, `حذف فایل انجام نشد: ${storageResult.error.message}`) }
    const dbResult = await supabase.from('media_assets').delete().eq('id', asset.id)
    if (dbResult.error) { setBusy(false); return notify(false, `حذف رکورد انجام نشد: ${dbResult.error.message}`) }
    setAssets((current) => current.filter((item) => item.id !== asset.id))
    setBusy(false)
    notify(true, 'تصویر با موفقیت از Storage و کتابخانه رسانه حذف شد.')
  }

  async function copyUrl(asset: Asset) {
    const url = publicUrl(asset.storage_path)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(asset.id)
      window.setTimeout(() => setCopiedId(null), 1800)
      notify(true, 'لینک عمومی تصویر در کلیپ‌بورد کپی شد.')
    } catch {
      window.prompt('لینک تصویر را کپی کن:', url)
    }
  }

  function confirmTitle() {
    if (!confirmState) return ''
    if (confirmState.kind === 'upload') return 'تأیید آپلود تصویر'
    if (confirmState.kind === 'delete') return 'حذف تصویر'
    return 'تأیید ویرایش Alt Text'
  }

  function confirmMessage() {
    if (!confirmState) return ''
    if (confirmState.kind === 'upload') return `تصویر «${file?.name ?? ''}» روی سرور آپلود و در کتابخانه ثبت شود؟`
    if (confirmState.kind === 'delete') return `تصویر «${confirmState.asset.file_name}» برای همیشه از Storage و کتابخانه رسانه حذف شود؟`
    return `Alt Text تصویر «${confirmState.asset.file_name}» به «${confirmState.value || 'بدون متن'}» تغییر کند؟`
  }

  return <>
    <section className="admin-panel">
      <h2>آپلود تصویر</h2>
      <p>تصویر را از گوشی یا کامپیوتر انتخاب کن. حداکثر حجم هر فایل ۱۰ مگابایت است.</p>
      <div className="admin-form">
        <label>انتخاب فایل<input id="media-upload-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" onChange={onFile}/></label>
        <label>Alt Text<input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="توضیح کوتاه و دقیق تصویر"/></label>
        {file ? <div className="admin-upload-preview"><img src={URL.createObjectURL(file)} alt="پیش‌نمایش فایل انتخاب‌شده"/><div><b>{file.name}</b><small>{Math.round(file.size / 1024)} KB</small></div></div> : null}
        <button className="admin-primary-button" type="button" disabled={busy || !file} onClick={() => setConfirmState({ kind: 'upload' })}>{busy ? 'در حال انجام عملیات…' : 'آپلود و ثبت در کتابخانه'}</button>
      </div>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><h2>کتابخانه رسانه</h2><span>{assets.length} فایل</span></div>
      {assets.length === 0 ? <div className="admin-empty">هنوز تصویری آپلود نشده.</div> : <div className="admin-media-grid">
        {assets.map((asset) => <article className="admin-media-card" key={asset.id}>
          <button type="button" className="admin-media-image-button" onClick={() => setPreviewAsset(asset)} aria-label={`پیش‌نمایش ${asset.file_name}`}><img src={publicUrl(asset.storage_path)} alt={asset.alt_text || asset.file_name}/></button>
          <div className="admin-media-meta"><b>{asset.file_name}</b><small>{asset.mime_type}{asset.size_bytes ? ` · ${Math.round(asset.size_bytes / 1024)} KB` : ''}</small></div>
          <label>Alt Text<input value={altDrafts[asset.id] ?? ''} onChange={(e) => setAltDrafts((current) => ({ ...current, [asset.id]: e.target.value }))}/></label>
          <div className="admin-media-actions">
            <button type="button" className="admin-primary-button" disabled={busy || (altDrafts[asset.id] ?? '') === asset.alt_text} onClick={() => setConfirmState({ kind: 'alt', asset, value: altDrafts[asset.id] ?? '' })}>ذخیره Alt</button>
            <button type="button" className="admin-muted-button" onClick={() => setPreviewAsset(asset)}>پیش‌نمایش</button>
            <button type="button" className="admin-muted-button" onClick={() => copyUrl(asset)}>{copiedId === asset.id ? 'کپی شد ✓' : 'کپی لینک'}</button>
            <button type="button" className="admin-danger-button" onClick={() => setConfirmState({ kind: 'delete', asset })}>حذف تصویر</button>
          </div>
        </article>)}
      </div>}
    </section>

    {previewAsset ? <div className="admin-modal-backdrop" onMouseDown={() => setPreviewAsset(null)}><div className="admin-modal admin-media-preview-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}><h3>{previewAsset.file_name}</h3><img className="admin-media-large-preview" src={publicUrl(previewAsset.storage_path)} alt={previewAsset.alt_text || previewAsset.file_name}/><p>{previewAsset.alt_text || 'Alt Text ثبت نشده است.'}</p><div className="admin-modal-actions"><button type="button" className="admin-muted-button" onClick={() => setPreviewAsset(null)}>بستن</button></div></div></div> : null}

    {confirmState ? <div className="admin-modal-backdrop" onMouseDown={() => !busy && setConfirmState(null)}><div className={`admin-modal ${confirmState.kind === 'delete' ? 'admin-modal-danger' : ''}`} role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}><div className="admin-modal-icon">{confirmState.kind === 'delete' ? '!' : '✓'}</div><h3>{confirmTitle()}</h3><p>{confirmMessage()}</p><div className="admin-modal-actions"><button type="button" className={confirmState.kind === 'delete' ? 'admin-danger-button' : 'admin-primary-button'} disabled={busy} onClick={confirmState.kind === 'upload' ? uploadConfirmed : confirmState.kind === 'delete' ? removeConfirmed : saveAltConfirmed}>{busy ? 'در حال انجام…' : 'بله، انجام شود'}</button><button type="button" className="admin-muted-button" disabled={busy} onClick={() => setConfirmState(null)}>انصراف</button></div></div></div> : null}

    {toast ? <div className={`admin-toast ${toast.ok ? 'admin-toast-success' : 'admin-toast-error'}`} role="status" aria-live="polite"><b>{toast.ok ? 'انجام شد' : 'خطا'}</b><span>{toast.message}</span><button type="button" onClick={() => setToast(null)}>×</button></div> : null}
  </>
}
