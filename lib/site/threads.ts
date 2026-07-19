import { getAllContent } from "@/lib/content/load";

export interface Thread {
  number: string;
  name: string;
  question: string;
  /** Tags OR domains that count content into this thread. */
  tags: string[];
  domains: string[];
  atlasHref: string;
}

const threadDefs: Omit<Thread, "atlasHref">[] = [
  {
    number: "01",
    name: "Volatility & option surfaces",
    question: "How much smile can three quoted numbers reconstruct?",
    tags: ["volatility", "options", "svi", "derivatives", "vanna-volga"],
    domains: [],
  },
  {
    number: "02",
    name: "Inference under imperfect data",
    question: "What can stale, sparse, or asynchronous data still identify?",
    tags: ["statistical-inference", "econometrics", "beta", "data-quality", "modeling"],
    domains: [],
  },
  {
    number: "03",
    name: "Models of physical systems",
    question: "When does the physics earn its complexity over pure interpolation?",
    tags: [
      "pde",
      "advection-diffusion",
      "fluid-dynamics",
      "tensor-basis",
      "constitutive-models",
    ],
    domains: ["physical-systems"],
  },
  {
    number: "04",
    name: "Market microstructure",
    question: "What turns quoting off — and who gets picked off when it doesn't?",
    tags: ["microstructure", "market-making", "trading"],
    domains: [],
  },
  {
    number: "05",
    name: "Complex & agent-based systems",
    question: "What is a simulation of a market a model of?",
    tags: ["complex-systems", "agent-based-models"],
    domains: [],
  },
  {
    number: "06",
    name: "Long-horizon AI & safety",
    question: "Which of today's modeling habits will look reckless at scale?",
    tags: ["ai-safety", "invariance", "machine-learning", "neural-networks"],
    domains: ["machine-learning"],
  },
];

export function getThreads(): (Thread & { count: number })[] {
  const items = getAllContent().filter((i) => !i.draft);
  return threadDefs.map((def) => {
    const count = items.filter((item) => {
      const tags = item.tags ?? [];
      const domains = "domains" in item ? (item.domains as string[]) : [];
      return (
        def.tags.some((t) => tags.includes(t)) ||
        def.domains.some((d) => domains.includes(d))
      );
    }).length;
    const domain = def.domains[0];
    return {
      ...def,
      count,
      atlasHref: domain
        ? `/atlas?domain=${domain}`
        : `/atlas?topic=${encodeURIComponent(def.tags[0]!)}`,
    };
  });
}
