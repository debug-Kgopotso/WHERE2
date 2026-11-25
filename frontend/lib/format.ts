const ZONE = "Africa/Johannesburg";

type Zoned = {
  key: string;
  weekday: string;
  monthShort: string;
  monthLong: string;
  day: string;
  year: string;
  time: string;
};

function parts(date: Date): Zoned {
  const bag = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  const monthLong = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    month: "long",
  }).format(date);

  const monthShort = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    month: "short",
  }).format(date);

  return {
    key: `${bag.year}-${bag.month}-${bag.day}`,
    weekday: bag.weekday ?? "",
    monthShort,
    monthLong,
    day: String(Number(bag.day)),
    year: bag.year ?? "",
    time: `${bag.hour}:${bag.minute}`,
  };
}

export function zoned(iso: string) {
  return parts(new Date(iso));
}

export function sameDay(iso: string, now = new Date()) {
  return parts(new Date(iso)).key === parts(now).key;
}

function addDays(key: string, days: number) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function weekendKeys(now = new Date()) {
  const today = parts(now);
  const order = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const index = order.indexOf(today.weekday);
  const keys = new Set<string>();
  if (today.weekday === "Sun") {
    keys.add(today.key);
    return keys;
  }
  const untilSaturday = (6 - index + 7) % 7;
  keys.add(addDays(today.key, untilSaturday));
  keys.add(addDays(today.key, untilSaturday + 1));
  return keys;
}

export function weekKeys(now = new Date()) {
  const today = parts(now).key;
  return new Set(Array.from({ length: 7 }, (_, index) => addDays(today, index)));
}

export function longDate(iso: string) {
  const when = zoned(iso);
  return `${when.day} ${when.monthLong} ${when.year}`;
}
