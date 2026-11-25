"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSaves } from "@/lib/saves";

export function GoingToggle({ id }: { id: string }) {
  const goingIds = useSaves((state) => state.goingIds);
  const toggleGoing = useSaves((state) => state.toggleGoing);
  const [ready, setReady] = useState(false);
  const going = ready && goingIds.includes(id);

  useEffect(() => setReady(true), []);

  return (
    <Button variant="secondary" className="w-full" onClick={() => toggleGoing(id)} aria-pressed={going}>
      {going ? "You’re going" : "I’m going"}
    </Button>
  );
}
