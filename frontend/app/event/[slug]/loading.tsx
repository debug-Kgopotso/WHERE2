import { Container } from "@/components/ui/container";

export default function EventLoading() {
  return (
    <div className="pt-[calc(var(--header-h)+28px)]">
      <Container>
        <div className="h-3 w-32 animate-pulse rounded-full bg-line" />
        <div className="mt-6 flex items-end gap-6">
          <div className="h-36 w-28 animate-pulse rounded-2xl bg-ember-soft" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-40 animate-pulse rounded-full bg-line" />
            <div className="h-12 w-2/3 animate-pulse rounded-2xl bg-line" />
            <div className="h-6 w-1/2 animate-pulse rounded-full bg-line" />
          </div>
        </div>
      </Container>
      <div className="mt-8 h-[52vh] animate-pulse bg-line" />
    </div>
  );
}
