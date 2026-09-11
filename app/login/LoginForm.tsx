'use client'

import {useActionState} from 'react'
import {login,type LoginState} from './actions'

const initialState:LoginState={}

export default function LoginForm({next}:{next?:string}){
 const[state,action,pending]=useActionState(login,initialState)
 return <form action={action} className="auth-form">
  {next?<input type="hidden" name="next" value={next}/>:null}
  <label htmlFor="email">ایمیل</label>
  <input id="email" name="email" type="email" autoComplete="email" required inputMode="email"/>
  <label htmlFor="password">رمز عبور</label>
  <input id="password" name="password" type="password" autoComplete="current-password" required minLength={8}/>
  {state.error?<p className="auth-error" role="alert">{state.error}</p>:null}
  <button type="submit" disabled={pending}>{pending?'در حال ورود…':'ورود امن'}</button>
 </form>
}
