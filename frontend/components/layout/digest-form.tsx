"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { MonoLabel } from "@/components/ui/mono-label";

export function DigestForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    const existing = JSON.parse(localStorage.getItem("where2-digest") ?? "[]") as string[];
    const next = Array.from(new Set([...existing, email.trim().toLowerCase()]));
    localStorage.setItem("where2-digest", JSON.stringify(next));
    setDone(true);
  }

  if (done) {
    return (
      <p className="font-display text-3xl font-bold leading-tight tracking-[-0.03em]">
        You’re on the list.
        <span className="mt-2 block font-display text-lg font-medium italic text-ink-muted">
          Sunday letter. No noise.
        </span>
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
      <label className="sr-only" htmlFor="digest-email">
        Email for the Sunday letter
      </label>
      <input
        id="digest-email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@domain.co.za"
        className="h-12 flex-1 rounded-full border border-line bg-surface px-4 font-sans text-[15px] text-ink outline-none placeholder:text-ink-muted"
      />
      <Button type="submit" disabled={!valid} size="lg">
        Send it
      </Button>
      <MonoLabel className="sr-only">Weekly digest</MonoLabel>
    </form>
  );
}
