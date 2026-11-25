export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earth = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatKm(km: number) {
  if (km < 1) return `${Math.max(50, Math.round(km * 1000))} M`;
  if (km < 10) return `${km.toFixed(1)} KM`;
  return `${Math.round(km)} KM`;
}

export function travelEstimate(km: number) {
  if (km < 1.4) {
    const walk = Math.max(4, Math.round(km / 0.075));
    return `About ${walk} min walk`;
  }
  const drive = Math.max(4, Math.round(km / 0.45));
  return `About ${drive} min drive`;
}
