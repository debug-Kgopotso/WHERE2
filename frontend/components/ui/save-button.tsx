"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { springPop } from "@/lib/motion";
import { useSaves } from "@/lib/saves";
import { cn } from "@/lib/cn";

export function SaveButton({
  id,
  className,
  tone = "bone",
}: {
  id: string;
  className?: string;
  tone?: "bone" | "ink";
}) {
  const savedIds = useSaves((state) => state.savedIds);
  const toggleSaved = useSaves((state) => state.toggleSaved);
  const [ready, setReady] = useState(false);
  const [burst, setBurst] = useState(0);
  const saved = ready && savedIds.includes(id);

  useEffect(() => setReady(true), []);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save event"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!saved) setBurst((value) => value + 1);
        toggleSaved(id);
      }}
      className={cn(
        "relative grid h-10 w-10 place-items-center rounded-full border border-bone/20 bg-near-black/50 backdrop-blur-sm",
        tone === "ink" && "border-line bg-surface",
        className,
      )}
    >
      <motion.svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        animate={saved ? { scale: [1, 1.35, 1] } : { scale: 1 }}
        transition={springPop}
        aria-hidden
      >
        <path
          d="M12 20s-7-4.4-7-9.1C5 8.1 6.8 6.4 9 6.4c1.3 0 2.4.6 3 1.6.6-1 1.7-1.6 3-1.6 2.2 0 4 1.7 4 4.5C19 15.6 12 20 12 20z"
          fill={saved ? "var(--ember)" : "none"}
          stroke={saved ? "var(--ember)" : tone === "ink" ? "var(--ink)" : "#F4F1EA"}
          strokeWidth="1.6"
        />
      </motion.svg>
      <AnimatePresence>
        {burst > 0 &&
          [0, 1, 2].map((index) => {
            const angle = (-90 + index * 46) * (Math.PI / 180);
            return (
              <motion.span
                key={`${burst}-${index}`}
                className="absolute h-1 w-1 rounded-full bg-ember"
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos(angle) * 16,
                  y: Math.sin(angle) * 16,
                  opacity: 0,
                  scale: 0.6,
                }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 18 }}
              />
            );
          })}
      </AnimatePresence>
    </button>
  );
}
