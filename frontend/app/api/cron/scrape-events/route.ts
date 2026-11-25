import { NextResponse } from "next/server";
import { runEventScraper } from "@backend/scrape-events";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET is not configured");
    return NextResponse.json({ error: "Cron endpoint is not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runEventScraper();
    if (result.failedCities === result.cities.length) {
      return NextResponse.json(result, { status: 502 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Event scraper run failed", { error: message });
    return NextResponse.json({ error: "Event scraper run failed" }, { status: 500 });
  }
}
