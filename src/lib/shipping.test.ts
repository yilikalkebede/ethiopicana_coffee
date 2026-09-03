import { describe, it, expect } from "vitest";
import { snapshotToShipTo, mapTrackerStatus, isValidWebhookToken } from "@/lib/shipping";

describe("snapshotToShipTo", () => {
  it("joins first/last name and maps address fields to Shippo's shape", () => {
    const snapshot = {
      firstName: "Ada",
      lastName: "Rios",
      company: "Ethiopicana Roastery",
      address1: "123 Main St",
      address2: "Apt 4",
      city: "Portland",
      state: "OR",
      postalCode: "97201",
      country: "US",
      phone: "555-1234",
    };
    expect(snapshotToShipTo(snapshot)).toEqual({
      name: "Ada Rios",
      company: "Ethiopicana Roastery",
      street1: "123 Main St",
      street2: "Apt 4",
      city: "Portland",
      state: "OR",
      zip: "97201",
      country: "US",
      phone: "555-1234",
    });
  });

  it("passes through null optional fields rather than fabricating values", () => {
    const snapshot = {
      firstName: "Ada",
      lastName: "Rios",
      company: null,
      address1: "123 Main St",
      address2: null,
      city: "Portland",
      state: "OR",
      postalCode: "97201",
      country: "US",
      phone: null,
    };
    const result = snapshotToShipTo(snapshot);
    expect(result.company).toBeNull();
    expect(result.street2).toBeNull();
    expect(result.phone).toBeNull();
  });
});

describe("mapTrackerStatus", () => {
  it("maps delivered", () => {
    expect(mapTrackerStatus("DELIVERED")).toBe("DELIVERED");
  });

  it("maps transit", () => {
    expect(mapTrackerStatus("TRANSIT")).toBe("IN_TRANSIT");
  });

  it("maps returned", () => {
    expect(mapTrackerStatus("RETURNED")).toBe("RETURNED");
  });

  it("maps failure to FAILED", () => {
    expect(mapTrackerStatus("FAILURE")).toBe("FAILED");
  });

  it("maps pre-transit and unknown to LABEL_CREATED", () => {
    expect(mapTrackerStatus("PRE_TRANSIT")).toBe("LABEL_CREATED");
    expect(mapTrackerStatus("UNKNOWN")).toBe("LABEL_CREATED");
  });

  it("falls back to LABEL_CREATED for an unrecognized status rather than throwing", () => {
    expect(mapTrackerStatus("some_new_unmapped_status")).toBe("LABEL_CREATED");
  });
});

describe("isValidWebhookToken", () => {
  it("accepts a matching token", () => {
    const url = new URL("https://example.com/api/webhooks/shippo?token=real-secret");
    expect(isValidWebhookToken(url, "real-secret")).toBe(true);
  });

  it("rejects a wrong token", () => {
    const url = new URL("https://example.com/api/webhooks/shippo?token=wrong-guess");
    expect(isValidWebhookToken(url, "real-secret")).toBe(false);
  });

  it("rejects a missing token", () => {
    const url = new URL("https://example.com/api/webhooks/shippo");
    expect(isValidWebhookToken(url, "real-secret")).toBe(false);
  });

  it("rejects when no secret is configured, even with a token present", () => {
    const url = new URL("https://example.com/api/webhooks/shippo?token=anything");
    expect(isValidWebhookToken(url, "")).toBe(false);
  });
});
