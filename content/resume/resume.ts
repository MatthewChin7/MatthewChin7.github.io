/**
 * Structured résumé source — the single place résumé facts live.
 * Entries marked TODO(matthew) are placeholders awaiting verified details;
 * nothing here should be invented on Matthew's behalf.
 */

export interface ResumeItem {
  title: string;
  org?: string;
  location?: string;
  period?: string;
  summary?: string;
  /** Lines shown only in the detailed view. */
  detail?: string[];
  placeholder?: boolean;
}

export interface ResumeSection {
  id: string;
  label: string;
  items: ResumeItem[];
}

export interface ResumeData {
  name: string;
  headline: string;
  email: string;
  location: string;
  updated: string;
  sections: ResumeSection[];
}

export const resume: ResumeData = {
  name: "Matthew Chin",
  headline:
    "Harvard undergraduate — mathematics, statistics, and computer science. Quantitative research, machine learning, and ambitious systems.",
  email: "matthewchin2005@hotmail.com",
  location: "Cambridge, MA ↔ Singapore",
  updated: "2026-07-19",
  sections: [
    {
      id: "education",
      label: "Education",
      items: [
        {
          title: "A.B. candidate — Mathematics, Statistics, and Computer Science",
          org: "Harvard University",
          location: "Cambridge, MA",
          period: "TODO(matthew): class year",
          summary:
            "Coursework across probability, statistical inference, partial differential equations, and computer science.",
          detail: ["TODO(matthew): selected coursework, GPA if desired, activities."],
          placeholder: true,
        },
      ],
    },
    {
      id: "experience",
      label: "Selected experience",
      items: [
        {
          title: "Private-equity & venture-capital work",
          org: "TODO(matthew): firm name",
          period: "TODO(matthew): dates",
          summary:
            "Work across aerospace, defense, enterprise technology, and early-stage companies.",
          detail: ["TODO(matthew): verified scope, deal work, and responsibilities."],
          placeholder: true,
        },
        {
          title: "Software & product — localization",
          org: "Code.org",
          period: "TODO(matthew): dates",
          summary:
            "React and Rails work on localization workflows and mobile-friendly interaction patterns for an education platform operating across many countries.",
          detail: ["TODO(matthew): verified contributions and shipped work."],
          placeholder: true,
        },
      ],
    },
    {
      id: "research",
      label: "Research",
      items: [
        {
          title: "Pollution dispersion modeling — Hong Kong",
          summary:
            "Hourly advection–diffusion model at ~500 m resolution combining monitoring, meteorological, and GIS data.",
          detail: [
            "Finite-volume discretization; identifiability-constrained parameterization.",
          ],
        },
        {
          title: "Tensor-basis neural networks",
          summary:
            "Rotation-invariant neural constitutive models; statistical model comparison (BIC, KL divergence) against simulated constitutive laws.",
        },
        {
          title: "BTC implied-volatility surface proxy",
          summary:
            "Surface reconstruction from ATM volatility, 25Δ risk reversals, and butterflies; Vanna–Volga and SVI/SSVI approaches evaluated against Deribit quotes.",
        },
      ],
    },
    {
      id: "projects",
      label: "Selected projects",
      items: [
        {
          title: "Market-making and derivatives-pricing bot",
          summary:
            "Python trading system — two-sided quoting, derivatives pricing off internal mids, mechanical risk controls — built for a live trading competition.",
        },
      ],
    },
    {
      id: "skills",
      label: "Technical skills",
      items: [
        {
          title: "Languages & tools",
          summary:
            "Python (scientific stack), TypeScript/React, Ruby on Rails, SQL, LaTeX.",
          detail: [
            "Statistical modeling, PDE numerics, options pricing, data engineering.",
          ],
        },
      ],
    },
    {
      id: "interests",
      label: "Interests",
      items: [
        {
          title:
            "Volatility and derivatives · statistical inference · fluid dynamics · complex systems · aerospace & defense · AI safety · technical writing",
        },
      ],
    },
  ],
};
