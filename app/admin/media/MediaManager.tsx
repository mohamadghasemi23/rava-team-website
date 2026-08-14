'use client'

import { ChangeEvent, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Asset = { id:string; storage_path:string; file_name:string; mime_type:string; alt_text:string; size_bytes:number|null; created_at:string }
type Toast = { ok:boolean; message:string } | null
type ConfirmState = { kind:'upload' } | { kind:'delete'; asset:Asset } | { kind:'alt'; asset:Asset; value:string } | null

type Props = { initialAssets:Asset[]; initialTotal:number; userId:string; pageSize:number }

export default function MediaManager({ initialAssets, initialTotal, userId, pageSize }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [assets,setAssets]=useState(initialAssets)
  const [total,setTotal]=useState(initialTotal)
  const [page,setPage]=useState(1)
  const [search,setSearch]=useState('')
  const [mime,setMime]=useState('all')
  const [sort,setSort]=useState('newest')
  const [loadingList,setLoadingList]=useState(false)
  const [file,setFile]=useState<File|null>(null)
  const [alt,setAlt]=useState('')
  const [busy,setBusy]=useState(false)
  const [toast,setToast]=useState<Toast>(null)
  const [confirmState,setConfirmState]=useState<ConfirmState>(null)
  const [previewAsset,setPreviewAsset]=useState<Asset|null>(null)
  const [altDrafts,setAltDrafts]=useState<Record<string,string>>(()=>Object.fromEntries(initialAssets.map(a=>[a.id,a.alt_text])))
  const [copiedId,setCopiedId]=useState<string|null>(null)

  const totalPages=Math.max(1,Math.ceil(total/pageSize))
  function publicUrl(path:string){return supabase.storage.from('rava-media').getPublicUrl(path).data.publicUrl}
  function notify(ok:boolean,message:string){setToast({ok,message});window.setTimeout(()=>setToast(null),4200)}

  async function loadAssets(nextPage=1,nextSearch=search,nextMime=mime,nextSort=sort){
    setLoadingList(true)
    let query=supabase.from('media_assets').select('id,storage_path,file_name,mime_type,alt_text,size_bytes,created_at',{count:'exact'}).is('deleted_at',null)
    const q=nextSearch.trim().replace(/[%_,()]/g,' ')
    if(q) query=query.or(`file_name.ilike.%${q}%,alt_text.ilike.%${q}%`)
    if(nextMime!=='all') query=query.eq('mime_type',nextMime)
    if(nextSort==='oldest') query=query.order('created_at',{ascending:true})
    else if(nextSort==='name') query=query.order('file_name',{ascending:true})
    else query=query.order('created_at',{ascending:false})
    const from=(nextPage-1)*pageSize
    const {data,count,error}=await query.range(from,from+pageSize-1)
    setLoadingList(false)
    if(error)return notify(false,`بارگذاری کتابخانه انجام نشد: ${error.message}`)
    const rows=(data??[]) as Asset[]
    setAssets(rows);setTotal(count??0);setPage(nextPage);setAltDrafts(Object.fromEntries(rows.map(a=>[a.id,a.alt_text])))
  }

  function applyFilters(){loadAssets(1,search,mime,sort)}
  function resetFilters(){setSearch('');setMime('all');setSort('newest');loadAssets(1,'','all','newest')}

  function onFile(event:ChangeEvent<HTMLInputElement>){const next=event.target.files?.[0]??null;if(!next)return;if(!next.type.startsWith('image/'))return notify(false,'فقط فایل تصویری مجاز است.');if(next.size>10*1024*1024)return notify(false,'حجم فایل باید کمتر از ۱۰ مگابایت باشد.');setFile(next);if(!alt)setAlt(next.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' '))}

  async function uploadConfirmed(){if(!file)return;setConfirmState(null);setBusy(true);const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-');const path=`${userId}/${Date.now()}-${crypto.randomUUID()}-${safe}`;const uploaded=await supabase.storage.from('rava-media').upload(path,file,{cacheControl:'31536000',upsert:false,contentType:file.type});if(uploaded.error){setBusy(false);return notify(false,`آپلود انجام نشد: ${uploaded.error.message}`)}const inserted=await supabase.from('media_assets').insert({storage_path:path,file_name:file.name,mime_type:file.type,alt_text:alt.trim(),size_bytes:file.size,uploaded_by:userId}).select('id').single();if(inserted.error){await supabase.storage.from('rava-media').remove([path]);setBusy(false);return notify(false,`ثبت اطلاعات فایل انجام نشد: ${inserted.error.message}`)}setFile(null);setAlt('');setBusy(false);const input=document.getElementById('media-upload-input') as HTMLInputElement|null;if(input)input.value='';notify(true,'تصویر با موفقیت آپلود و در کتابخانه رسانه ثبت شد.');await loadAssets(1)}

  async function saveAltConfirmed(){if(!confirmState||confirmState.kind!=='alt')return;const{asset,value}=confirmState;setConfirmState(null);setBusy(true);const result=await supabase.from('media_assets').update({alt_text:value}).eq('id',asset.id);setBusy(false);if(result.error)return notify(false,`ویرایش انجام نشد: ${result.error.message}`);setAssets(current=>current.map(item=>item.id===asset.id?{...item,alt_text:value}:item));notify(true,'Alt Text تصویر با موفقیت روی سرور ویرایش شد.')}

  async function removeConfirmed(){if(!confirmState||confirmState.kind!=='delete')return;const asset=confirmState.asset;setConfirmState(null);setBusy(true);const storageResult=await supabase.storage.from('rava-media').remove([asset.storage_path]);if(storageResult.error){setBusy(false);return notify(false,`حذف فایل انجام نشد: ${storageResult.error.message}`)}const dbResult=await supabase.from('media_assets').delete().eq('id',asset.id);setBusy(false);if(dbResult.error)return notify(false,`حذف رکورد انجام نشد: ${dbResult.error.message}`);notify(true,'تصویر با موفقیت از Storage و کتابخانه رسانه حذف شد.');await loadAssets(Math.min(page,Math.max(1,Math.ceil((total-1)/pageSize))))}

  async function copyUrl(asset:Asset){const url=publicUrl(asset.storage_path);try{await navigator.clipboard.writeText(url);setCopiedId(asset.id);window.setTimeout(()=>setCopiedId(null),1800);notify(true,'لینک عمومی تصویر در کلیپ‌بورد کپی شد.')}catch{window.prompt('لینک تصویر را کپی کن:',url)}}

  function confirmTitle(){if(!confirmState)return'';if(confirmState.kind==='upload')return'تأیید آپلود تصویر';if(confirmState.kind==='delete')return'حذف تصویر';return'تأیید ویرایش Alt Text'}
  function confirmMessage(){if(!confirmState)return'';if(confirmState.kind==='upload')return`تصویر «${file?.name??''}» روی سرور آپلود و در کتابخانه ثبت شود؟`;if(confirmState.kind==='delete')return`تصویر «${confirmState.asset.file_name}» برای همیشه از Storage و کتابخانه رسانه حذف شود؟`;return`Alt Text تصویر «${confirmState.asset.file_name}» به «${confirmState.value||'بدون متن'}» تغییر کند؟`}

  return <>
    <section className="admin-panel"><h2>آپلود تصویر</h2><p>تصویر را از گوشی یا کامپیوتر انتخاب کن. حداکثر حجم هر فایل ۱۰ مگابایت است.</p><div className="admin-form"><label>انتخاب فایل<input id="media-upload-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" onChange={onFile}/></label><label>Alt Text<input value={alt} onChange={e=>setAlt(e.target.value)} placeholder="توضیح کوتاه و دقیق تصویر"/></label>{file?<div className="admin-upload-preview"><img src={URL.createObjectURL(file)} alt="پیش‌نمایش فایل انتخاب‌شده"/><div><b>{file.name}</b><small>{Math.round(file.size/1024)} KB</small></div></div>:null}<button className="admin-primary-button" type="button" disabled={busy||!file} onClick={()=>setConfirmState({kind:'upload'})}>{busy?'در حال انجام عملیات…':'آپلود و ثبت در کتابخانه'}</button></div></section>

    <section className="admin-panel"><div className="admin-section-title"><h2>کتابخانه رسانه</h2><span>{total} فایل</span></div>
      <div className="admin-media-toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')applyFilters()}} placeholder="جستجو در نام فایل یا Alt Text…"/><select value={mime} onChange={e=>setMime(e.target.value)}><option value="all">همه فرمت‌ها</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option><option value="image/gif">GIF</option><option value="image/svg+xml">SVG</option></select><select value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">جدیدترین</option><option value="oldest">قدیمی‌ترین</option><option value="name">نام فایل</option></select><button type="button" className="admin-primary-button" onClick={applyFilters} disabled={loadingList}>اعمال</button><button type="button" className="admin-muted-button" onClick={resetFilters} disabled={loadingList}>پاک کردن فیلترها</button></div>
      <div className="admin-library-status"><span>صفحه {page} از {totalPages}</span>{loadingList?<b>در حال بارگذاری…</b>:<span>نمایش {assets.length} مورد</span>}</div>
      {assets.length===0?<div className="admin-empty">فایلی با این فیلتر پیدا نشد.</div>:<div className="admin-media-grid">{assets.map(asset=><article className="admin-media-card" key={asset.id}><button type="button" className="admin-media-image-button" onClick={()=>setPreviewAsset(asset)}><img src={publicUrl(asset.storage_path)} alt={asset.alt_text||asset.file_name}/></button><div className="admin-media-meta"><b>{asset.file_name}</b><small>{asset.mime_type}{asset.size_bytes?` · ${Math.round(asset.size_bytes/1024)} KB`:''}</small></div><label>Alt Text<input value={altDrafts[asset.id]??''} onChange={e=>setAltDrafts(current=>({...current,[asset.id]:e.target.value}))}/></label><div className="admin-media-actions"><button type="button" className="admin-primary-button" disabled={busy||(altDrafts[asset.id]??'')===asset.alt_text} onClick={()=>setConfirmState({kind:'alt',asset,value:altDrafts[asset.id]??''})}>ذخیره Alt</button><button type="button" className="admin-muted-button" onClick={()=>setPreviewAsset(asset)}>پیش‌نمایش</button><button type="button" className="admin-muted-button" onClick={()=>copyUrl(asset)}>{copiedId===asset.id?'کپی شد ✓':'کپی لینک'}</button><button type="button" className="admin-danger-button" onClick={()=>setConfirmState({kind:'delete',asset})}>حذف تصویر</button></div></article>)}</div>}
      <div className="admin-pagination"><button type="button" className="admin-muted-button" disabled={page<=1||loadingList} onClick={()=>loadAssets(page-1)}>صفحه قبل</button><span>{page} / {totalPages}</span><button type="button" className="admin-muted-button" disabled={page>=totalPages||loadingList} onClick={()=>loadAssets(page+1)}>صفحه بعد</button></div>
    </section>

    {previewAsset?<div className="admin-modal-backdrop" onMouseDown={()=>setPreviewAsset(null)}><div className="admin-modal admin-media-preview-modal" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}><h3>{previewAsset.file_name}</h3><img className="admin-media-large-preview" src={publicUrl(previewAsset.storage_path)} alt={previewAsset.alt_text||previewAsset.file_name}/><p>{previewAsset.alt_text||'Alt Text ثبت نشده است.'}</p><div className="admin-modal-actions"><button type="button" className="admin-muted-button" onClick={()=>setPreviewAsset(null)}>بستن</button></div></div></div>:null}
    {confirmState?<div className="admin-modal-backdrop" onMouseDown={()=>!busy&&setConfirmState(null)}><div className={`admin-modal ${confirmState.kind==='delete'?'admin-modal-danger':''}`} role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}><div className="admin-modal-icon">{confirmState.kind==='delete'?'!':'✓'}</div><h3>{confirmTitle()}</h3><p>{confirmMessage()}</p><div className="admin-modal-actions"><button type="button" className={confirmState.kind==='delete'?'admin-danger-button':'admin-primary-button'} disabled={busy} onClick={confirmState.kind==='upload'?uploadConfirmed:confirmState.kind==='delete'?removeConfirmed:saveAltConfirmed}>{busy?'در حال انجام…':'بله، انجام شود'}</button><button type="button" className="admin-muted-button" disabled={busy} onClick={()=>setConfirmState(null)}>انصراف</button></div></div></div>:null}
    {toast?<div className={`admin-toast ${toast.ok?'admin-toast-success':'admin-toast-error'}`} role="status" aria-live="polite"><b>{toast.ok?'انجام شد':'خطا'}</b><span>{toast.message}</span><button type="button" onClick={()=>setToast(null)}>×</button></div>:null}
  </>
}
