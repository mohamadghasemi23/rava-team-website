'use client'

import {createContext,useContext} from 'react'

export type AdminLanguage='fa'|'en'
export const AdminLocaleContext=createContext<{language:AdminLanguage;setLanguage:(language:AdminLanguage)=>void}>({language:'fa',setLanguage:()=>undefined})
export function useAdminLocale(){return useContext(AdminLocaleContext)}
