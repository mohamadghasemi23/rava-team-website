import fs from'node:fs';import path from'node:path';
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),'utf8'),fail=[];const migrationDir=path.join(root,'supabase/migrations'),files=fs.readdirSync(migrationDir).filter(x=>x.endsWith('.sql')).sort();
const prefixes=new Map();for(const f of files){const p=f.match(/^(\d{14})/i)?.[1];if(!p)continue;if(prefixes.has(p))fail.push(`Duplicate migration timestamp ${p}: ${prefixes.get(p)}, ${f}`);else prefixes.set(p,f)}
const all=files.map(f=>read(`supabase/migrations/${f}`)).join('\n');const orchestrator=read('lib/commerce/payment-orchestrator.ts'),payments=read('lib/commerce/payments.ts'),checkout=read('app/api/storefront/checkout/route.ts');
for(const key of['commerce.core','inventory.pro','procurement.pro'])if(!all.includes(`'${key}'`))fail.push(`Missing commercial entitlement catalog key: ${key}`);
if(!all.includes('payment_transactions_status_check'))fail.push('Payment legacy/new status reconciliation migration missing');
if(!all.includes('numeric(20,4)'))fail.push('Global exact payment decimal schema missing');
if(orchestrator.includes('Math.trunc(Number(o.grand_total))'))fail.push('Payment amount truncation regression detected');
if(!payments.includes('amount:string'))fail.push('Payment adapter Money.amount must remain exact decimal string');
if(!all.includes('commit_verified_payment'))fail.push('Atomic verified payment commit missing');
if(!orchestrator.includes('assertGatewayCompatible'))fail.push('Gateway currency/country compatibility check missing');
if(!orchestrator.includes("has_entitlement")||!orchestrator.includes("commerce.core"))fail.push('Server-side commerce entitlement gate missing in payment orchestration');
if(!all.includes('order_inventory_reservations'))fail.push('Atomic checkout inventory reservation foundation missing');
if(!all.includes('revoke all on function public.create_storefront_order(uuid,jsonb,jsonb,text) from anon'))fail.push('Direct anonymous checkout RPC execution must remain revoked');
if(!checkout.includes('createServiceClient'))fail.push('Storefront checkout writes must cross the trusted service boundary');
if(!checkout.includes("'Cache-Control':'no-store'"))fail.push('Checkout responses must remain non-cacheable');
if(!all.includes('payment.verified_inventory_exception'))fail.push('Verified-payment inventory exception reconciliation missing');
if(fail.length){console.error('\nRAVA Commerce Audit FAILED\n- '+fail.join('\n- '));process.exit(1)}console.log(`RAVA Commerce Audit OK · ${files.length} migrations checked`);
