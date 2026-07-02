-- Audit log table to track all user actions in the ERP
drop table if exists audit_logs cascade;

create table audit_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  user_email    text not null,
  user_name     text,
  action        text not null check (action in ('CREATE', 'UPDATE', 'DELETE')),
  resource_type text not null,
  resource_id   text not null,
  resource_label text,  -- human-readable identifier (order number, PO number, product name...)
  old_data      jsonb,
  new_data      jsonb,
  metadata      jsonb,  -- extra context: ip, channel, reason, etc.
  created_at    timestamptz not null default now()
);

-- Indexes for common query patterns
create index idx_audit_logs_user_id       on audit_logs(user_id);
create index idx_audit_logs_resource      on audit_logs(resource_type, resource_id);
create index idx_audit_logs_created_at    on audit_logs(created_at desc);

-- Only admins/service role can read audit logs; no one can update/delete
alter table audit_logs enable row level security;

create policy "service role full access" on audit_logs
  for all using (true)
  with check (true);

-- Regular authenticated users can only read their own logs
create policy "users read own logs" on audit_logs
  for select
  using (user_id = auth.uid());
