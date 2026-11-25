# WHERE2

WHERE2 lists public events around a selected place and lets signed-in users publish event listings. Ticket and event-information links open the third-party host; WHERE2 does not sell tickets or process payments.

## Setup

### 1. Install the Supabase SSR package

From the project root, run:

```powershell
npm install @supabase/ssr
```

This also updates `package-lock.json`.

### 2. Configure Supabase

Create a Supabase project, then in **Authentication → Providers** enable Email. Configure the site URL and redirect URLs for:

- `http://localhost:3000/auth/callback`
- Your deployed app URL followed by `/auth/callback`

Copy the root `.env.example` file to `frontend/.env.local` and set the values there. Next.js is started with `frontend` as its project directory, so it reads environment files from that folder:

- `NEXT_PUBLIC_SUPABASE_URL`: the project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the project anon/public key.
- `SUPABASE_URL`: the same project URL, used by the server-side scraper.
- `SUPABASE_SERVICE_ROLE_KEY`: the service-role key. Keep it server-only; never use a `NEXT_PUBLIC_` prefix or commit it.
- `CRON_SECRET`: a long random secret for the scheduled scraper endpoint.
- `NEXT_PUBLIC_SITE_URL`: the app's public URL.
- `LOCATION_USER_AGENT`: identify your app and provide a contact address when using OpenStreetMap's public Nominatim service.

For a fresh Supabase project, run `database/schema.sql`, followed by every file in `database/migrations/` in filename order. If you already applied the earlier migrations, run only `database/migrations/20261125140000_auth_location_events.sql`. This enables authenticated event reads, owner-only event writes, and the public `event-images` storage bucket with a 512 KB image limit.

The middleware sends all app pages and APIs to sign-in unless a valid Supabase session exists. New users can register on `/login`. If email confirmations are enabled, they must confirm their email before signing in.

### 3. Location and public event sources

Location search and GPS reverse lookup use OpenStreetMap Nominatim; no geocoding API key is required. Browser geolocation requires the user’s permission and a secure context (HTTPS, or localhost). The UI debounces searches and rounds GPS coordinates before lookup, but Nominatim is a community service with strict usage limits. For a busy production app, replace the Nominatim requests in `frontend/app/api/locations/route.ts` and `backend/scrape-events.ts` with a geocoder whose usage terms and rate limits fit your traffic.

The scraper:

- Checks Eventbrite's country/city public event pages for the selected/configured place (the scheduled default cities are in South Africa).
- Can also fetch semicolon-separated public listing URLs from `SCRAPER_SOURCE_URLS`. Use `{city}`, `{citySlug}`, or `{country}` in a URL template, for example `https://events.example.test/search/{citySlug}`.
- Imports events only when a fetched page exposes Schema.org `Event` JSON-LD. It does not bypass login walls, bot protections, or access controls.
- Refreshes after a user selects a place (with a five-minute per-process per-user cooldown). Scheduled runs use `SCRAPER_CITIES`, which is a comma-separated list.

Only configure Computicket, Webtickets, Eventbrite, or other sources when their public pages permit automated access and their URLs expose usable event metadata. Their page structures and terms can change. No scraper can reliably guarantee **all** events across the whole web; coverage is limited to configured sources, accessible pages, and the events those pages publish as structured data. Check each source's terms and robots policy before adding it.

By default, scraped descriptions and poster URLs are not copied (`SCRAPER_IMPORT_SOURCE_CONTENT=false`). Keep that setting unless you have permission to reuse that content. User-uploaded images are converted to WebP, resized to at most 800 × 600, and capped at 512 KB.

### 4. Start the app

```powershell
npm run dev
```

The scheduled scraper uses `/api/cron/scrape-events` and requires `Authorization: Bearer <CRON_SECRET>`. Configure the same secret in your deployment environment.
