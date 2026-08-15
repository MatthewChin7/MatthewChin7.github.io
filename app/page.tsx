import type { Metadata } from "next";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { personJsonLd } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "Matthew Chin",
  description: "Braindump of oft musings.",
};

/*
 * WordPress "static front page": a single About page/entry with the widget
 * sidebar. Replace the bracketed copy below when the final biography is ready.
 */
export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd()) }}
      />

      <div className="wp-inner py-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_18rem]">
          <main>
            <article className="wp-entry border-0 pt-0">
              <header>
                <h1 className="wp-entry-title text-3xl sm:text-[2.5rem]">Matthew Chin</h1>
              </header>
              <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-fg">
                Hello, I’m Matthew.
              </p>
              <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-fg">
                You’ll often find me hunckered down at my desk (vibe)coding the next big
                thing (manifesting), working through interesting Maths problems, or trying
                to find said interesting Maths problems to do.
              </p>
              <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-fg">
                I love reading and writing. I also enjoy conversations about metaphysics,
                volatility and the Fed. I often find that the best ideas are fleeting in
                nature; by the time I find the (unfortunate) friend responsible for
                validating my conjectures, they are not as novel as they were at
                conception. I endeavour to prevent such misfortunes with this page. I also
                have the unhealthy habit of believing my ideas to be more important and
                indisputable than they are; in a sense, this page serves as an ego-dump
                for these grandiose ideas.
              </p>
              <p className="mt-6">
                <Link href="/notes" className="wp-more-link">
                  Latest writing →
                </Link>
              </p>

              <section aria-labelledby="currently-heading" className="mt-12">
                <h2 id="currently-heading" className="wp-widget-title">
                  Currently
                </h2>
                <p className="mt-2 max-w-[62ch] text-lg leading-relaxed text-fg">
                  1. Reading: The Alignment Problem
                </p>
                <p className="mt-2 max-w-[62ch] text-lg leading-relaxed text-fg">
                  2. Building: Generalised volatility surfaces
                </p>
                <p className="mt-2 max-w-[62ch] text-lg leading-relaxed text-fg">
                  3. Exploring: Proofs of Universal Determinism
                </p>
              </section>

              <section aria-labelledby="background-heading" className="mt-10">
                <h2 id="background-heading" className="wp-widget-title">
                  Background
                </h2>
                <p className="mt-2 max-w-[62ch] text-lg leading-relaxed text-fg">
                  I’m a rising sophomore at Harvard studying Maths, Stats & Computer
                  Science.
                </p>
                <p className="mt-2 max-w-[62ch] text-lg leading-relaxed text-fg">
                  I grew up in Hong Kong, London and Singapore. As is common for
                  international students, “Where’s home” is a tricky question; I tend to
                  divert such conversations to today’s weather.
                </p>
              </section>
            </article>
          </main>

          <Sidebar />
        </div>
      </div>
    </>
  );
}
