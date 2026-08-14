type ErrorLike = { name?:string; code?:string|number; message?:string }

export function explainError(error: unknown, eventName = '') {
  const e: ErrorLike = error instanceof Error
    ? { name:error.name, message:error.message, code:(error as Error & {code?:string|number}).code }
    : typeof error === 'object' && error !== null ? error as ErrorLike : { message:String(error ?? '') }

  const name=String(e.name??'').toLowerCase()
  const code=String(e.code??'').toLowerCase()
  const message=String(e.message??'').toLowerCase()
  const haystack=`${eventName} ${name} ${code} ${message}`

  if(/23505|duplicate|unique/.test(haystack)) return {summaryFa:'ثبت اطلاعات انجام نشد چون یک مقدار تکراری وجود دارد.',causeFa:'مقداری که باید یکتا باشد، مثل آدرس صفحه یا شناسه، قبلاً در سیستم ثبت شده است.'}
  if(/23503|foreign key/.test(haystack)) return {summaryFa:'عملیات به دلیل وابستگی اطلاعات انجام نشد.',causeFa:'رکورد موردنظر به اطلاعات دیگری وابسته است یا شناسه مرتبط معتبر نیست.'}
  if(/42501|permission|policy|row-level|rls/.test(haystack)) return {summaryFa:'سیستم اجازه انجام این عملیات را نداد.',causeFa:'سطح دسترسی کاربر، نقش مدیریتی یا سیاست امنیتی دیتابیس با این عملیات سازگار نیست.'}
  if(/jwt|session|auth|unauthorized|401/.test(haystack)) return {summaryFa:'نشست کاربری یا احراز هویت معتبر نبود.',causeFa:'نشست ممکن است منقضی شده باشد، کاربر خارج شده باشد یا اعتبار احراز هویت قابل تأیید نباشد.'}
  if(/403|forbidden/.test(haystack)) return {summaryFa:'دسترسی به این عملیات مجاز نبود.',causeFa:'کاربر وارد شده است اما نقش یا مجوز لازم برای این بخش را ندارد.'}
  if(/404|not found|pgrst116/.test(haystack)) return {summaryFa:'اطلاعات موردنظر پیدا نشد.',causeFa:'رکورد یا مسیر درخواست‌شده وجود ندارد، حذف شده یا شناسه ارسالی معتبر نیست.'}
  if(/timeout|abort|timed out|504/.test(haystack)) return {summaryFa:'عملیات در زمان مجاز کامل نشد.',causeFa:'پاسخ سرویس، دیتابیس یا شبکه بیش از حد طول کشیده و درخواست متوقف شده است.'}
  if(/network|fetch failed|econn|enotfound|socket/.test(haystack)) return {summaryFa:'ارتباط با یکی از سرویس‌ها برقرار نشد.',causeFa:'اختلال شبکه، DNS، سرویس خارجی یا اتصال موقت می‌تواند علت این خطا باشد.'}
  if(/storage|upload|mime|file/.test(haystack)) return {summaryFa:'عملیات فایل یا رسانه با خطا مواجه شد.',causeFa:'فرمت، حجم، مسیر فایل، دسترسی Storage یا ارتباط با سرویس ذخیره‌سازی باید بررسی شود.'}
  if(/rate|too many|429/.test(haystack)) return {summaryFa:'تعداد درخواست‌ها بیش از حد مجاز بوده است.',causeFa:'سیستم برای جلوگیری از سوءاستفاده یا فشار زیاد، درخواست‌های متوالی را موقتاً محدود کرده است.'}
  if(/turnstile|captcha/.test(haystack)) return {summaryFa:'تأیید امنیتی ورود معتبر نبود.',causeFa:'CAPTCHA کامل نشده، منقضی شده، دامنه معتبر نبوده یا تأیید سمت سرور موفق نشده است.'}

  return {
    summaryFa:'یک خطای غیرمنتظره در اجرای عملیات رخ داده است.',
    causeFa:'علت دقیق از روی نوع و کد خطا، مسیر اجرا و Metadata امن همین لاگ قابل بررسی است. برای تشخیص قطعی باید جزئیات فنی این رکورد بررسی شود.'
  }
}
