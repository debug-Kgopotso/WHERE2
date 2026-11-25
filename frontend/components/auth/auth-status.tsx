"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthStatus() {
  const [signedIn, setSignedIn] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) console.error("Could not load account status.", error.message);
      if (active) setSignedIn(Boolean(data.user));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!signedIn) {
    return (
      <Link
        href="/login"
        className="rounded-full px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted hover:text-ink"
      >
        Sign in
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          setSignOutError("");
          const supabase = createSupabaseBrowserClient();
          const { error } = await supabase.auth.signOut();
          if (error) {
            console.error("Could not sign out.", error.message);
            setSignOutError(error.message);
            return;
          }
          window.location.assign("/login");
        }}
        className="rounded-full px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted hover:text-ink"
      >
        Sign out
      </button>
      {signOutError && <span role="alert" className="sr-only">{signOutError}</span>}
    </>
  );
}
