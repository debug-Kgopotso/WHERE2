"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MonoLabel } from "@/components/ui/mono-label";

type Place = { name: string; label: string; lat: number; lng: number };

async function compressImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (file.size > 10 * 1024 * 1024) throw new Error("Choose an image smaller than 10 MB.");

  const image = await createImageBitmap(file);
  const scale = Math.min(1, 800 / image.width, 600 / image.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not process the image.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();

  for (const quality of [0.8, 0.68, 0.56, 0.44]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (blob && blob.size <= 512 * 1024) return blob;
  }
  throw new Error("This image could not be compressed below 512 KB. Choose a simpler image.");
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function NewEventForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [price, setPrice] = useState("");
  const [ageRestriction, setAgeRestriction] = useState("");
  const [ticketUrl, setTicketUrl] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (query.trim().length < 2 || place?.name === query) {
      setPlaces([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/locations?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as { places?: Place[]; error?: string };
        if (!response.ok) throw new Error(body.error ?? "Location search failed.");
        setPlaces(body.places ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setErrorMessage(error instanceof Error ? error.message : "Location search failed.");
      }
    }, 1_100);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, place]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (!place) {
      setErrorMessage("Choose a result from the location search.");
      return;
    }
    if (!image) {
      setErrorMessage("Choose an event image.");
      return;
    }
    if (endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      setErrorMessage("The end time must be after the start time.");
      return;
    }
    let safeTicketUrl = "";
    if (ticketUrl.trim()) {
      try {
        const parsed = new URL(ticketUrl);
        if (
          (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
          parsed.username ||
          parsed.password ||
          !parsed.hostname
        ) {
          throw new Error("Use a public HTTPS or HTTP event-information URL.");
        }
        safeTicketUrl = parsed.toString();
      } catch {
        setErrorMessage("Enter a valid public event or ticket-information URL.");
        return;
      }
    }

    setBusy(true);
    let uploadedPath = "";
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("Sign in before posting an event.");

      const compressed = await compressImage(image);
      const eventSlug = `${slugify(title)}-${crypto.randomUUID().slice(0, 8)}`;
      uploadedPath = `${userData.user.id}/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(uploadedPath, compressed, {
          contentType: "image/webp",
          cacheControl: "31536000",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from("event-images").getPublicUrl(uploadedPath);
      const { data: inserted, error: insertError } = await supabase
        .from("events")
        .insert({
          user_id: userData.user.id,
          slug: eventSlug,
          title: title.trim(),
          description: description.trim(),
          category,
          venue: venue.trim(),
          address: address.trim() || place.label,
          city: place.name,
          lat: place.lat,
          lng: place.lng,
          start_at: new Date(startAt).toISOString(),
          end_at: endAt ? new Date(endAt).toISOString() : null,
          price_info: price.trim() || "See event listing",
          age_restriction: ageRestriction.trim() || null,
          source: "host",
          source_name: "Event host",
          has_live_tickets: false,
          external_ticket_url: safeTicketUrl || null,
          poster_url: publicUrl.publicUrl,
          status: "approved",
        })
        .select("slug")
        .single();
      if (insertError) {
        const { error: cleanupError } = await supabase.storage.from("event-images").remove([uploadedPath]);
        if (cleanupError) console.error("Could not remove event image after failed event creation.", cleanupError.message);
        uploadedPath = "";
        throw insertError;
      }

      router.push(`/event/${inserted.slug}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not publish the event.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl">
      <MonoLabel>Event host</MonoLabel>
      <h1 className="mt-3 font-display text-[clamp(48px,7vw,80px)] font-black leading-[0.95] tracking-[-0.03em]">
        Put it on the board.
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-muted">
        Your event listing is published for signed-in WHERE2 members. Ticket links open the third-party host; WHERE2 does not take payments.
      </p>

      <form className="mt-9 space-y-5" onSubmit={submit}>
        <Field label="Event title">
          <input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field label="Description">
          <textarea required maxLength={5000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <Field label="Category">
          <select required value={category} onChange={(event) => setCategory(event.target.value)}>
            {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Venue name">
          <input required maxLength={200} value={venue} onChange={(event) => setVenue(event.target.value)} />
        </Field>
        <div>
          <span id="event-place-label" className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em]">
            City, town, or place
          </span>
          <input
            aria-labelledby="event-place-label"
            required
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPlace(null);
            }}
            placeholder="Search any city, town, or place"
            className="h-12 w-full rounded-2xl border border-line bg-surface px-4 outline-none focus:border-ember"
          />
          {places.length > 0 && (
            <ul className="mt-2 max-h-56 overflow-auto rounded-2xl border border-line bg-surface">
              {places.map((item) => (
                <li key={`${item.lat}-${item.lng}-${item.label}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setPlace(item);
                      setQuery(item.name);
                      setAddress(item.label);
                      setPlaces([]);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-bg"
                  >
                    <span className="block font-semibold">{item.name}</span>
                    <span className="mt-1 block text-xs text-ink-muted">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {place && <span className="mt-2 block text-xs text-sage">Selected: {place.label}</span>}
        </div>
        <Field label="Street address or venue details">
          <input maxLength={300} value={address} onChange={(event) => setAddress(event.target.value)} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Starts">
            <input required type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
          </Field>
          <Field label="Ends (optional)">
            <input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Price information">
            <input maxLength={100} value={price} onChange={(event) => setPrice(event.target.value)} placeholder="e.g. Free or R150" />
          </Field>
          <Field label="Age restriction">
            <input maxLength={80} value={ageRestriction} onChange={(event) => setAgeRestriction(event.target.value)} placeholder="e.g. All ages or 18+" />
          </Field>
        </div>
        <Field label="Third-party event or ticket information URL (optional)">
          <input
            type="url"
            maxLength={2000}
            value={ticketUrl}
            onChange={(event) => setTicketUrl(event.target.value)}
            placeholder="https://"
          />
        </Field>
        <Field label="Event image (compressed to max 800 × 600, 512 KB)">
          <input
            required
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setImage(event.target.files?.[0] ?? null)}
            className="file:mr-3 file:rounded-full file:border-0 file:bg-sage-soft file:px-4 file:py-2 file:font-semibold file:text-sage"
          />
        </Field>
        {errorMessage && <p role="alert" className="text-sm text-error">{errorMessage}</p>}
        <button
          type="submit"
          disabled={busy}
          className="h-12 w-full rounded-full bg-ember px-5 font-semibold text-near-black disabled:opacity-60 sm:w-auto"
        >
          {busy ? "Publishing…" : "Publish event"}
        </button>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em]">{label}</span>
      <span className="block [&>input]:h-12 [&>input]:w-full [&>input]:rounded-2xl [&>input]:border [&>input]:border-line [&>input]:bg-surface [&>input]:px-4 [&>input]:outline-none [&>input]:focus:border-ember [&>textarea]:w-full [&>textarea]:rounded-2xl [&>textarea]:border [&>textarea]:border-line [&>textarea]:bg-surface [&>textarea]:p-4 [&>textarea]:outline-none [&>textarea]:focus:border-ember [&>select]:h-12 [&>select]:w-full [&>select]:rounded-2xl [&>select]:border [&>select]:border-line [&>select]:bg-surface [&>select]:px-4">
        {children}
      </span>
    </label>
  );
}
