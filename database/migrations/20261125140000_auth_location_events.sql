alter table public.events
  add column if not exists user_id uuid references auth.users (id) on delete set null,
  add column if not exists source_name text;

drop policy if exists "Approved events are public" on public.events;
drop policy if exists "Signed-in users read approved events and their drafts" on public.events;
create policy "Signed-in users read approved events and their drafts" on public.events
  for select using (
    auth.uid() is not null
    and (status = 'approved' or user_id = auth.uid())
  );

drop policy if exists "Users create their own events" on public.events;
create policy "Users create their own events" on public.events
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and source = 'host'
    and status = 'approved'
  );

drop policy if exists "Users update their own events" on public.events;
create policy "Users update their own events" on public.events
  for update to authenticated
  using (auth.uid() = user_id and source = 'host')
  with check (auth.uid() = user_id and source = 'host');

drop policy if exists "Users delete their own events" on public.events;
create policy "Users delete their own events" on public.events
  for delete to authenticated
  using (auth.uid() = user_id and source = 'host');

drop policy if exists "Hosts are public" on public.hosts;
create policy "Signed-in users read hosts" on public.hosts
  for select using (auth.uid() is not null);

drop policy if exists "Anyone can log a click" on public.event_clicks;
create policy "Signed-in users can log a click" on public.event_clicks
  for insert to authenticated
  with check (auth.uid() = user_id or user_id is null);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-images',
  'event-images',
  true,
  524288,
  array['image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Signed-in users upload event images" on storage.objects;
create policy "Signed-in users upload event images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update their own event images" on storage.objects;
create policy "Users update their own event images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete their own event images" on storage.objects;
create policy "Users delete their own event images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
