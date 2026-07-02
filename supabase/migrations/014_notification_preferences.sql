create table if not exists notification_preferences (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  enabled    boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(user_id, key)
);

alter table notification_preferences enable row level security;

create policy "users manage own prefs"
  on notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
