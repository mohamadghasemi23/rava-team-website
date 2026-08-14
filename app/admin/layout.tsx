import './admin-media.css'
import './admin-shell.css'
import AdminSidebar from './components/AdminSidebar'
import { getAdminAccess } from '@/lib/security/permissions'

export default async function AdminLayout({children}:{children:React.ReactNode}){const access=await getAdminAccess();const canLogs=access.permissions.has('logs.view');const canErrors=access.permissions.has('errors.view');return <div className="admin-app"><AdminSidebar isSuperAdmin={access.isSuperAdmin} canLogs={canLogs} canErrors={canErrors} locale="fa"/><div className="admin-app-content">{children}</div></div>}
