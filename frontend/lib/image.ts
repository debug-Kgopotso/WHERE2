export function optimizeEventImage(src: string) {
  if (src.startsWith("/")) return true;
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return false;
    if (url.hostname === "images.unsplash.com") return true;
    const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return Boolean(storageUrl && url.hostname === new URL(storageUrl).hostname);
  } catch {
    return false;
  }
}
