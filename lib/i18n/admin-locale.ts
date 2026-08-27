import {cookies} from 'next/headers'

export type AdminLocale='fa'|'en'
export async function getAdminLocale():Promise<AdminLocale>{
  const store=await cookies()
  return store.get('rava-admin-language')?.value==='en'?'en':'fa'
}
