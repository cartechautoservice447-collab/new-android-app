create table if not exists public.user_workspace_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  courses jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_workspace_state enable row level security;

drop policy if exists "Users can view own workspace state" on public.user_workspace_state;
drop policy if exists "Users can insert own workspace state" on public.user_workspace_state;
drop policy if exists "Users can update own workspace state" on public.user_workspace_state;

create policy "Users can view own workspace state"
  on public.user_workspace_state for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own workspace state"
  on public.user_workspace_state for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own workspace state"
  on public.user_workspace_state for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists user_workspace_state_updated_at_idx
  on public.user_workspace_state(updated_at);
