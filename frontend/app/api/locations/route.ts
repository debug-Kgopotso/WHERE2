import { NextResponse } from "next/server";

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  address?: Record<string, string>;
};

function placeFromResult(result: NominatimResult) {
  const address = result.address ?? {};
  const name =
    result.name ||
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    result.display_name.split(",")[0];
  return {
    name,
    label: result.display_name,
    lat: Number(result.lat),
    lng: Number(result.lon),
    country: address.country ?? "",
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lng = url.searchParams.get("lng");
  const query = url.searchParams.get("q")?.trim();
  const endpoint =
    lat && lng
      ? `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`
      : query && query.length >= 2
        ? `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`
        : null;

  if (!endpoint || (lat && (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))))) {
    return NextResponse.json({ error: "Provide a place query or valid coordinates." }, { status: 400 });
  }

  try {
    const response = await fetch(endpoint, {
      headers: {
        accept: "application/json",
        "user-agent": process.env.LOCATION_USER_AGENT ?? "WHERE2/1.0 (location search)",
      },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      console.error("OpenStreetMap geocoding returned an error.", { status: response.status });
      return NextResponse.json({ error: "Location service is temporarily unavailable." }, { status: 502 });
    }

    const result = await response.json();
    if (lat && lng) {
      if (!result?.display_name || !result?.lat || !result?.lon) {
        return NextResponse.json({ error: "Could not identify this location." }, { status: 404 });
      }
      return NextResponse.json({ place: placeFromResult(result as NominatimResult) });
    }

    const places = (result as NominatimResult[])
      .map(placeFromResult)
      .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng));
    return NextResponse.json({ places });
  } catch (error) {
    console.error("OpenStreetMap geocoding request failed.", error);
    return NextResponse.json({ error: "Location service is temporarily unavailable." }, { status: 502 });
  }
}
