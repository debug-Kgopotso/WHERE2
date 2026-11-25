import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Container className="flex min-h-[80vh] items-center justify-center py-20">
      <Suspense fallback={<p className="font-mono text-sm">Loading sign-in…</p>}>
        <AuthForm />
      </Suspense>
    </Container>
  );
}
