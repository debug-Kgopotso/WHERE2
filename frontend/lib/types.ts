export type Category =
  | "Music"
  | "Food & Drink"
  | "Markets"
  | "Arts"
  | "Comedy"
  | "Sports"
  | "Community"
  | "Nightlife"
  | "Family"
  | "Networking";

export type City = {
  slug: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  country?: string;
};

export type Host = {
  slug: string;
  name: string;
  bio: string;
  neighborhood: string;
};

export type EventItem = {
  id: string;
  slug: string;
  title: string;
  dek: string;
  description: string;
  category: Category;
  images: string[];
  venue: string;
  address: string;
  citySlug: string;
  locationName?: string;
  sourceName?: string;
  lat: number;
  lng: number;
  startAt: string;
  endAt: string;
  priceLabel: string;
  priceValue: number;
  externalLink: string;
  age: string;
  isFeatured: boolean;
  host: Host;
};

export type Sponsor = {
  id: string;
  quote: string;
  partner: string;
  href: string;
};

export type WhenFilter = "any" | "tonight" | "weekend" | "week";
export type PriceFilter = "any" | "free" | "under200" | "under500";
export type DistanceFilter = "any" | "5" | "15" | "40";

export type Filters = {
  category: Category | "All";
  when: WhenFilter;
  price: PriceFilter;
  km: DistanceFilter;
  q: string;
};

export type FeedItem =
  | { type: "event"; event: EventItem; distanceKm: number }
  | { type: "sponsor"; sponsor: Sponsor };
