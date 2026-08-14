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
  folder: string
  title: string
  description: string
  caption: string
  credit: string
}

type Toast = { ok: boolean; message: string } | null
type Draft = Pick<Asset, 'title' | 'description' | 'alt_text' | 'caption' | 'credit' | 'folder'>
type ConfirmState =
  | { kind: 'upload' }
  | { kind: 'metadata'; asset: Asset }
  | { kind: 'delete'; asset: Asset }
  | { kind: 'bulk-delete' }
  | { kind: 'bulk-move'; folder: string }
  | null

type Props = { initialAssets: Asset[]; initialTotal: number; userId: string; pageSize: number }
const FOLDERS = ['general', 'hero', 'projects', 'branding']

export default function MediaManager({ initialAssets, initialTotal, userId, pageSize }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [assets, setAssets] = useState(initialAssets)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [mime, setMime] = useState('all')
  const [folder, setFolder] = useState('all')
  const [sort, setSort] = useState('newest')
  const [loadingList, setLoadingList] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadFolder, setUploadFolder] = useState('general')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadAlt, setUploadAlt] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadCaption, setUploadCaption] = useState('')
  const [uploadCredit, setUploadCredit] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => Object.fromEntries(initialAssets.map((a) => [a.id, assetDraft(a)])))
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkFolder, setBulkFolder] = useState('general')

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const selectedAssets = assets.filter((a) => selected.has(a.id))
  const allVisibleSelected = assets.length > 0 && assets.every((a) => selected.has(a.id))

  function assetDraft(asset: Asset): Draft {
    return {
      title: asset.title ?? '',
      description: asset.description ?? '',
      alt_text: asset.alt_text ?? '',
      caption: asset.caption ?? '',
      credit: asset.credit ?? '',
      folder: asset.folder ?? 'general',
    }
  }

  function publicUrl(path: string) {
    return supabase.storage.from('rava-media').getPublicUrl(path).data.publicUrl
  }

  function notify(ok: boolean, message: string) {
    setToast({ ok, message })
    window.setTimeout(() => setToast(null), 4200)
  }

  async function loadAssets(nextPage = 1, nextSearch = search, nextMime = mime, nextFolder = folder, nextSort = sort) {
    setLoadingList(true)
    let query = supabase
      .from('media_assets')
      .select('id,storage_path,file_name,mime_type,alt_text,size_bytes,created_at,folder,title,description,caption,credit', { count: 'exact' })
      .is('deleted_at', null)

    const q = nextSearch.trim().replace(/[%_,()]/g, ' ')
    if (q) query = query.or(`file_name.ilike.%${q}%,title.ilike.%${q}%,alt_text.ilike.%${q}%,description.ilike.%${q}%`)
    if (nextMime !== 'all') query = query.eq('mime_type', nextMime)
    if (nextFolder !== 'all') query = query.eq('folder', nextFolder)
    if (nextSort === 'oldest') query = query.order('created_at', { ascending: true })
    else if (nextSort === 'name') query = query.order('file_name', { ascending: true })
    else query = query.order('created_at', { ascending: false })

    const from = (nextPage - 1) * pageSize
    const { data, count, error } = await query.range(from, from + pageSize - 1)
    setLoadingList(false)
    if (error) return notify(false, `بارگذاری کتابخانه انجام نشد: ${error.message}`)
    const rows = (data ?? []) as Asset[]
    setAssets(rows)
    setTotal(count ?? 0)
    setPage(nextPage)
    setSelected(new Set())
    setDrafts(Object.fromEntries(rows.map((a) => [a.id, assetDraft(a)])))
  }

  function applyFilters() { loadAssets(1, search, mime, folder, sort) }
  function resetFilters() {
    setSearch(''); setMime('all'); setFolder('all'); setSort('newest')
    loadAssets(1, '', 'all', 'all', 'newest')
  }
  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleAllVisible() {
    setSelected((current) => {
      const next = new Set(current)
      if (allVisibleSelected) assets.forEach((a) => next.delete(a.id))
      else assets.forEach((a) => next.add(a.id))
      return next
    })
  }
  function updateDraft(id: string, key: keyof Draft, value: string) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [key]: value } }))
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null
    if (!next) return
    if (!next.type.startsWith('image/')) return notify(false, 'فقط فایل تصویری مجاز است.')
    if (next.size > 10 * 1024 * 1024) return notify(false, 'حجم فایل باید کمتر از ۱۰ مگابایت باشد.')
    setFile(next)
    const clean = next.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
    if (!uploadTitle) setUploadTitle(clean)
    if (!uploadAlt) setUploadAlt(clean)
  }

  async function uploadConfirmed() {
    if (!file) return
    setConfirmState(null); setBusy(true)
    const safe = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')
    const path = `${userId}/${Date.now()}-${crypto.randomUUID()}-${safe}`
    const uploaded = await supabase.storage.from('rava-media').upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type })
    if (uploaded.error) { setBusy(false); return notify(false, `آپلود انجام نشد: ${uploaded.error.message}`) }

    const inserted = await supabase.from('media_assets').insert({
      storage_path: path,
      file_name: file.name,
      mime_type: file.type,
      alt_text: uploadAlt.trim(),
      title: uploadTitle.trim(),
      description: uploadDescription.trim(),
      caption: uploadCaption.trim(),
      credit: uploadCredit.trim(),
      folder: uploadFolder,
      size_bytes: file.size,
      uploaded_by: userId,
    }).select('id').single()

    if (inserted.error) {
      await supabase.storage.from('rava-media').remove([path])
      setBusy(false)
      return notify(false, `ثبت اطلاعات فایل انجام نشد: ${inserted.error.message}`)
    }

    setFile(null); setUploadTitle(''); setUploadAlt(''); setUploadDescription(''); setUploadCaption(''); setUploadCredit(''); setBusy(false)
    const input = document.getElementById('media-upload-input') as HTMLInputElement | null
    if (input) input.value = ''
    notify(true, 'تصویر و متادیتای آن با موفقیت ثبت شد.')
    await loadAssets(1)
  }

  async function saveMetadataConfirmed() {
    if (!confirmState || confirmState.kind !== 'metadata') return
    const asset = confirmState.asset
    const draft = drafts[asset.id]
    setConfirmState(null); setBusy(true)
    const { error } = await supabase.from('media_assets').update({
      title: draft.title.trim(),
      description: draft.description.trim(),
      alt_text: draft.alt_text.trim(),
      caption: draft.caption.trim(),
      credit: draft.credit.trim(),
      folder: draft.folder,
    }).eq('id', asset.id)
    setBusy(false)
    if (error) return notify(false, `ویرایش متادیتا انجام نشد: ${error.message}`)
    setAssets((current) => current.map((item) => item.id === asset.id ? { ...item, ...draft } : item))
    notify(true, 'اطلاعات رسانه با موفقیت ویرایش شد.')
  }

  async function softDeleteConfirmed() {
    if (!confirmState || confirmState.kind !== 'delete') return
    const asset = confirmState.asset
    setConfirmState(null); setBusy(true)
    const { error } = await supabase.from('media_assets').update({ deleted_at: new Date().toISOString() }).eq('id', asset.id)
    setBusy(false)
    if (error) return notify(false, `انتقال به سطل زباله انجام نشد: ${error.message}`)
    notify(true, 'فایل به سطل زباله منتقل شد.')
    await loadAssets(Math.min(page, Math.max(1, Math.ceil((total - 1) / pageSize))))
  }

  async function bulkMoveConfirmed() {
    if (!confirmState || confirmState.kind !== 'bulk-move') return
    const target = confirmState.folder
    const ids = [...selected]
    setConfirmState(null); setBusy(true)
    const { error } = await supabase.from('media_assets').update({ folder: target }).in('id', ids)
    setBusy(false)
    if (error) return notify(false, `جابه‌جایی گروهی انجام نشد: ${error.message}`)
    notify(true, `${ids.length} فایل به پوشه «${target}» منتقل شد.`)
    await loadAssets(page)
  }

  async function bulkDeleteConfirmed() {
    if (!confirmState || confirmState.kind !== 'bulk-delete') return
    const ids = [...selected]
    setConfirmState(null); setBusy(true)
    const { error } = await supabase.from('media_assets').update({ deleted_at: new Date().toISOString() }).in('id', ids)
    setBusy(false)
    if (error) return notify(false, `انتقال گروهی به سطل زباله انجام نشد: ${error.message}`)
    notify(true, `${ids.length} فایل به سطل زباله منتقل شد.`)
    await loadAssets(Math.min(page, Math.max(1, Math.ceil((total - ids.length) / pageSize))))
  }

  async function copyUrl(asset: Asset) {
    const url = publicUrl(asset.storage_path)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(asset.id)
      window.setTimeout(() => setCopiedId(null), 1800)
      notify(true, 'لینک عمومی تصویر کپی شد.')
    } catch {
      window.prompt('لینک تصویر را کپی کن:', url)
    }
  }

  function confirmTitle() {
    if (!confirmState) return ''
    if (confirmState.kind === 'upload') return 'تأیید آپلود تصویر'
    if (confirmState.kind === 'metadata') return 'ذخیره اطلاعات رسانه'
    if (confirmState.kind === 'delete') return 'انتقال به سطل زباله'
    if (confirmState.kind === 'bulk-delete') return 'انتقال گروهی به سطل زباله'
    return 'جابه‌جایی گروهی رسانه‌ها'
  }

  function confirmMessage() {
    if (!confirmState) return ''
    if (confirmState.kind === 'upload') return `تصویر «${file?.name ?? ''}» همراه اطلاعات واردشده روی سرور ثبت شود؟`
    if (confirmState.kind === 'metadata') return `تغییرات اطلاعات «${confirmState.asset.file_name}» ذخیره شود؟`
    if (confirmState.kind === 'delete') return `تصویر «${confirmState.asset.file_name}» به سطل زباله منتقل شود؟`
    if (confirmState.kind === 'bulk-delete') return `${selected.size} فایل انتخاب‌شده به سطل زباله منتقل شوند؟`
    return `${selected.size} فایل انتخاب‌شده به پوشه «${confirmState.folder}» منتقل شوند؟`
  }

  return <>
    <section className="admin-panel">
      <h2>آپلود تصویر</h2>
      <p>فایل را انتخاب کن و اطلاعات پایه آن را همان ابتدا ثبت کن.</p>
      <div className="admin-form">
        <label>انتخاب فایل<input id="media-upload-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" onChange={onFile}/></label>
        <div className="admin-grid-2">
          <label>عنوان<input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="عنوان داخلی/نمایشی"/></label>
          <label>Alt Text<input value={uploadAlt} onChange={(e) => setUploadAlt(e.target.value)} placeholder="توضیح برای SEO و دسترس‌پذیری"/></label>
        </div>
        <div className="admin-grid-2">
          <label>پوشه<select value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)}>{FOLDERS.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
          <label>Credit<input value={uploadCredit} onChange={(e) => setUploadCredit(e.target.value)} placeholder="عکاس / منبع"/></label>
        </div>
        <label>توضیحات داخلی<textarea rows={3} value={uploadDescription} onChange={(e) => setUploadDescription(e.target.value)}/></label>
        <label>Caption<textarea rows={2} value={uploadCaption} onChange={(e) => setUploadCaption(e.target.value)} placeholder="کپشن اختیاری برای نمایش در سایت"/></label>
        {file ? <div className="admin-upload-preview"><img src={URL.createObjectURL(file)} alt="پیش‌نمایش فایل انتخاب‌شده"/><div><b>{file.name}</b><small>{Math.round(file.size / 1024)} KB</small></div></div> : null}
        <button className="admin-primary-button" type="button" disabled={busy || !file} onClick={() => setConfirmState({ kind: 'upload' })}>{busy ? 'در حال انجام…' : 'آپلود و ثبت در کتابخانه'}</button>
      </div>
    </section>

    <section className="admin-panel">
      <div className="admin-section-title"><h2>کتابخانه رسانه</h2><span>{total} فایل</span></div>
      <div className="admin-media-toolbar">
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') applyFilters() }} placeholder="جستجو در نام، عنوان، Alt یا توضیحات…"/>
        <select value={folder} onChange={(e) => setFolder(e.target.value)}><option value="all">همه پوشه‌ها</option>{FOLDERS.map((x) => <option key={x} value={x}>{x}</option>)}</select>
        <select value={mime} onChange={(e) => setMime(e.target.value)}><option value="all">همه فرمت‌ها</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option><option value="image/gif">GIF</option><option value="image/svg+xml">SVG</option></select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">جدیدترین</option><option value="oldest">قدیمی‌ترین</option><option value="name">نام فایل</option></select>
        <button type="button" className="admin-primary-button" onClick={applyFilters} disabled={loadingList}>اعمال</button>
        <button type="button" className="admin-muted-button" onClick={resetFilters} disabled={loadingList}>پاک کردن</button>
      </div>
      <div className="admin-library-status"><span>صفحه {page} از {totalPages}</span>{loadingList ? <b>در حال بارگذاری…</b> : <span>نمایش {assets.length} مورد</span>}</div>
      <div className="admin-bulk-bar">
        <label><input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible}/> انتخاب همه این صفحه</label>
        <span>{selected.size} انتخاب‌شده</span>
        <select value={bulkFolder} onChange={(e) => setBulkFolder(e.target.value)}>{FOLDERS.map((x) => <option key={x} value={x}>{x}</option>)}</select>
        <button type="button" className="admin-muted-button" disabled={selected.size === 0 || busy} onClick={() => setConfirmState({ kind: 'bulk-move', folder: bulkFolder })}>انتقال گروهی</button>
        <button type="button" className="admin-danger-button" disabled={selected.size === 0 || busy} onClick={() => setConfirmState({ kind: 'bulk-delete' })}>انتقال به سطل زباله</button>
      </div>

      {assets.length === 0 ? <div className="admin-empty">فایلی با این فیلتر پیدا نشد.</div> : <div className="admin-media-grid">
        {assets.map((asset) => {
          const draft = drafts[asset.id] ?? assetDraft(asset)
          const dirty = JSON.stringify(draft) !== JSON.stringify(assetDraft(asset))
          return <article className={`admin-media-card ${selected.has(asset.id) ? 'is-selected' : ''}`} key={asset.id}>
            <label className="admin-media-select-check"><input type="checkbox" checked={selected.has(asset.id)} onChange={() => toggleSelected(asset.id)}/><span>{asset.folder}</span></label>
            <button type="button" className="admin-media-image-button" onClick={() => setPreviewAsset(asset)}><img src={publicUrl(asset.storage_path)} alt={asset.alt_text || asset.file_name}/></button>
            <div className="admin-media-meta"><b>{asset.title || asset.file_name}</b><small>{asset.file_name}</small><small>{asset.mime_type}{asset.size_bytes ? ` · ${Math.round(asset.size_bytes / 1024)} KB` : ''}</small></div>
            <details className="admin-media-details">
              <summary>ویرایش اطلاعات</summary>
              <div className="admin-form">
                <label>عنوان<input value={draft.title} onChange={(e) => updateDraft(asset.id, 'title', e.target.value)}/></label>
                <label>Alt Text<input value={draft.alt_text} onChange={(e) => updateDraft(asset.id, 'alt_text', e.target.value)}/></label>
                <label>پوشه<select value={draft.folder} onChange={(e) => updateDraft(asset.id, 'folder', e.target.value)}>{FOLDERS.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
                <label>توضیحات<textarea rows={3} value={draft.description} onChange={(e) => updateDraft(asset.id, 'description', e.target.value)}/></label>
                <label>Caption<textarea rows={2} value={draft.caption} onChange={(e) => updateDraft(asset.id, 'caption', e.target.value)}/></label>
                <label>Credit<input value={draft.credit} onChange={(e) => updateDraft(asset.id, 'credit', e.target.value)}/></label>
                <button type="button" className="admin-primary-button" disabled={!dirty || busy} onClick={() => setConfirmState({ kind: 'metadata', asset })}>ذخیره اطلاعات</button>
              </div>
            </details>
            <div className="admin-media-actions">
              <button type="button" className="admin-muted-button" onClick={() => setPreviewAsset(asset)}>پیش‌نمایش</button>
              <button type="button" className="admin-muted-button" onClick={() => copyUrl(asset)}>{copiedId === asset.id ? 'کپی شد ✓' : 'کپی لینک'}</button>
              <button type="button" className="admin-danger-button" onClick={() => setConfirmState({ kind: 'delete', asset })}>حذف</button>
            </div>
          </article>
        })}
      </div>}
      <div className="admin-pagination"><button type="button" className="admin-muted-button" disabled={page <= 1 || loadingList} onClick={() => loadAssets(page - 1)}>صفحه قبل</button><span>{page} / {totalPages}</span><button type="button" className="admin-muted-button" disabled={page >= totalPages || loadingList} onClick={() => loadAssets(page + 1)}>صفحه بعد</button></div>
    </section>

    {previewAsset ? <div className="admin-modal-backdrop" onMouseDown={() => setPreviewAsset(null)}><div className="admin-modal admin-media-preview-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}><h3>{previewAsset.title || previewAsset.file_name}</h3><img className="admin-media-large-preview" src={publicUrl(previewAsset.storage_path)} alt={previewAsset.alt_text || previewAsset.file_name}/><p>{previewAsset.caption || previewAsset.description || previewAsset.alt_text || 'توضیحی ثبت نشده است.'}</p>{previewAsset.credit ? <small>Credit: {previewAsset.credit}</small> : null}<div className="admin-modal-actions"><button type="button" className="admin-muted-button" onClick={() => setPreviewAsset(null)}>بستن</button></div></div></div> : null}

    {confirmState ? <div className="admin-modal-backdrop" onMouseDown={() => !busy && setConfirmState(null)}><div className={`admin-modal ${confirmState.kind === 'delete' || confirmState.kind === 'bulk-delete' ? 'admin-modal-danger' : ''}`} role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}><div className="admin-modal-icon">{confirmState.kind === 'delete' || confirmState.kind === 'bulk-delete' ? '!' : '✓'}</div><h3>{confirmTitle()}</h3><p>{confirmMessage()}</p><div className="admin-modal-actions"><button type="button" className={confirmState.kind === 'delete' || confirmState.kind === 'bulk-delete' ? 'admin-danger-button' : 'admin-primary-button'} disabled={busy} onClick={confirmState.kind === 'upload' ? uploadConfirmed : confirmState.kind === 'metadata' ? saveMetadataConfirmed : confirmState.kind === 'delete' ? softDeleteConfirmed : confirmState.kind === 'bulk-delete' ? bulkDeleteConfirmed : bulkMoveConfirmed}>{busy ? 'در حال انجام…' : 'بله، انجام شود'}</button><button type="button" className="admin-muted-button" disabled={busy} onClick={() => setConfirmState(null)}>انصراف</button></div></div></div> : null}

    {toast ? <div className={`admin-toast ${toast.ok ? 'admin-toast-success' : 'admin-toast-error'}`} role="status" aria-live="polite"><b>{toast.ok ? 'انجام شد' : 'خطا'}</b><span>{toast.message}</span><button type="button" onClick={() => setToast(null)}>×</button></div> : null}
  </>
}
