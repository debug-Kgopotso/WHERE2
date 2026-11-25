import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { MonoLabel } from "@/components/ui/mono-label";

export default function NotFound() {
  return (
    <Container className="flex min-h-[70vh] flex-col justify-end pb-16 pt-[var(--header-h)]">
      <MonoLabel>404</MonoLabel>
      <h1 className="mt-4 max-w-3xl font-display text-[clamp(56px,8vw,96px)] font-black leading-[0.95] tracking-[-0.03em]">
        This page left early.
      </h1>
      <p className="mt-4 max-w-md font-display text-2xl font-medium italic text-ink-muted">
        The room, the link, or the night isn’t here.
      </p>
      <Button href="/" className="mt-8 w-fit">
        Back to the board
      </Button>
    </Container>
  );
}
