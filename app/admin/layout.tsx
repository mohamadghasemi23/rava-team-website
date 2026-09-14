import './admin-media.css'
import './admin-shell.css'
import AdminShell from './components/AdminShell'
import { requireRavaStaff } from '@/lib/auth/require-staff'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRavaStaff()
  return <AdminShell>{children}</AdminShell>
}
