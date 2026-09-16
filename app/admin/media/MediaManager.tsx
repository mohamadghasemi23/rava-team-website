'use client'

import { ChangeEvent, useState } from 'react'
import { deleteMedia, updateMediaAlt, uploadMedia } from './actions'

type Asset = {
  id: string
  storage_path: string
  file_name: string
  mime_type: string
  alt_text: string
  size_bytes: number | null
  created_at: string
  public_url: string
}

type Toast = { ok: boolean; message: string } | null

type ConfirmState =
  | { kind: 'upload' }
  | { kind: 'delete'; asset: Asset }
  | { kind: 'alt'; asset: Asset; value: string }
  | null

export default function MediaManager({ initialAssets }: { initialAssets: Asset[] }) {
  const [assets, setAssets] = useState(initialAssets)
  const [file, setFile] = useState<File | null>(null)
  const [alt, setAlt] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null)
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>(() => Object.fromEntries(initialAssets.map((asset) => [asset.id, asset.alt_text])))
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function notify(ok: boolean, message: string) {
    setToast({ ok, message })
    window.setTimeout(() => setToast(null), 4200)
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null
    if (!next) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    if (!allowed.includes(next.type)) return notify(false, 'فقط JPG، PNG، WebP و AVIF مجاز هستند.')
    if (next.size > 5 * 1024 * 1024) return notify(false, 'حجم فایل باید حداکثر ۵ مگابایت باشد.')
    setFile(next)
    if (!alt) setAlt(next.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 300))
  }

  async function uploadConfirmed() {
    if (!file) return
    setConfirmState(null)
    setBusy(true)
    const formData = new FormData()
    formData.set('file', file)
    formData.set('altText', alt)
    const result = await uploadMedia(formData)
    setBusy(false)

    if (!result.ok || !result.data) return notify(false, result.message)

    const asset = result.data as unknown as Asset
    setAssets((current) => [asset, ...current])
    setAltDrafts((current) => ({ ...current, [asset.id]: asset.alt_text }))
    setFile(null)
    setAlt('')
    const input = document.getElementById('media-upload-input') as HTMLInputElement | null
    if (input) input.value = ''
    notify(true, result.message)
  }

  async function saveAltConfirmed() {
    if (!confirmState || confirmState.kind !== 'alt') return
    const { asset, value } = confirmState
    setConfirmState(null)
    setBusy(true)
    const result = await updateMediaAlt(asset.id, value)
    setBusy(false)
    if (!result.ok) return notify(false, result.message)
    setAssets((current) => current.map((item) => item.id === asset.id ? { ...item, alt_text: value.trim().slice(0, 300) } : item))
    notify(true, result.message)
  }

  async function removeConfirmed() {
    if (!confirmState || confirmState.kind !== 'delete') return
    const asset = confirmState.asset
    setConfirmState(null)
    setBusy(true)
    const result = await deleteMedia(asset.id)
    setBusy(false)
    if (!result.ok) return notify(false, result.message)
    setAssets((current) => current.filter((item) => item.id !== asset.id))
    notify(true, result.message)
  }

  async function copyUrl(asset: Asset) {
    try {
      await navigator.clipboard.writeText(asset.public_url)
      setCopiedId(asset.id)
      window.setTimeout(() => setCopiedId(null), 1800)
      notify(true, 'لینک عمومی تصویر کپی شد.')
    } catch {
      window.prompt('لینک تصویر را کپی کن:', asset.public_url)
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
    if (confirmState.kind === 'upload') return `تصویر «${file?.name ?? ''}» آپلود شود؟`
    if (confirmState.kind === 'delete') return `تصویر «${confirmState.asset.file_name}» حذف شود؟ اگر در سایت استفاده شده باشد، سیستم اجازه حذف نمی‌دهد.`
    return `Alt Text تصویر «${confirmState.asset.file_name}» تغییر کند؟`
  }

  return <>
    <section className="admin-panel">
      <h2>آپلود تصویر</h2>
      <p>فرمت‌های امن JPG، PNG، WebP و AVIF. حداکثر حجم هر فایل ۵ مگابایت است.</p>
      <div className="admin-form">
        <label>انتخاب فایل<input id="media-upload-input" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={onFile}/></label>
        <label>Alt Text<input maxLength={300} value={alt} onChange={(event) => setAlt(event.target.value)} placeholder="توضیح کوتاه و دقیق تصویر"/></label>
        {file ? <div className="admin-upload-preview"><img src={URL.createObjectURL(file)} alt="پیش‌نمایش فایل انتخاب‌شده"/><div><b>{file.name}</b><small>{Math.round(file.size / 1024)} KB</small></div></div> : null}
        <button className="admin-primary-button" type="button" disabled={busy || !file} onClick={() => setConfirmState({ kind: 'upload' })}>{busy ? 'در حال انجام عملیات…' : 'آپلود و ثبت در کتابخانه'}</button>
      </div>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><h2>کتابخانه رسانه</h2><span>{assets.length} فایل</span></div>
      {assets.length === 0 ? <div className="admin-empty">هنوز تصویری آپلود نشده.</div> : <div className="admin-media-grid">
        {assets.map((asset) => <article className="admin-media-card" key={asset.id}>
          <button type="button" className="admin-media-image-button" onClick={() => setPreviewAsset(asset)} aria-label={`پیش‌نمایش ${asset.file_name}`}><img src={asset.public_url} alt={asset.alt_text || asset.file_name}/></button>
          <div className="admin-media-meta"><b>{asset.file_name}</b><small>{asset.mime_type}{asset.size_bytes ? ` · ${Math.round(asset.size_bytes / 1024)} KB` : ''}</small></div>
          <label>Alt Text<input maxLength={300} value={altDrafts[asset.id] ?? ''} onChange={(event) => setAltDrafts((current) => ({ ...current, [asset.id]: event.target.value }))}/></label>
          <div className="admin-media-actions">
            <button type="button" className="admin-primary-button" disabled={busy || (altDrafts[asset.id] ?? '') === asset.alt_text} onClick={() => setConfirmState({ kind: 'alt', asset, value: altDrafts[asset.id] ?? '' })}>ذخیره Alt</button>
            <button type="button" className="admin-muted-button" onClick={() => setPreviewAsset(asset)}>پیش‌نمایش</button>
            <button type="button" className="admin-muted-button" onClick={() => copyUrl(asset)}>{copiedId === asset.id ? 'کپی شد ✓' : 'کپی لینک'}</button>
            <button type="button" className="admin-danger-button" onClick={() => setConfirmState({ kind: 'delete', asset })}>حذف تصویر</button>
          </div>
        </article>)}
      </div>}
    </section>

    {previewAsset ? <div className="admin-modal-backdrop" onMouseDown={() => setPreviewAsset(null)}><div className="admin-modal admin-media-preview-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><h3>{previewAsset.file_name}</h3><img className="admin-media-large-preview" src={previewAsset.public_url} alt={previewAsset.alt_text || previewAsset.file_name}/><p>{previewAsset.alt_text || 'Alt Text ثبت نشده است.'}</p><div className="admin-modal-actions"><button type="button" className="admin-muted-button" onClick={() => setPreviewAsset(null)}>بستن</button></div></div></div> : null}

    {confirmState ? <div className="admin-modal-backdrop" onMouseDown={() => !busy && setConfirmState(null)}><div className={`admin-modal ${confirmState.kind === 'delete' ? 'admin-modal-danger' : ''}`} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className="admin-modal-icon">{confirmState.kind === 'delete' ? '!' : '✓'}</div><h3>{confirmTitle()}</h3><p>{confirmMessage()}</p><div className="admin-modal-actions"><button type="button" className={confirmState.kind === 'delete' ? 'admin-danger-button' : 'admin-primary-button'} disabled={busy} onClick={confirmState.kind === 'upload' ? uploadConfirmed : confirmState.kind === 'delete' ? removeConfirmed : saveAltConfirmed}>{busy ? 'در حال انجام…' : 'بله، انجام شود'}</button><button type="button" className="admin-muted-button" disabled={busy} onClick={() => setConfirmState(null)}>انصراف</button></div></div></div> : null}

    {toast ? <div className={`admin-toast ${toast.ok ? 'admin-toast-success' : 'admin-toast-error'}`} role="status" aria-live="polite"><b>{toast.ok ? 'انجام شد' : 'خطا'}</b><span>{toast.message}</span><button type="button" onClick={() => setToast(null)}>×</button></div> : null}
  </>
}
