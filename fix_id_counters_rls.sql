-- ==========================================================
-- FIX: id_counters table was missing its RLS policy, which
-- blocked EVERY form submission (Complaint, Help Desk, Anti-Romeo,
-- SOS, Counselling, Legal Aid, JSS) since they all rely on this
-- table to auto-generate reference IDs. Run this once.
-- ==========================================================

alter table id_counters enable row level security;

drop policy if exists "allow_all_id_counters" on id_counters;
create policy "allow_all_id_counters" on id_counters
  for all using (true) with check (true);

-- Sanity check: this should now return rows without any error
select * from id_counters;
