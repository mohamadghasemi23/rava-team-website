export type CommercialTier = 'core' | 'premium' | 'enterprise'
export type ModuleStatus = 'active' | 'beta' | 'deprecated' | 'disabled'

export type PlatformModule = {
  key: string
  name: { fa: string; en: string }
  category: string
  core: boolean
  commercialTier: CommercialTier
  status: ModuleStatus
}

export const PLATFORM_MODULES = [
  { key: 'cms', name: { fa: 'مدیریت محتوا', en: 'CMS' }, category: 'content', core: true, commercialTier: 'core', status: 'active' },
  { key: 'media', name: { fa: 'رسانه', en: 'Media' }, category: 'content', core: true, commercialTier: 'core', status: 'active' },
  { key: 'seo_core', name: { fa: 'سئوی پایه', en: 'SEO Core' }, category: 'growth', core: true, commercialTier: 'core', status: 'active' },
  { key: 'analytics_core', name: { fa: 'آمار پایه', en: 'Analytics Core' }, category: 'analytics', core: true, commercialTier: 'core', status: 'active' },
  { key: 'security', name: { fa: 'امنیت', en: 'Security' }, category: 'platform', core: true, commercialTier: 'core', status: 'active' },
  { key: 'help', name: { fa: 'راهنما و آموزش', en: 'Help & Academy' }, category: 'platform', core: true, commercialTier: 'core', status: 'active' },
  { key: 'commerce', name: { fa: 'فروشگاه', en: 'Commerce' }, category: 'commerce', core: false, commercialTier: 'premium', status: 'active' },
  { key: 'crm', name: { fa: 'مدیریت مشتری', en: 'CRM' }, category: 'sales', core: false, commercialTier: 'premium', status: 'active' },
  { key: 'automation', name: { fa: 'اتوماسیون', en: 'Automation' }, category: 'growth', core: false, commercialTier: 'premium', status: 'active' },
  { key: 'seo_ai', name: { fa: 'سئوی هوشمند', en: 'AI SEO' }, category: 'ai', core: false, commercialTier: 'premium', status: 'active' },
  { key: 'analytics_pro', name: { fa: 'آمار پیشرفته', en: 'Advanced Analytics' }, category: 'analytics', core: false, commercialTier: 'premium', status: 'active' },
  { key: 'booking', name: { fa: 'رزرو', en: 'Booking' }, category: 'operations', core: false, commercialTier: 'premium', status: 'active' },
  { key: 'membership', name: { fa: 'عضویت و اشتراک', en: 'Membership' }, category: 'commerce', core: false, commercialTier: 'premium', status: 'active' },
  { key: 'loyalty', name: { fa: 'باشگاه مشتریان', en: 'Loyalty' }, category: 'growth', core: false, commercialTier: 'premium', status: 'active' },
  { key: 'support', name: { fa: 'تیکت و پشتیبانی', en: 'Support' }, category: 'operations', core: false, commercialTier: 'premium', status: 'active' },
] as const satisfies readonly PlatformModule[]

export type PlatformModuleKey = (typeof PLATFORM_MODULES)[number]['key']

export const CORE_MODULE_KEYS = PLATFORM_MODULES.filter((module) => module.core).map((module) => module.key)

export function isCoreModule(moduleKey: string) {
  return CORE_MODULE_KEYS.includes(moduleKey as PlatformModuleKey)
}
