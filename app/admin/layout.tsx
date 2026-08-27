import '@fontsource-variable/vazirmatn'
import '@fontsource-variable/estedad'
import '@fontsource-variable/noto-sans-arabic'
import './admin-media.css'
import './admin-shell.css'
import './admin-experience.css'
import AdminShell from './components/AdminShell'
import {getAdminLocale} from '@/lib/i18n/admin-locale'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale=await getAdminLocale()
  return <AdminShell initialLanguage={locale}>{children}</AdminShell>
}
