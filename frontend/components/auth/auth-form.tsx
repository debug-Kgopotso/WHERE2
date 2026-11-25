"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MonoLabel } from "@/components/ui/mono-label";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function authHref(path: "/login" | "/signup", next: string | null) {
  const destination = safeNextPath(next);
  return destination === "/" ? path : `${path}?next=${encodeURIComponent(destination)}`;
}

function readableAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : "Authentication failed.";
  if (message.includes("is not valid JSON") || message.includes("<!DOCTYPE")) {
    return "The account service returned a web page instead of a sign-in response. Check NEXT_PUBLIC_SUPABASE_URL in frontend/.env.local.";
  }
  return message;
}

export function AuthForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode = pathname === "/signup" ? "signup" : "signin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrorMessage("");
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(safeNextPath(searchParams.get("next")));
        router.refresh();
        return;
      }

      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", safeNextPath(searchParams.get("next")));
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callback.toString() },
      });
      if (error) throw error;
      if (data.session) {
        router.replace(safeNextPath(searchParams.get("next")));
        router.refresh();
      } else {
        setMessage("Check your email to confirm your account, then sign in.");
      }
    } catch (error) {
      setErrorMessage(readableAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
      <MonoLabel>{mode === "signin" ? "Returning account" : "New account"}</MonoLabel>
      <h1 className="mt-3 font-display text-5xl font-black tracking-[-0.04em]">
        {mode === "signin" ? "Sign in." : "Join WHERE2."}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        {mode === "signin"
          ? "Use the email and password for an account you already created."
          : "Create an account with your email. You can choose a place to browse after you are in."}
      </p>
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <label className="block">
          <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em]">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 w-full rounded-2xl border border-line bg-bg px-4 outline-none focus:border-ember"
          />
        </label>
        <label className="block">
          <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em]">Password</span>
          <input
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-12 w-full rounded-2xl border border-line bg-bg px-4 outline-none focus:border-ember"
          />
        </label>
        {errorMessage && <p role="alert" className="text-sm text-error">{errorMessage}</p>}
        {message && <p role="status" className="text-sm text-sage">{message}</p>}
        <button
          type="submit"
          disabled={busy}
          className="h-12 w-full rounded-full bg-ember px-5 font-semibold text-near-black disabled:opacity-60"
        >
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-ink-muted">
        {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
        <Link
          href={authHref(mode === "signin" ? "/signup" : "/login", searchParams.get("next"))}
          className="font-semibold text-ember"
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </Link>
      </p>
      {searchParams.get("error") === "callback" && (
        <p role="alert" className="mt-4 text-center text-sm text-error">
          Email confirmation failed. Please try signing in again.
        </p>
      )}
      <Link href="/" className="sr-only">Return to WHERE2</Link>
    </section>
  );
}
