import { describe, it, expect } from "vitest";
import { snapshotToShipTo, mapTrackerStatus } from "@/lib/shipping";

describe("snapshotToShipTo", () => {
  it("joins first/last name and maps address fields to EasyPost's shape", () => {
    const snapshot = {
      firstName: "Ada",
      lastName: "Rios",
      company: "Latitude Roastery",
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
      company: "Latitude Roastery",
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
    expect(mapTrackerStatus("delivered")).toBe("DELIVERED");
  });

  it("maps every in-transit variant", () => {
    expect(mapTrackerStatus("in_transit")).toBe("IN_TRANSIT");
    expect(mapTrackerStatus("out_for_delivery")).toBe("IN_TRANSIT");
    expect(mapTrackerStatus("available_for_pickup")).toBe("IN_TRANSIT");
  });

  it("maps returned/cancelled to RETURNED", () => {
    expect(mapTrackerStatus("return_to_sender")).toBe("RETURNED");
    expect(mapTrackerStatus("cancelled")).toBe("RETURNED");
  });

  it("maps failure/error to FAILED", () => {
    expect(mapTrackerStatus("failure")).toBe("FAILED");
    expect(mapTrackerStatus("error")).toBe("FAILED");
  });

  it("falls back to LABEL_CREATED for an unrecognized status rather than throwing", () => {
    expect(mapTrackerStatus("some_new_unmapped_status")).toBe("LABEL_CREATED");
  });
});
