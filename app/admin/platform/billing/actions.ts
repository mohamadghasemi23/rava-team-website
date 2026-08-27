'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createTraceContext, recordErrorEvent } from '@/lib/observability/events'
import { getAdminLocale } from '@/lib/i18n/admin-locale'

export type BillingActionState = { ok?: boolean; message?: string; errorId?: string; redirectTo?: string; nonce?: number }

function text(formData: FormData, key: string) { return String(formData.get(key) ?? '').trim() }
function optional(value: string) { return value || null }
function integer(value: string, fallback = 0) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}
function numberValue(value: string, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
function isoOrNull(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
async function translator(){const locale=await getAdminLocale();return{locale,l:(fa:string,en:string)=>locale==='fa'?fa:en}}

async function failure(error: unknown, eventType: string, message: string, context: Record<string, unknown> = {}): Promise<BillingActionState> {
  const{locale}=await translator()
  const trace = createTraceContext()
  const logged = await recordErrorEvent({
    error,
    category: 'billing',
    eventType,
    publicMessage: message,
    route: '/admin/platform/billing',
    context,
    requestId: trace.requestId,
    correlationId: trace.correlationId,
    severity: 'warning',
    explanationFa: 'عملیات مالی کامل نشد. علت می‌تواند ورودی نامعتبر، دسترسی ناکافی یا خطای تراکنش دیتابیس باشد.',
    explanationEn: 'The billing operation did not complete due to invalid input, insufficient permission, or a database transaction error.',
  })
  const first = Array.isArray(logged.data) ? logged.data[0] : logged.data
  const errorId = first && typeof first === 'object' && 'error_id' in first ? String(first.error_id) : undefined
  return { ok: false, message: errorId ? `${message} ${locale==='fa'?'شناسه خطا':'Error ID'}: ${errorId}` : message, errorId, nonce: Date.now() }
}

export async function createContractAction(_state: BillingActionState, formData: FormData): Promise<BillingActionState> {
  const{l}=await translator()
  const organizationId = text(formData, 'organization_id')
  const contractNumber = text(formData, 'contract_number').toUpperCase()
  const planId = optional(text(formData, 'plan_id'))
  const siteIds = formData.getAll('site_ids').map(String).filter(Boolean)
  const currency = (text(formData, 'currency') || 'IRR').toUpperCase()
  const baseAmountMinor = integer(text(formData, 'base_amount_minor'))
  const billingInterval = text(formData, 'billing_interval') || 'monthly'
  const startsAt = isoOrNull(text(formData, 'starts_at'))
  const endsAt = isoOrNull(text(formData, 'ends_at'))
  const autoRenew = formData.get('auto_renew') === 'on'

  if (!organizationId || !/^[A-Z0-9_-]{3,64}$/.test(contractNumber) || !/^[A-Z]{3}$/.test(currency) || baseAmountMinor < 0) {
    return { ok: false, message: l('اطلاعات قرارداد معتبر نیست.','The contract information is invalid.'), nonce: Date.now() }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_customer_contract', {
    p_organization_id: organizationId,
    p_contract_number: contractNumber,
    p_plan_id: planId,
    p_site_ids: siteIds,
    p_currency: currency,
    p_base_amount_minor: baseAmountMinor,
    p_billing_interval: billingInterval,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_auto_renew: autoRenew,
  })
  if (error) return failure(error, 'billing.contract.create_failed', l('ساخت قرارداد انجام نشد.','The contract could not be created.'), { organizationId, contractNumber, planId, siteIds })
  const contractId = typeof data === 'string' ? data : undefined
  revalidatePath('/admin/platform/billing')
  return { ok: true, message: l('قرارداد ساخته شد.','The contract was created.'), redirectTo: contractId ? `/admin/platform/billing/${contractId}` : undefined, nonce: Date.now() }
}

export async function activateContractAction(_state: BillingActionState, formData: FormData): Promise<BillingActionState> {
  const{l}=await translator()
  const contractId = text(formData, 'contract_id')
  if (!contractId) return { ok: false, message: l('شناسه قرارداد معتبر نیست.','The contract ID is invalid.'), nonce: Date.now() }
  const supabase = await createClient()
  const { error } = await supabase.rpc('activate_contract', { p_contract_id: contractId })
  if (error) return failure(error, 'billing.contract.activate_failed', l('فعال‌سازی قرارداد انجام نشد.','The contract could not be activated.'), { contractId })
  revalidatePath(`/admin/platform/billing/${contractId}`)
  revalidatePath('/admin/platform/billing')
  return { ok: true, message: l('قرارداد فعال و دسترسی‌های تجاری همگام شدند.','The contract was activated and entitlements were synchronized.'), nonce: Date.now() }
}

export async function upsertEntitlementAction(_state: BillingActionState, formData: FormData): Promise<BillingActionState> {
  const{l}=await translator()
  const contractId = text(formData, 'contract_id')
  const siteId = optional(text(formData, 'site_id'))
  const moduleKey = text(formData, 'module_key')
  const tier = text(formData, 'tier') || 'premium'
  const enabled = formData.get('enabled') !== null
  const endsAt = isoOrNull(text(formData, 'ends_at'))
  let limits: Record<string, unknown> = {}
  let config: Record<string, unknown> = {}
  try { limits = text(formData, 'limits') ? JSON.parse(text(formData, 'limits')) : {} } catch { return { ok:false,message:l('ساختار محدودیت‌ها معتبر نیست.','Limits must be valid JSON.'),nonce:Date.now() } }
  try { config = text(formData, 'config') ? JSON.parse(text(formData, 'config')) : {} } catch { return { ok:false,message:l('ساختار تنظیمات معتبر نیست.','Configuration must be valid JSON.'),nonce:Date.now() } }
  if (!contractId || !moduleKey) return { ok:false,message:l('قرارداد و ماژول الزامی هستند.','A contract and module are required.'),nonce:Date.now() }

  const supabase = await createClient()
  const { error } = await supabase.rpc('upsert_contract_entitlement', {
    p_contract_id: contractId,
    p_site_id: siteId,
    p_module_key: moduleKey,
    p_enabled: enabled,
    p_tier: tier,
    p_limits: limits,
    p_config: config,
    p_ends_at: endsAt,
  })
  if (error) return failure(error, 'billing.entitlement.upsert_failed', l('ثبت دسترسی تجاری انجام نشد.','The entitlement could not be saved.'), { contractId, siteId, moduleKey, tier })
  revalidatePath(`/admin/platform/billing/${contractId}`)
  return { ok:true,message:l('دسترسی تجاری قرارداد ذخیره و روی سایت همگام شد.','The contract entitlement was saved and synchronized to the site.'),nonce:Date.now() }
}

export async function setMeterPriceAction(_state: BillingActionState, formData: FormData): Promise<BillingActionState> {
  const{l}=await translator()
  const contractId = text(formData, 'contract_id')
  const meterKey = text(formData, 'meter_key')
  const included = numberValue(text(formData, 'included_quantity'))
  const unitPrice = integer(text(formData, 'unit_price_minor'))
  const softText = text(formData, 'soft_limit')
  const hardText = text(formData, 'hard_limit')
  const softLimit = softText ? numberValue(softText) : null
  const hardLimit = hardText ? numberValue(hardText) : null
  if (!contractId || !meterKey || included < 0 || unitPrice < 0) return { ok:false,message:l('تنظیم سنجه مصرف معتبر نیست.','The usage-meter configuration is invalid.'),nonce:Date.now() }
  const supabase = await createClient()
  const { error } = await supabase.rpc('set_contract_meter_price', {
    p_contract_id: contractId,
    p_meter_key: meterKey,
    p_included_quantity: included,
    p_unit_price_minor: unitPrice,
    p_soft_limit: softLimit,
    p_hard_limit: hardLimit,
  })
  if (error) return failure(error, 'billing.meter.update_failed', l('تنظیم قیمت یا سقف مصرف انجام نشد.','The usage price or limit could not be configured.'), { contractId, meterKey })
  revalidatePath(`/admin/platform/billing/${contractId}`)
  return { ok:true,message:l('قیمت و سقف مصرف ذخیره شد.','The usage price and limit were saved.'),nonce:Date.now() }
}

export async function issueInvoiceAction(_state: BillingActionState, formData: FormData): Promise<BillingActionState> {
  const{l}=await translator()
  const contractId = text(formData, 'contract_id')
  const invoiceNumber = text(formData, 'invoice_number').toUpperCase()
  const periodStart = isoOrNull(text(formData, 'period_start'))
  const periodEnd = isoOrNull(text(formData, 'period_end'))
  const dueAt = isoOrNull(text(formData, 'due_at'))
  if (!contractId || !invoiceNumber || !periodStart || !periodEnd || !dueAt) return { ok:false,message:l('اطلاعات صورتحساب کامل نیست.','The invoice information is incomplete.'),nonce:Date.now() }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('issue_contract_invoice', {
    p_contract_id: contractId,
    p_invoice_number: invoiceNumber,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_due_at: dueAt,
  })
  if (error) return failure(error, 'billing.invoice.issue_failed', l('صدور صورتحساب انجام نشد.','The invoice could not be issued.'), { contractId, invoiceNumber })
  revalidatePath(`/admin/platform/billing/${contractId}`)
  return { ok:true,message:l(`صورتحساب صادر شد${typeof data === 'string' ? ` · ${data}` : ''}.`,`Invoice issued${typeof data === 'string' ? ` · ${data}` : ''}.`),nonce:Date.now() }
}

export async function recordPaymentAction(_state: BillingActionState, formData: FormData): Promise<BillingActionState> {
  const{l}=await translator()
  const invoiceId = text(formData, 'invoice_id')
  const provider = text(formData, 'provider')
  const amount = integer(text(formData, 'amount_minor'))
  const providerReference = optional(text(formData, 'provider_reference'))
  const receivedAt = isoOrNull(text(formData, 'received_at'))
  if (!invoiceId || provider.length < 2 || amount <= 0) return { ok:false,message:l('اطلاعات پرداخت معتبر نیست.','The payment information is invalid.'),nonce:Date.now() }
  const supabase = await createClient()
  const { error } = await supabase.rpc('record_invoice_payment', {
    p_invoice_id: invoiceId,
    p_provider: provider,
    p_amount_minor: amount,
    p_provider_reference: providerReference,
    p_received_at: receivedAt,
    p_metadata: {},
  })
  if (error) return failure(error, 'billing.payment.record_failed', l('ثبت پرداخت انجام نشد.','The payment could not be recorded.'), { invoiceId, provider, amount })
  revalidatePath('/admin/platform/billing')
  return { ok:true,message:l('پرداخت ثبت و وضعیت صورتحساب به‌روزرسانی شد.','The payment was recorded and the invoice status was updated.'),nonce:Date.now() }
}
