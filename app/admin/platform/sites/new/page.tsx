import Link from 'next/link'
import ActionForm from '@/app/admin/components/ActionForm'
import { provisionSiteAction } from '../actions'
import { PERMISSIONS, requirePermission } from '@/lib/authz/permissions'
import {getAdminLocale} from '@/lib/i18n/admin-locale'

export default async function NewPlatformSitePage() {
  const locale=await getAdminLocale(),l=(fa:string,en:string)=>locale==='fa'?fa:en
  await requirePermission(PERMISSIONS.PLATFORM_ORGANIZATIONS_MANAGE)

  return (
    <main className="admin-shell">
      <div className="admin-head">
        <div>
          <span className="eyebrow">{l('مرکز مدیریت مالک راوا','RAVA OWNER CONTROL PLANE')}</span>
          <h1>{l('ساخت مشتری و سایت جدید','Create a customer and site')}</h1>
          <p>{l('این عملیات مشتری، نخستین سایت، محیط‌های پیش‌نمایش، آزمایشی و اصلی و امکانات پایه را یکجا ایجاد می‌کند.','This operation creates the customer, first site, preview, staging and production environments, and core capabilities together.')}</p>
        </div>
        <Link className="admin-muted-button" href="/admin/platform/sites">{l('بازگشت','Back')}</Link>
      </div>

      <section className="admin-panel">
        <ActionForm
          action={provisionSiteAction}
          className="admin-form"
          confirmTitle={l('ساخت سایت جدید','Create a site')}
          confirmMessage={l('مشتری، سایت، محیط‌ها و امکانات پایه در یک عملیات ساخته شوند؟','Create the customer, site, environments, and core capabilities in one operation?')}
          confirmLabel={l('بله، سایت ساخته شود','Yes, create site')}
        >
          <label>
            {l('نام مشتری یا سازمان','Customer or organization name')}
            <input name="organization_name" required minLength={2} maxLength={120} placeholder={l('شرکت نمونه','Example Company')} />
          </label>
          <label>
            {l('شناسه مشتری','Customer identifier')}
            <input name="organization_slug" required minLength={2} maxLength={63} pattern="[a-z0-9][a-z0-9-]{1,62}" placeholder="example-company" dir="ltr" />
          </label>
          <label>
            {l('نام سایت','Site name')}
            <input name="site_name" required minLength={2} maxLength={120} placeholder={l('وب‌سایت اصلی','Main website')} />
          </label>
          <label>
            {l('شناسه سایت','Site identifier')}
            <input name="site_slug" required minLength={2} maxLength={63} pattern="[a-z0-9][a-z0-9-]{1,62}" placeholder="main" dir="ltr" />
          </label>
          <label>
            {l('زبان اصلی','Primary language')}
            <select name="primary_locale" defaultValue="fa">
              <option value="fa">{l('فارسی','Persian')}</option>
              <option value="en">{l('انگلیسی','English')}</option>
            </select>
          </label>
          <label>
            {l('واحد پول','Currency')}
            <select name="default_currency" defaultValue="IRR">
              <option value="IRR">{l('ریال ایران','Iranian rial')}</option>
              <option value="USD">{l('دلار آمریکا','US dollar')}</option>
              <option value="EUR">{l('یورو','Euro')}</option>
              <option value="AED">{l('درهم امارات','UAE dirham')}</option>
            </select>
          </label>
          <label>
            {l('منطقه زمانی','Time zone')}
            <input name="timezone" defaultValue="Asia/Tehran" required minLength={3} maxLength={64} dir="ltr" />
          </label>
          <button className="admin-primary-button" type="submit">{l('ساخت مشتری و سایت','Create customer and site')}</button>
        </ActionForm>
      </section>
    </main>
  )
}
