-- 実際に渡した日払い金額を保存。既存の「支払い済み」は金額未確認のまま残す。
alter table public.daily_payments
  add column if not exists paid_amount integer;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'daily_payments_paid_amount_nonnegative'
      and conrelid = 'public.daily_payments'::regclass
  ) then
    alter table public.daily_payments
      add constraint daily_payments_paid_amount_nonnegative
      check (paid_amount is null or paid_amount >= 0);
  end if;
end $$;
