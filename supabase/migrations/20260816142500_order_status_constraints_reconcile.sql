-- Reconcile legacy Commerce order constraints with the current lifecycle engine.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check(status in('pending','confirmed','processing','completed','cancelled'));
alter table public.orders drop constraint if exists orders_fulfillment_status_check;
alter table public.orders add constraint orders_fulfillment_status_check check(fulfillment_status in('unfulfilled','preparing','packed','shipped','delivered','returned','cancelled'));
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check(payment_status in('unpaid','pending','authorized','paid','failed','partially_refunded','refunded','cancelled'));

-- Normalize only legacy values that can be mapped without guessing business intent.
update public.orders set status='completed' where status='fulfilled';
update public.orders set fulfillment_status='delivered' where fulfillment_status='fulfilled';
update public.orders set fulfillment_status='shipped' where fulfillment_status='partial';
