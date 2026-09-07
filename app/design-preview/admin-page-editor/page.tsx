import '@fontsource-variable/noto-sans-arabic'
import {redirect} from 'next/navigation'
import AdminEditorV2Preview from './AdminEditorV2Preview'
import {PERMISSIONS,requirePermission} from '@/lib/authz/permissions'
import {createClient} from '@/lib/supabase/server'

export default async function AdminPageEditorPreview(){
 const supabase=await createClient()
 const{data}=await supabase.auth.getClaims()
 if(!data?.claims?.sub)redirect('/login?next=%2Fdesign-preview%2Fadmin-page-editor')
 await requirePermission(PERMISSIONS.PLATFORM_SITES_MANAGE,{},'/admin')
 return <AdminEditorV2Preview/>
}
