import { describe, expect, it } from "vitest";
import { isHandongEmail } from "./authDomain";

describe("isHandongEmail", () => {
  it("accepts handong.ac.kr emails case-insensitively", () => {
    expect(isHandongEmail("ADMIN@HANDONG.AC.KR")).toBe(true);
  });

  it("rejects other domains and missing emails", () => {
    expect(isHandongEmail("admin@example.com")).toBe(false);
    expect(isHandongEmail(undefined)).toBe(false);
  });
});
