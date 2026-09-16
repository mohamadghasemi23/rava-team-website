export type PublicServiceFallback = {
  id: string
  title: string
  slug: string
  summary: string
  body: string
}

export type PublicProjectFallback = {
  id: string
  title: string
  slug: string
  summary: string
  project_kind: 'real' | 'concept'
  client_name: string | null
  project_year: number
  role_text: string
  scope: string[]
  kpis: string[]
  featured: boolean
  coverUrl: string
  gallery: string[]
  body: string
}

export const publicServiceFallbacks: PublicServiceFallback[] = [
  {
    id: 'fallback-web-design',
    title: 'طراحی وب',
    slug: 'web-design',
    summary: 'وب‌سایت‌هایی واضح، سریع و فروش‌محور برای تبدیل بازدیدکننده به مشتری.',
    body: 'طراحی وب در راوا از مسئله کسب‌وکار شروع می‌شود؛ ساختار محتوا، تجربه کاربر، ظاهر و مسیر تبدیل در کنار هم طراحی می‌شوند تا خروجی فقط زیبا نباشد، بلکه قابل استفاده و نتیجه‌محور باشد.',
  },
  {
    id: 'fallback-web-development',
    title: 'توسعه وب',
    slug: 'web-development',
    summary: 'توسعه امن و مقیاس‌پذیر با معماری متناسب با نیاز واقعی پروژه.',
    body: 'پیاده‌سازی فنی با تمرکز بر سرعت، امنیت، نگه‌داری ساده و امکان رشد انجام می‌شود. تکنولوژی بر اساس نیاز واقعی پروژه انتخاب می‌شود، نه صرفاً مد روز.',
  },
  {
    id: 'fallback-ecommerce',
    title: 'فروشگاه اینترنتی',
    slug: 'ecommerce',
    summary: 'فروشگاه با تجربه خرید ساده، مدیریت آسان و زیرساخت آماده رشد.',
    body: 'از مسیر انتخاب محصول تا سبد خرید و مدیریت محتوا، فروشگاه باید برای مشتری ساده و برای تیم کسب‌وکار قابل کنترل باشد. راوا این دو سمت تجربه را هم‌زمان طراحی می‌کند.',
  },
  {
    id: 'fallback-digital-products',
    title: 'محصولات دیجیتال',
    slug: 'digital-products',
    summary: 'پنل، داشبورد، ابزار داخلی و پلتفرم اختصاصی برای مسئله‌های واقعی.',
    body: 'برای محصولاتی که فراتر از یک سایت معمولی هستند، راوا ساختار، تجربه و توسعه را با نگاه محصولی پیش می‌برد؛ از پنل و داشبورد تا ابزارهای داخلی و پلتفرم‌های اختصاصی.',
  },
  {
    id: 'fallback-brand-content',
    title: 'برندینگ و محتوا',
    slug: 'brand-content',
    summary: 'هویت و محتوای یکپارچه برای ساختن تصویری قابل تشخیص از برند.',
    body: 'هویت بصری، جهت خلاقانه و محتوا باید یک تصویر واحد از برند بسازند. این سرویس برای هماهنگ‌کردن ظاهر، پیام و اجرای محتوایی برند طراحی شده است.',
  },
  {
    id: 'fallback-ai-automation',
    title: 'AI و اتوماسیون',
    slug: 'ai-automation',
    summary: 'راهکارهای هوشمند برای ساده‌سازی فرایندها، تحلیل داده و ابزارهای داخلی.',
    body: 'هوش مصنوعی زمانی ارزشمند است که یک کار واقعی را سریع‌تر، دقیق‌تر یا قابل‌اندازه‌گیری‌تر کند. تمرکز راوا روی کاربردهای عملی AI و اتوماسیون است، نه اضافه‌کردن قابلیت‌های نمایشی.',
  },
]

export const publicProjectFallbacks: PublicProjectFallback[] = [
  {
    id: 'rava-traffic',
    title: 'RAVA Traffic Engine',
    slug: 'rava-traffic-engine',
    summary: 'محصول داخلی راوا برای زیرساخت رشد ارگانیک، داده و اتوماسیون.',
    project_kind: 'real',
    client_name: 'RAVA',
    project_year: 2026,
    role_text: 'Strategy / Product / Development',
    scope: ['SEO', 'Automation', 'Data'],
    kpis: ['In Development', 'Modular Architecture', 'Organic Growth'],
    featured: true,
    coverUrl: '',
    gallery: [],
    body: 'Traffic Engine یک محصول داخلی RAVA است که برای ساخت و مدیریت زیرساخت رشد ارگانیک، تحلیل محتوا و توسعه دارایی‌های دیجیتال طراحی می‌شود. هدف پروژه ساخت یک سیستم قابل‌اندازه‌گیری برای تصمیم‌گیری بهتر و رشد پایدار است.',
  },
  {
    id: 'ali-topol',
    title: 'Ali Topol Store',
    slug: 'ali-topol-store',
    summary: 'فروشگاه اینترنتی پوشاک سایزبزرگ با تمرکز بر تجربه خرید ساده و مدیریت آسان.',
    project_kind: 'real',
    client_name: 'Ali Topol',
    project_year: 2026,
    role_text: 'UX / Development',
    scope: ['E-commerce', 'UX', 'Development'],
    kpis: ['In Development'],
    featured: false,
    coverUrl: '',
    gallery: [],
    body: 'Ali Topol Store یک پروژه فروشگاهی در حال توسعه برای پوشاک مردانه سایزبزرگ است. تمرکز محصول روی ساده‌سازی انتخاب سایز، ارائه واضح محصول و ساخت پنل مدیریتی سبک و قابل استفاده است.',
  },
  {
    id: 'nova',
    title: 'NOVA',
    slug: 'nova-concept',
    summary: 'کانسپت فروشگاه دیجیتال برای یک برند مد معاصر.',
    project_kind: 'concept',
    client_name: null,
    project_year: 2026,
    role_text: 'Concept / Design',
    scope: ['E-commerce', 'Art Direction'],
    kpis: ['Concept Project'],
    featured: false,
    coverUrl: '',
    gallery: [],
    body: 'NOVA یک Concept Project است و به‌عنوان پروژه مشتری معرفی نمی‌شود. هدف آن نمایش جهت طراحی و تجربه فروشگاهی RAVA برای یک برند مد معاصر است.',
  },
  {
    id: 'luma',
    title: 'LUMA',
    slug: 'luma-concept',
    summary: 'کانسپت محصول دیجیتال و داشبورد SaaS.',
    project_kind: 'concept',
    client_name: null,
    project_year: 2026,
    role_text: 'Concept / Product',
    scope: ['SaaS', 'Dashboard'],
    kpis: ['Concept Project'],
    featured: false,
    coverUrl: '',
    gallery: [],
    body: 'LUMA یک Concept Project برای نمایش رویکرد RAVA در طراحی داشبورد و محصول دیجیتال است و پروژه واقعی مشتری محسوب نمی‌شود.',
  },
]

export function findServiceFallback(slug: string) {
  return publicServiceFallbacks.find((service) => service.slug === slug)
}

export function findProjectFallback(slug: string) {
  return publicProjectFallbacks.find((project) => project.slug === slug)
}
