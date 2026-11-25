import { NextResponse } from "next/server";
import { getEventById } from "@/lib/events";

export function GET(request: Request, { params }: { params: { eventId: string } }) {
  const event = getEventById(params.eventId);
  if (!event) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.redirect(event.externalLink, 302);
}
