-- ==========================================================
-- Run this AFTER creating the admin user in Authentication > Users
-- Replace 'PASTE-USER-UID-HERE' with the actual User UID you copied
-- ==========================================================

insert into profiles (id, email, role)
values ('PASTE-USER-UID-HERE', 'adarsh004455@gmail.com', 'admin')
on conflict (id) do update set role = 'admin';

-- Sanity check: this should show your admin profile
select * from profiles where role = 'admin';
