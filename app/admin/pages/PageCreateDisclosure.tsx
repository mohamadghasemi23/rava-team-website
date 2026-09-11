'use client'

import {useActionState,useEffect,useState} from 'react'
import {useRouter} from 'next/navigation'
import {useAdminLocale} from '../components/AdminLocale'
import {createPage,type AdminActionState} from './actions'

const initialState:AdminActionState={}

export default function PageCreateDisclosure({siteId}:{siteId:string}){
 const {language}=useAdminLocale(),l=(fa:string,en:string)=>language==='fa'?fa:en
 const [open,setOpen]=useState(false),[state,formAction,pending]=useActionState(createPage,initialState)
 const router=useRouter()
 useEffect(()=>{if(state.ok&&state.redirectTo)router.push(state.redirectTo)},[router,state])
 return <div className="rava-page-create">
  <button className="rava-page-create-trigger" type="button" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{open?l('بستن','Close'):l('ساخت صفحه','Create page')}</button>
  {open?<form action={formAction} className="rava-page-create-form" aria-busy={pending}>
   <input type="hidden" name="site_id" value={siteId}/>
   <label>{l('نام صفحه','Page name')}<input name="title" required minLength={2} maxLength={160} placeholder={l('برای نمونه: درباره ما','For example: About us')}/></label>
   <label>{l('آدرس صفحه','Page address')}<input name="slug" required dir="ltr" placeholder="about"/></label>
   <button className="admin-primary-button" type="submit" disabled={pending}>{pending?l('در حال ساخت…','Creating…'):l('ساخت و ویرایش صفحه','Create and edit page')}</button>
   {state.message&&!state.ok?<p className="rava-page-create-error" role="alert">{state.message}</p>:null}
  </form>:null}
 </div>
}
