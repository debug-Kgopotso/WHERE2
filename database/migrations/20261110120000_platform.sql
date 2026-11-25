create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  avatar text,
  default_location text,
  role text not null default 'user' check (role in ('user', 'host', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.hosts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  slug text unique not null,
  name text not null,
  bio text,
  links jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.events
  add column if not exists host_id uuid references public.hosts (id) on delete set null,
  add column if not exists slug text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists age_restriction text,
  add column if not exists is_featured boolean not null default false,
  add column if not exists views integer not null default 0,
  add column if not exists clicks integer not null default 0;

create unique index if not exists events_slug_unique on public.events (slug) where slug is not null;

create table if not exists public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  is_going boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create table if not exists public.event_clicks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  referrer text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.hosts enable row level security;
alter table public.events enable row level security;
alter table public.saves enable row level security;
alter table public.event_clicks enable row level security;

drop policy if exists "Approved events are public" on public.events;
create policy "Approved events are public" on public.events
  for select using (status = 'approved');

drop policy if exists "Hosts are public" on public.hosts;
create policy "Hosts are public" on public.hosts
  for select using (true);

drop policy if exists "Users read their own profile" on public.users;
create policy "Users read their own profile" on public.users
  for select using (auth.uid() = id);

drop policy if exists "Users update their own profile" on public.users;
create policy "Users update their own profile" on public.users
  for update using (auth.uid() = id);

drop policy if exists "Users read their own saves" on public.saves;
create policy "Users read their own saves" on public.saves
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert their own saves" on public.saves;
create policy "Users insert their own saves" on public.saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update their own saves" on public.saves;
create policy "Users update their own saves" on public.saves
  for update using (auth.uid() = user_id);

drop policy if exists "Users delete their own saves" on public.saves;
create policy "Users delete their own saves" on public.saves
  for delete using (auth.uid() = user_id);

drop policy if exists "Anyone can log a click" on public.event_clicks;
create policy "Anyone can log a click" on public.event_clicks
  for insert with check (true);

drop policy if exists "Admins read clicks" on public.event_clicks;
create policy "Admins read clicks" on public.event_clicks
  for select using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );
