import { NextResponse } from "next/server";
import { getEventById } from "@/lib/events";
import { eventFromDatabaseRow } from "@/lib/event-record";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: { eventId: string } }) {
  let data: unknown = null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.eventId)) {
    const supabase = createSupabaseServerClient();
    const result = await supabase
      .from("events")
      .select("*")
      .eq("id", params.eventId)
      .eq("status", "approved")
      .maybeSingle();
    if (result.error) throw new Error(`Could not load event information: ${result.error.message}`);
    data = result.data;
  }
  const event = eventFromDatabaseRow(data) ?? getEventById(params.eventId);
  if (!event?.externalLink) {
    return NextResponse.redirect(new URL(event ? `/event/${event.slug}` : "/", request.url));
  }
  const target = new URL(event.externalLink);
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.redirect(new URL(`/event/${event.slug}`, request.url));
  }
  return NextResponse.redirect(target, 302);
}
