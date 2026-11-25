create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  venue text not null,
  address text not null default '',
  city text not null default '',
  start_at timestamptz not null,
  end_at timestamptz,
  price_info text,
  source text not null default 'host' check (source in ('host', 'scraper')),
  has_live_tickets boolean not null default false,
  external_ticket_url text,
  poster_url text,
  source_url text,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now()
);

alter table public.events
  add column if not exists description text,
  add column if not exists category text,
  add column if not exists venue text,
  add column if not exists address text not null default '',
  add column if not exists city text not null default '',
  add column if not exists start_at timestamptz,
  add column if not exists end_at timestamptz,
  add column if not exists price_info text,
  add column if not exists source text not null default 'host',
  add column if not exists has_live_tickets boolean not null default false,
  add column if not exists external_ticket_url text,
  add column if not exists poster_url text,
  add column if not exists source_url text,
  add column if not exists status text not null default 'pending',
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists events_title_venue_start_at_unique
  on public.events (title, venue, start_at);

create index if not exists events_approved_start_at_idx
  on public.events (start_at)
  where status = 'approved';
