import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="type-mono-label fixed left-4 top-4 z-[100] -translate-y-24 bg-signal px-3 py-2 text-white transition-transform focus-visible:translate-y-0"
      >
        Skip to content
      </a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
