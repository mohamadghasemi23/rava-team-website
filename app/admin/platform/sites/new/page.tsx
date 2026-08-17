import Link from 'next/link'
import ActionForm from '@/app/admin/components/ActionForm'
import { provisionSiteAction } from '../actions'
import { PERMISSIONS, requirePermission } from '@/lib/authz/permissions'

export default async function NewPlatformSitePage() {
  await requirePermission(PERMISSIONS.PLATFORM_ORGANIZATIONS_MANAGE)

  return (
    <main className="admin-shell">
      <div className="admin-head">
        <div>
          <span className="eyebrow">RAVA OWNER CONTROL PLANE</span>
          <h1>ساخت مشتری و سایت جدید</h1>
          <p>این عملیات Organization، اولین Site، محیط‌های Preview/Staging/Production و ماژول‌های Core را یکجا ایجاد می‌کند.</p>
        </div>
        <Link className="admin-muted-button" href="/admin/platform/sites">بازگشت</Link>
      </div>

      <section className="admin-panel">
        <ActionForm
          action={provisionSiteAction}
          className="admin-form"
          confirmTitle="ساخت سایت جدید"
          confirmMessage="مشتری، سایت، محیط‌ها و امکانات پایه در یک عملیات ساخته شوند؟"
          confirmLabel="بله، سایت ساخته شود"
        >
          <label>
            نام مشتری / سازمان
            <input name="organization_name" required minLength={2} maxLength={120} placeholder="Example Company" />
          </label>
          <label>
            شناسه مشتری
            <input name="organization_slug" required minLength={2} maxLength={63} pattern="[a-z0-9][a-z0-9-]{1,62}" placeholder="example-company" dir="ltr" />
          </label>
          <label>
            نام سایت
            <input name="site_name" required minLength={2} maxLength={120} placeholder="Main Website" />
          </label>
          <label>
            شناسه سایت
            <input name="site_slug" required minLength={2} maxLength={63} pattern="[a-z0-9][a-z0-9-]{1,62}" placeholder="main" dir="ltr" />
          </label>
          <label>
            زبان اصلی
            <select name="primary_locale" defaultValue="fa">
              <option value="fa">فارسی (FA)</option>
              <option value="en">English (EN)</option>
            </select>
          </label>
          <label>
            واحد پول
            <select name="default_currency" defaultValue="IRR">
              <option value="IRR">IRR — ریال ایران</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="AED">AED — UAE Dirham</option>
            </select>
          </label>
          <label>
            منطقه زمانی
            <input name="timezone" defaultValue="Asia/Tehran" required minLength={3} maxLength={64} dir="ltr" />
          </label>
          <button className="admin-primary-button" type="submit">ساخت مشتری و سایت</button>
        </ActionForm>
      </section>
    </main>
  )
}
