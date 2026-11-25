import { NextResponse } from "next/server";
import { runEventScraper } from "@backend/scrape-events";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const userRefreshes = new Map<string, number>();
const REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) {
    return NextResponse.json({ error: "Sign in to refresh event listings." }, { status: 401 });
  }

  const previous = userRefreshes.get(data.user.id) ?? 0;
  const remaining = REFRESH_COOLDOWN_MS - (Date.now() - previous);
  if (remaining > 0) {
    return NextResponse.json(
      { error: "Listings were refreshed recently. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(remaining / 1000)) } },
    );
  }

  let body: { location?: unknown; lat?: unknown; lng?: unknown; country?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "A JSON location is required." }, { status: 400 });
  }

  const location = typeof body.location === "string" ? body.location.trim() : "";
  const country = typeof body.country === "string" ? body.country.trim().slice(0, 80) : "";
  const lat = typeof body.lat === "number" ? body.lat : NaN;
  const lng = typeof body.lng === "number" ? body.lng : NaN;
  if (
    location.length < 2 ||
    location.length > 120 ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json({ error: "Provide a valid place and coordinates." }, { status: 400 });
  }

  userRefreshes.set(data.user.id, Date.now());
  try {
    const result = await runEventScraper({ name: location, lat, lng, country });
    if (result.cities.length > 0 && result.failedCities === result.cities.length) {
      throw new Error("All configured event sources failed for this place.");
    }
    return NextResponse.json(result);
  } catch (error) {
    userRefreshes.delete(data.user.id);
    console.error("Could not refresh event listings for selected location.", error);
    return NextResponse.json({ error: "Event listings could not be refreshed." }, { status: 502 });
  }
}
