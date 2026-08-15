import { describe, expect, it } from "vitest";
import {
  projectFrontmatterSchema,
  noteFrontmatterSchema,
  marginaliaSchema,
  videoSchema,
  readingSchema,
  problemFrontmatterSchema,
  pageFrontmatterSchema,
} from "@/lib/content/schemas";

const validProject = {
  title: "T",
  slug: "t-proj",
  description: "d",
  question: "q",
  year: 2025,
  date: "2025-01-02",
  status: "ongoing",
  role: "r",
  domains: ["markets"],
  methods: ["valuation"],
};

const validProblem = {
  title: "P",
  slug: "a-problem",
  prompt: "What is $1+1$?",
  date: "2026-01-02",
  topic: "Arithmetic",
};

describe("problem schema", () => {
  it("accepts a valid problem and applies defaults", () => {
    const p = problemFrontmatterSchema.parse(validProblem);
    expect(p.difficulty).toBe("medium");
    expect(p.tags).toEqual([]);
    expect(p.draft).toBe(false);
  });

  it("rejects an unknown difficulty", () => {
    expect(
      problemFrontmatterSchema.safeParse({ ...validProblem, difficulty: "trivial" })
        .success,
    ).toBe(false);
  });

  it("requires a prompt and topic", () => {
    expect(
      problemFrontmatterSchema.safeParse({ ...validProblem, prompt: "" }).success,
    ).toBe(false);
    expect(
      problemFrontmatterSchema.safeParse({ ...validProblem, topic: "" }).success,
    ).toBe(false);
  });
});

describe("project schema", () => {
  it("accepts a valid project and applies defaults", () => {
    const p = projectFrontmatterSchema.parse(validProject);
    expect(p.tags).toEqual([]);
    expect(p.draft).toBe(false);
    expect(p.coverVariant).toBe("grid");
  });

  it("rejects bad slugs", () => {
    expect(
      projectFrontmatterSchema.safeParse({ ...validProject, slug: "Bad Slug" }).success,
    ).toBe(false);
  });

  it("rejects invalid dates", () => {
    expect(
      projectFrontmatterSchema.safeParse({ ...validProject, date: "2025-13-45" }).success,
    ).toBe(false);
    expect(
      projectFrontmatterSchema.safeParse({ ...validProject, date: "yesterday" }).success,
    ).toBe(false);
  });

  it("rejects unknown domains and statuses", () => {
    expect(
      projectFrontmatterSchema.safeParse({ ...validProject, domains: ["astrology"] })
        .success,
    ).toBe(false);
    expect(
      projectFrontmatterSchema.safeParse({ ...validProject, status: "vaporware" })
        .success,
    ).toBe(false);
  });
});

describe("note schema", () => {
  it("requires type from the vocabulary", () => {
    const base = {
      title: "N",
      slug: "n",
      description: "d",
      date: "2025-01-01",
      domains: ["essays"],
    };
    expect(noteFrontmatterSchema.safeParse({ ...base, type: "essay" }).success).toBe(
      true,
    );
    expect(noteFrontmatterSchema.safeParse({ ...base, type: "poem" }).success).toBe(
      false,
    );
  });
});

describe("marginalia schema", () => {
  it("accepts a minimal entry", () => {
    expect(
      marginaliaSchema.safeParse({
        id: "m-1",
        slug: "a-thought",
        date: "2025-05-05",
        body: "One sentence.",
        type: "observation",
      }).success,
    ).toBe(true);
  });
});

describe("video schema", () => {
  const base = {
    title: "V",
    slug: "v",
    description: "d",
    date: "2025-01-01",
    provider: "youtube",
    embedId: "abc",
  };
  it("validates duration format", () => {
    expect(videoSchema.safeParse({ ...base, duration: "12:34" }).success).toBe(true);
    expect(videoSchema.safeParse({ ...base, duration: "1:02:34" }).success).toBe(true);
    expect(videoSchema.safeParse({ ...base, duration: "12m" }).success).toBe(false);
  });
});

describe("reading schema", () => {
  const base = {
    title: "Options, Futures, and Other Derivatives",
    author: "John C. Hull",
    slug: "hull-options-futures",
    status: "reading",
  };

  it("accepts a minimal entry and applies defaults", () => {
    const parsed = readingSchema.parse(base);
    expect(parsed.tags).toEqual([]);
    expect(parsed.draft).toBe(false);
  });

  it("only allows known statuses", () => {
    expect(readingSchema.safeParse({ ...base, status: "read" }).success).toBe(true);
    expect(readingSchema.safeParse({ ...base, status: "to-read" }).success).toBe(true);
    expect(readingSchema.safeParse({ ...base, status: "abandoned" }).success).toBe(false);
  });

  it("validates optional dates and links", () => {
    expect(
      readingSchema.safeParse({ ...base, status: "read", finished: "2025-04-01" })
        .success,
    ).toBe(true);
    expect(readingSchema.safeParse({ ...base, finished: "someday" }).success).toBe(false);
    expect(readingSchema.safeParse({ ...base, link: "not-a-url" }).success).toBe(false);
  });

  it("requires title, author, and a kebab-case slug", () => {
    expect(readingSchema.safeParse({ ...base, author: "" }).success).toBe(false);
    expect(readingSchema.safeParse({ ...base, slug: "Bad Slug" }).success).toBe(false);
  });
});

describe("problemFrontmatterSchema — bibliography", () => {
  const base = {
    title: "T",
    slug: "t",
    prompt: "Prove it.",
    date: "2026-01-01",
    topic: "Algebra",
  };

  it("defaults to an empty bibliography", () => {
    expect(problemFrontmatterSchema.parse(base).bibliography).toEqual([]);
  });

  it("accepts formatted reference strings", () => {
    const parsed = problemFrontmatterSchema.parse({
      ...base,
      bibliography: ["Williams, David (1991) Probability with Martingales."],
    });
    expect(parsed.bibliography).toHaveLength(1);
  });

  it("rejects a non-string bibliography", () => {
    expect(
      problemFrontmatterSchema.safeParse({ ...base, bibliography: [{ title: "x" }] })
        .success,
    ).toBe(false);
  });
});

describe("pageFrontmatterSchema", () => {
  it("requires only a title", () => {
    expect(pageFrontmatterSchema.safeParse({ title: "Now" }).success).toBe(true);
    expect(pageFrontmatterSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("validates the optional updated date and slug", () => {
    expect(
      pageFrontmatterSchema.safeParse({ title: "Now", updated: "2026-07-19" }).success,
    ).toBe(true);
    expect(
      pageFrontmatterSchema.safeParse({ title: "Now", updated: "July 2026" }).success,
    ).toBe(false);
    expect(
      pageFrontmatterSchema.safeParse({ title: "Now", slug: "Not Kebab" }).success,
    ).toBe(false);
  });
});
