import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { PlateHeader } from "@/components/layout/plate-header";
import { AdminStudio } from "@/components/admin/admin-studio";

export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
};

/**
 * Local authoring studio. Development only — production builds 404 here,
 * so the deployed site carries no writable surface and no auth risk.
 * Everything it writes lands in the repo working tree as a draft.
 */
export default function AdminPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <Container className="py-14">
      <PlateHeader coordinate="≡" label="Studio — local authoring" as="h1" />
      <p className="mb-10 max-w-[60ch] text-muted">
        This studio only exists while the site runs locally (
        <code className="font-mono text-sm">pnpm dev</code>). It writes drafts and uploads
        directly into the repository — review, commit, and deploy to publish. On the
        deployed site this page is a 404.
      </p>
      <AdminStudio />
    </Container>
  );
}
