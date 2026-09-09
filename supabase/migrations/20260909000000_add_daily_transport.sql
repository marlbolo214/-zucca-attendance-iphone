-- NULL は「日別交通費未設定」、0 は有効な交通費として区別する。
-- 既存行は NULL のままにし、現在の通常交通費による埋め戻しは行わない。
alter table public.attendance
  add column if not exists transport_cost integer null;

comment on column public.attendance.transport_cost is
  '勤怠登録時点の日別交通費（円）。NULL=未設定、0=交通費なし';

