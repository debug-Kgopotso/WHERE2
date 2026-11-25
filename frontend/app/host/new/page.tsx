import type { Metadata } from "next";
import { NewEventForm } from "@/components/event/new-event-form";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Post an event",
  robots: { index: false, follow: false },
};

export default function NewEventPage() {
  return (
    <Container className="pb-20 pt-[calc(var(--header-h)+36px)]">
      <NewEventForm />
    </Container>
  );
}
