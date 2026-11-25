"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type SavesState = {
  savedIds: string[];
  goingIds: string[];
  toggleSaved: (id: string) => void;
  toggleGoing: (id: string) => void;
};

export const useSaves = create<SavesState>()(
  persist(
    (set, get) => ({
      savedIds: [],
      goingIds: [],
      toggleSaved: (id) => {
        const has = get().savedIds.includes(id);
        set({
          savedIds: has
            ? get().savedIds.filter((item) => item !== id)
            : [id, ...get().savedIds],
          goingIds: has ? get().goingIds.filter((item) => item !== id) : get().goingIds,
        });
      },
      toggleGoing: (id) => {
        const has = get().goingIds.includes(id);
        const saved = get().savedIds.includes(id)
          ? get().savedIds
          : [id, ...get().savedIds];
        set({
          savedIds: saved,
          goingIds: has
            ? get().goingIds.filter((item) => item !== id)
            : [id, ...get().goingIds],
        });
      },
    }),
    { name: "where2-saves" },
  ),
);
