import type { City } from "@/lib/types";

export const CITIES: City[] = [
  { slug: "cape-town", name: "Cape Town", region: "Western Cape", lat: -33.9249, lng: 18.4241 },
  { slug: "johannesburg", name: "Johannesburg", region: "Gauteng", lat: -26.2041, lng: 28.0473 },
  { slug: "durban", name: "Durban", region: "KwaZulu-Natal", lat: -29.8587, lng: 31.0218 },
  { slug: "pretoria", name: "Pretoria", region: "Gauteng", lat: -25.7479, lng: 28.2293 },
  { slug: "stellenbosch", name: "Stellenbosch", region: "Western Cape", lat: -33.9321, lng: 18.8602 },
  { slug: "gqeberha", name: "Gqeberha", region: "Eastern Cape", lat: -33.9608, lng: 25.6022 },
  { slug: "bloemfontein", name: "Bloemfontein", region: "Free State", lat: -29.0852, lng: 26.1596 },
  { slug: "umhlanga", name: "Umhlanga", region: "KwaZulu-Natal", lat: -29.7277, lng: 31.0821 },
  { slug: "franschhoek", name: "Franschhoek", region: "Western Cape", lat: -33.9133, lng: 19.1197 },
  { slug: "knysna", name: "Knysna", region: "Western Cape", lat: -34.0356, lng: 23.0488 },
  { slug: "soweto", name: "Soweto", region: "Gauteng", lat: -26.2485, lng: 27.854 },
  { slug: "sandton", name: "Sandton", region: "Gauteng", lat: -26.1076, lng: 28.0567 },
];

export const DEFAULT_CITY = CITIES[0];

export function getCity(slug: string | undefined | null): City {
  return CITIES.find((city) => city.slug === slug) ?? DEFAULT_CITY;
}

export function nearestCity(lat: number, lng: number) {
  return [...CITIES].sort((a, b) => {
    const da = (a.lat - lat) ** 2 + (a.lng - lng) ** 2;
    const db = (b.lat - lat) ** 2 + (b.lng - lng) ** 2;
    return da - db;
  })[0];
}
