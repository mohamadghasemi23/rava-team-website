# RAVA site archetypes and commerce foundation

## Principle
RAVA is not a portfolio-only CMS. A tenant starts from an archetype preset, but real behavior is controlled by independent modules. Content and design remain separate from commerce/service capabilities.

## Archetypes
- Portfolio
- Services
- Commerce
- Hybrid
- Custom

Archetypes only select a sensible initial module set. They do not permanently limit a tenant.

## Modules
Core module registry: portfolio, services, blog, catalog, cart, orders, checkout, payments, booking.
Each module declares dependencies. Disabling a dependency must be blocked or handled as a controlled migration.

## Commerce boundary
Commerce will be implemented as tenant-scoped modules. Product, inventory, cart, order, payment, discount, shipping and tax data must never be shared across tenants.

## Payment security baseline
- RAVA must not store card numbers, CVV, PINs or raw payment credentials.
- Prefer hosted/redirect checkout or tokenized provider SDKs.
- Provider secrets belong in a secrets manager/vault or protected environment, not ordinary tenant settings or logs.
- `payment_connections.secret_reference` stores only a reference/identifier, never the secret itself.
- Every payment callback/webhook must verify provider authenticity/signature where supported.
- Payment confirmation must be idempotent. Replayed callbacks must not create duplicate paid orders.
- The amount, currency, tenant and order must be verified server-side before marking an order paid.
- Client-side `success` redirects are never proof of payment.
- Payment state transitions and manual overrides require Audit Log + Log ID.
- Refund/cancel/manual-paid operations require explicit permissions and confirmation.
- Payment/log metadata must redact tokens, signatures and personal payment data.

## Provider abstraction
Checkout talks to an internal payment adapter, not directly to a provider. Adapters can later support providers such as local Iranian gateways, Stripe, or other regional providers without changing order/checkout UI.

Recommended adapter contract:
- createPayment(order)
- verifyPayment(callback)
- refundPayment(payment, amount)
- getPaymentStatus(payment)

## Commercial separation
`tenant_modules` controls what the website can do.
`service_entitlements` controls what RAVA sells/manages for the customer.
Example: a customer may have the `seo` fields available but not have `managed_seo`; automation and managed SEO tools remain a paid service entitlement.

## Platform owner
Platform owner can enable/disable modules and entitlements per tenant. Sensitive actions such as payments or tenant suspension are never delegated implicitly by a tenant role.

## Definition of Done for future modules
Every new module must ship with:
- tenant isolation / RLS
- permission model
- audit/log coverage
- confirmation for destructive or financial operations
- bilingual Help keys
- analytics events where useful
- version/migration compatibility
- module dependency declaration
