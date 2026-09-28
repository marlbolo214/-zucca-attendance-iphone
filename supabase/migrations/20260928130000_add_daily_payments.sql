-- 勤怠と独立した日払いの支払い確認。行が存在すれば日払い対象、paid_at があれば支払い済み。
create table if not exists public.daily_payments (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  staff_name text not null,
  work_date date not null,
  paid_at timestamptz,
  primary key (user_id, staff_name, work_date)
);

alter table public.daily_payments enable row level security;

drop policy if exists "Own daily payments select" on public.daily_payments;
drop policy if exists "Own daily payments insert" on public.daily_payments;
drop policy if exists "Own daily payments update" on public.daily_payments;
drop policy if exists "Own daily payments delete" on public.daily_payments;

create policy "Own daily payments select" on public.daily_payments
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own daily payments insert" on public.daily_payments
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Own daily payments update" on public.daily_payments
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Own daily payments delete" on public.daily_payments
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.daily_payments to authenticated;
