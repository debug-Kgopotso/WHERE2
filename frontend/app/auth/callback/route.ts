import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Supabase auth callback failed.", error.message);
      return NextResponse.redirect(new URL("/login?error=callback", request.url));
    }
  }
  return NextResponse.redirect(new URL(safeNextPath(url.searchParams.get("next")), request.url));
}
