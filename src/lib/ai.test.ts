import { describe, it, expect } from "vitest";
import { extractJSON } from "./ai";

describe("extractJSON", () => {
  it("parses plain JSON", () => {
    expect(extractJSON<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
  });

  it("strips markdown code fences", () => {
    const raw = '```json\n{"a": 1}\n```';
    expect(extractJSON<{ a: number }>(raw)).toEqual({ a: 1 });
  });

  it("strips fences without a language tag", () => {
    const raw = '```\n{"a": 1}\n```';
    expect(extractJSON<{ a: number }>(raw)).toEqual({ a: 1 });
  });

  it("ignores prose surrounding the JSON object", () => {
    const raw = 'Sure, here is the JSON:\n{"a": 1}\nLet me know if you need more.';
    expect(extractJSON<{ a: number }>(raw)).toEqual({ a: 1 });
  });

  it("throws on invalid JSON", () => {
    expect(() => extractJSON("not json at all")).toThrow();
  });
});
