import type { Metadata } from "next";
import { SavedBoard } from "@/components/saved/saved-board";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Saved",
  description: "Nights you’ve kept. Free to browse. Tickets stay with the host.",
  robots: { index: false, follow: false },
};

export default function SavedPage() {
  return (
    <Container className="pb-20 pt-[calc(var(--header-h)+36px)]">
      <SavedBoard />
    </Container>
  );
}
