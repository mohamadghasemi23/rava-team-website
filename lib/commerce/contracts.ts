export const COMMERCE_MODULES=['catalog','inventory','cart','checkout','orders','payments','customers','discounts','shipping'] as const
export type CommerceModule=typeof COMMERCE_MODULES[number]
export const COMMERCE_ARCHETYPES={
 'brand-store':{labelFa:'فروشگاه برند',modules:['catalog','inventory','cart','checkout','orders','payments','customers','discounts','shipping']},
 'marketplace-ready':{labelFa:'مارکت‌پلیس آماده توسعه',modules:['catalog','inventory','cart','checkout','orders','payments','customers','discounts','shipping']},
 'catalog-only':{labelFa:'کاتالوگ بدون خرید آنلاین',modules:['catalog','inventory']},
 'service-commerce':{labelFa:'فروش خدمات',modules:['catalog','cart','checkout','orders','payments','customers','discounts']}
} as const

export const COMMERCE_THEME_SLOTS=['commerceHeader','categoryNav','productCard','productGallery','productInfo','filters','search','cart','checkout','orderStatus'] as const

/* RAVA commerce invariants:
- Every row is tenant-scoped.
- Product data is independent from presentation/theme.
- Vendor is optional today but modeled so multi-vendor does not require a destructive schema rewrite later.
- Orders snapshot mutable customer/product facts at purchase time.
- Payment providers are adapters; checkout never trusts browser redirect as proof of payment.
- Payment callbacks must be verified server-side and idempotent.
- Never persist PAN/CVV/provider secrets in commerce tables, logs or analytics.
- Inventory mutation will be transactional; UI-side stock checks are advisory only.
- Modules/entitlements decide capability visibility; archetypes are presets, not permanent site types.
*/
