-- WHERE2 database. Apply database/migrations in order on a fresh project.
-- Service-role jobs (the event scraper) bypass row level security.

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

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references public.hosts (id) on delete set null,
  slug text,
  title text not null,
  description text,
  category text,
  venue text not null,
  address text not null default '',
  city text not null default '',
  lat double precision,
  lng double precision,
  start_at timestamptz not null,
  end_at timestamptz,
  price_info text,
  age_restriction text,
  source text not null default 'host' check (source in ('host', 'scraper')),
  has_live_tickets boolean not null default false,
  external_ticket_url text,
  poster_url text,
  source_url text,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  is_featured boolean not null default false,
  views integer not null default 0,
  clicks integer not null default 0,
  created_at timestamptz not null default now()
);

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
