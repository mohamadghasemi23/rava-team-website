import '@fontsource-variable/vazirmatn'
import '@fontsource-variable/estedad'
import '@fontsource-variable/noto-sans-arabic'
import './admin-media.css'
import './admin-shell.css'
import './admin-experience.css'
import AdminShell from './components/AdminShell'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
