import { describe, it, expect } from "vitest";
import { getSafeNextPath } from "@/lib/safeRedirect";

describe("getSafeNextPath", () => {
  it("returns the fallback for null input", () => {
    expect(getSafeNextPath(null)).toBe("/account");
  });

  it("returns the fallback for empty string", () => {
    expect(getSafeNextPath("")).toBe("/account");
  });

  it("allows a normal same-origin relative path", () => {
    expect(getSafeNextPath("/checkout")).toBe("/checkout");
  });

  it("rejects a protocol-relative open redirect (//evil.example)", () => {
    expect(getSafeNextPath("//evil.example")).toBe("/account");
  });

  it("rejects a backslash-based open redirect (/\\evil.example)", () => {
    expect(getSafeNextPath("/\\evil.example")).toBe("/account");
  });

  it("rejects an absolute URL not starting with /", () => {
    expect(getSafeNextPath("https://evil.example")).toBe("/account");
  });

  it("honors a custom fallback", () => {
    expect(getSafeNextPath(null, "/manager")).toBe("/manager");
    expect(getSafeNextPath("//evil.example", "/manager")).toBe("/manager");
  });
});
