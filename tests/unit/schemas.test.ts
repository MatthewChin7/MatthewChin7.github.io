import { describe, expect, it } from "vitest";
import {
  projectFrontmatterSchema,
  noteFrontmatterSchema,
  marginaliaSchema,
  videoSchema,
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
