'use client'

import { useMemo, useState } from 'react'
import { setProjectCover, addProjectMedia, removeProjectMedia, moveProjectMedia } from './media-actions'

type Asset = { id:string; storage_path:string; file_name:string; alt_text:string }
type GalleryItem = { media_id:string; sort_order:number; caption:string|null; media_assets:Asset|null }

export default function ProjectMediaEditor({ projectId, assets, coverMediaId, gallery }: { projectId:string; assets:Asset[]; coverMediaId:string|null; gallery:GalleryItem[] }) {
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [cover,setCover]=useState(coverMediaId ?? '')
  const [items,setItems]=useState(gallery)

  const byId=useMemo(()=>Object.fromEntries(assets.map(a=>[a.id,a])),[assets])
  const url=(asset?:Asset|null)=>asset?`/api/media/public?path=${encodeURIComponent(asset.storage_path)}`:''

  async function run(fn:()=>Promise<void>){
    setBusy(true);setMessage('')
    try{await fn()}catch{setMessage('عملیات انجام نشد.')}
    setBusy(false)
  }

  async function changeCover(value:string){
    setCover(value)
    await run(async()=>{await setProjectCover(projectId,value||null);setMessage('کاور پروژه ذخیره شد.')})
  }

  async function add(mediaId:string){
    if(!mediaId||items.some(i=>i.media_id===mediaId))return
    await run(async()=>{
      await addProjectMedia(projectId,mediaId)
      const asset=byId[mediaId]
      setItems(current=>[...current,{media_id:mediaId,sort_order:current.length,caption:null,media_assets:asset}])
      setMessage('تصویر به گالری اضافه شد.')
    })
  }

  async function remove(mediaId:string){
    await run(async()=>{
      await removeProjectMedia(projectId,mediaId)
      setItems(current=>current.filter(i=>i.media_id!==mediaId).map((i,index)=>({...i,sort_order:index})))
      setMessage('تصویر از گالری حذف شد.')
    })
  }

  async function move(mediaId:string,direction:-1|1){
    const index=items.findIndex(i=>i.media_id===mediaId);const target=index+direction
    if(index<0||target<0||target>=items.length)return
    const next=[...items];[next[index],next[target]]=[next[target],next[index]];next.forEach((item,i)=>item.sort_order=i)
    setItems(next)
    await run(async()=>{await moveProjectMedia(projectId,next.map(i=>i.media_id));setMessage('ترتیب گالری ذخیره شد.')})
  }

  return <section className="admin-panel">
    <div className="admin-section-title"><h2>تصاویر پروژه و اسلایدر</h2><span>{items.length} تصویر</span></div>
    <p>کاور برای کارت پروژه استفاده می‌شود؛ گالری با همین ترتیب وارد Slider/Case Study می‌شود. آپلود فایل جدید فقط از کتابخانه رسانه انجام می‌شود.</p>

    <label>کاور پروژه
      <select value={cover} disabled={busy} onChange={e=>changeCover(e.target.value)}>
        <option value="">بدون کاور</option>
        {assets.map(asset=><option value={asset.id} key={asset.id}>{asset.file_name}</option>)}
      </select>
    </label>
    {cover&&byId[cover]?<div className="admin-media-picker-preview"><img src={url(byId[cover])} alt={byId[cover].alt_text||byId[cover].file_name}/></div>:null}

    <label>افزودن تصویر به گالری
      <select defaultValue="" disabled={busy} onChange={e=>{const value=e.target.value;e.currentTarget.value='';void add(value)}}>
        <option value="">یک تصویر انتخاب کن…</option>
        {assets.filter(asset=>!items.some(i=>i.media_id===asset.id)).map(asset=><option value={asset.id} key={asset.id}>{asset.file_name}</option>)}
      </select>
    </label>

    {!items.length?<div className="admin-empty">هنوز تصویری برای اسلایدر این پروژه انتخاب نشده.</div>:<div className="admin-media-grid">
      {items.map((item,index)=>{
        const asset=item.media_assets??byId[item.media_id]
        if(!asset)return null
        return <article className="admin-media-card" key={item.media_id}>
          <img src={url(asset)} alt={asset.alt_text||asset.file_name}/>
          <div className="admin-media-meta"><b>{index+1}. {asset.file_name}</b><small>{asset.alt_text||'Alt Text ندارد'}</small></div>
          <div className="admin-media-actions">
            <button type="button" className="admin-muted-button" disabled={busy||index===0} onClick={()=>move(item.media_id,-1)}>بالاتر</button>
            <button type="button" className="admin-muted-button" disabled={busy||index===items.length-1} onClick={()=>move(item.media_id,1)}>پایین‌تر</button>
            <button type="button" className="admin-danger-button" disabled={busy} onClick={()=>remove(item.media_id)}>حذف از گالری</button>
          </div>
        </article>
      })}
    </div>}
    {message?<p role="status">{message}</p>:null}
  </section>
}
