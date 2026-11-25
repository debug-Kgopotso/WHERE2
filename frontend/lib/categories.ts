import type { Category } from "@/lib/types";

export const CATEGORIES = [
  "All",
  "Music",
  "Food & Drink",
  "Markets",
  "Arts",
  "Comedy",
  "Sports",
  "Community",
  "Nightlife",
  "Family",
  "Networking",
] as const;

const SLUGS: Record<string, Category> = {
  music: "Music",
  "food-and-drink": "Food & Drink",
  markets: "Markets",
  arts: "Arts",
  comedy: "Comedy",
  sports: "Sports",
  community: "Community",
  nightlife: "Nightlife",
  family: "Family",
  networking: "Networking",
};

export function categoryToSlug(category: Category | "All") {
  if (category === "All") return null;
  return Object.entries(SLUGS).find(([, label]) => label === category)?.[0] ?? null;
}

export function slugToCategory(slug: string | undefined): Category | "All" {
  if (!slug) return "All";
  return SLUGS[slug] ?? "All";
}
