import './admin-media.css'
import './admin-shell.css'
import './admin-experience.css'
import AdminShell from './components/AdminShell'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
