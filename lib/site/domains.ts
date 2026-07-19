export const DOMAINS = [
  "markets",
  "mathematics",
  "machine-learning",
  "physical-systems",
  "startups",
  "essays",
] as const;

export type Domain = (typeof DOMAINS)[number];

export const domainLabels: Record<Domain, string> = {
  markets: "Markets",
  mathematics: "Mathematics",
  "machine-learning": "Machine Learning",
  "physical-systems": "Physical Systems",
  startups: "Startups",
  essays: "Essays",
};

/** CSS custom property carrying each domain's accent color. */
export const domainColorVar: Record<Domain, string> = {
  markets: "var(--d-markets)",
  mathematics: "var(--d-mathematics)",
  "machine-learning": "var(--d-machine-learning)",
  "physical-systems": "var(--d-physical-systems)",
  startups: "var(--d-startups)",
  essays: "var(--d-essays)",
};

export const METHODS = [
  "regression",
  "simulation",
  "pde",
  "optimization",
  "machine-learning",
  "data-engineering",
  "market-microstructure",
  "valuation",
  "statistical-inference",
  "software-engineering",
] as const;

export type Method = (typeof METHODS)[number];

export const methodLabels: Record<Method, string> = {
  regression: "Regression",
  simulation: "Simulation",
  pde: "PDE",
  optimization: "Optimization",
  "machine-learning": "Machine Learning",
  "data-engineering": "Data Engineering",
  "market-microstructure": "Market Microstructure",
  valuation: "Valuation",
  "statistical-inference": "Statistical Inference",
  "software-engineering": "Software Engineering",
};
