import { Shippo } from "shippo";
import { timingSafeEqual } from "crypto";

type ShippoClientInstance = InstanceType<typeof Shippo>;

// Singleton pattern mirrors src/lib/stripe.ts, but lazily constructed:
// unlike the Stripe SDK (tolerant of an empty key until first API call),
// the Shippo client would otherwise send an obviously-invalid Authorization
// header before SHIPPING_API_KEY is ever set — this defers that until the
// first real call, same reasoning as the EasyPost client this replaced.
const globalForShipping = globalThis as unknown as { shippingClient?: ShippoClientInstance };

function getShippingClient(): ShippoClientInstance {
  if (!globalForShipping.shippingClient) {
    // Shippo's SDK does not add the "ShippoToken " prefix itself for this
    // security scheme — the full header value must be supplied.
    const client = new Shippo({ apiKeyHeader: `ShippoToken ${process.env.SHIPPING_API_KEY || "missing-key"}` });
    if (process.env.NODE_ENV !== "production") {
      globalForShipping.shippingClient = client;
    }
    return client;
  }
  return globalForShipping.shippingClient;
}

/** Only Shippo is actually wired up (SHIPPING_PROVIDER documents which
 * provider is active; a ShipStation adapter isn't built since nothing uses
 * it — see the Phase 6 plan). */
export const SHIPPING_PROVIDER = "shippo";

/** Padded-mailer + tape estimate, added on top of real product weight —
 * documented here so it isn't a mystery number buried in a rate call. */
const PACKAGING_WEIGHT_GRAMS = 60;

/** Fixed padded-mailer dimensions in inches. Shippo requires parcel
 * dimensions on every rate request (EasyPost didn't) — this app doesn't
 * track real per-order package dimensions, so a single representative
 * mailer size is used for every order, same spirit as
 * PACKAGING_WEIGHT_GRAMS above. */
const PARCEL_LENGTH_IN = "9";
const PARCEL_WIDTH_IN = "6";
const PARCEL_HEIGHT_IN = "3";

function gramsToOunces(grams: number): number {
  return grams * 0.035274;
}

export class ShippingNotConfiguredError extends Error {
  constructor() {
    super("Ship-from address is not fully configured. Set it in Settings before requesting shipping rates.");
    this.name = "ShippingNotConfiguredError";
  }
}

export type ShipFromSettings = {
  shipFromName: string | null;
  shipFromCompany: string | null;
  shipFromAddress1: string | null;
  shipFromAddress2: string | null;
  shipFromCity: string | null;
  shipFromState: string | null;
  shipFromPostalCode: string | null;
  shipFromCountry: string | null;
  shipFromPhone: string | null;
  shipFromEmail: string | null;
};

export type ShipToAddress = {
  name: string;
  company?: string | null;
  street1: string;
  street2?: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string | null;
};

export type ParcelLine = { weightGrams: number | null; quantity: number };

/** Matches the shape of Order/Cart's shippingAddressSnapshot and the
 * addressSchema/Address model — the one conversion every call site
 * (checkout, rate-shopping, label purchase) needs, kept in one place. */
export type AddressSnapshot = {
  firstName: string;
  lastName: string;
  company?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
};

export function snapshotToShipTo(snapshot: AddressSnapshot): ShipToAddress {
  return {
    name: `${snapshot.firstName} ${snapshot.lastName}`,
    company: snapshot.company,
    street1: snapshot.address1,
    street2: snapshot.address2,
    city: snapshot.city,
    state: snapshot.state,
    zip: snapshot.postalCode,
    country: snapshot.country,
    phone: snapshot.phone,
  };
}

export type RateOption = {
  carrier: string;
  service: string;
  rate: number;
  currency: string;
  deliveryDays: number | null;
};

function requireShipFromAddress(settings: ShipFromSettings) {
  if (
    !settings.shipFromName ||
    !settings.shipFromAddress1 ||
    !settings.shipFromCity ||
    !settings.shipFromState ||
    !settings.shipFromPostalCode ||
    !settings.shipFromCountry ||
    !settings.shipFromEmail
  ) {
    throw new ShippingNotConfiguredError();
  }
  return {
    name: settings.shipFromName,
    company: settings.shipFromCompany ?? undefined,
    street1: settings.shipFromAddress1,
    street2: settings.shipFromAddress2 ?? undefined,
    city: settings.shipFromCity,
    state: settings.shipFromState,
    zip: settings.shipFromPostalCode,
    country: settings.shipFromCountry,
    phone: settings.shipFromPhone ?? undefined,
    email: settings.shipFromEmail,
  };
}

function toShippoAddress(address: ShipToAddress) {
  return {
    name: address.name,
    company: address.company ?? undefined,
    street1: address.street1,
    street2: address.street2 ?? undefined,
    city: address.city,
    state: address.state,
    zip: address.zip,
    country: address.country,
    phone: address.phone ?? undefined,
  };
}

function totalParcelWeightOunces(items: ParcelLine[]): number {
  const grams = items.reduce((sum, item) => sum + (item.weightGrams ?? 0) * item.quantity, 0);
  return Math.max(gramsToOunces(grams + PACKAGING_WEIGHT_GRAMS), 0.1);
}

/**
 * Creates a real Shippo Shipment (their object — a container for rates,
 * distinct from our own Prisma `Shipment` model) and returns its quoted
 * rates. Returns the raw Shippo shipment too, since buyLabel() needs it to
 * purchase a specific rate (rates are shipment-scoped in Shippo, same as
 * they were in EasyPost).
 */
export async function getRates(shipFrom: ShipFromSettings, toAddress: ShipToAddress, items: ParcelLine[]) {
  const fromAddress = requireShipFromAddress(shipFrom);
  const weight = totalParcelWeightOunces(items);

  const shipment = await getShippingClient().shipments.create({
    addressFrom: fromAddress,
    addressTo: toShippoAddress(toAddress),
    parcels: [
      {
        massUnit: "oz",
        weight: weight.toFixed(2),
        distanceUnit: "in",
        length: PARCEL_LENGTH_IN,
        width: PARCEL_WIDTH_IN,
        height: PARCEL_HEIGHT_IN,
      },
    ],
    async: false,
  });

  const rates: RateOption[] = (shipment.rates ?? []).map((r) => ({
    carrier: r.provider,
    service: r.servicelevel?.token ?? r.servicelevel?.name ?? "unknown",
    rate: Number(r.amount),
    currency: r.currency,
    deliveryDays: r.estimatedDays ?? null,
  }));

  return { shipment, rates };
}

/**
 * Buys a real label. Prefers the given carrier+service (what the shopper
 * was quoted at checkout, or what an earlier rate call already picked for
 * a free-shipping order) if it's still available on a freshly-created
 * shipment; falls back to the cheapest available rate otherwise — rates
 * are shipment-scoped in Shippo, so a stored rate id from checkout time
 * can't be reused directly against a shipment created now.
 */
export async function buyLabel(
  shipFrom: ShipFromSettings,
  toAddress: ShipToAddress,
  items: ParcelLine[],
  preference?: { carrier?: string | null; service?: string | null }
): Promise<{ trackingNumber: string; carrier: string; service: string; labelUrl: string | null; trackingUrl: string | null }> {
  const { shipment, rates } = await getRates(shipFrom, toAddress, items);
  if (rates.length === 0) throw new Error("No shipping rates were available for this address.");

  const preferred =
    preference?.carrier && preference?.service
      ? rates.find((r) => r.carrier === preference.carrier && r.service === preference.service)
      : undefined;
  const chosen = preferred ?? rates.reduce((cheapest, r) => (r.rate < cheapest.rate ? r : cheapest), rates[0]);

  const rawRate = shipment.rates.find(
    (r) => r.provider === chosen.carrier && (r.servicelevel?.token ?? r.servicelevel?.name ?? "unknown") === chosen.service
  );
  if (!rawRate) throw new Error("Selected rate was no longer available on the shipment.");

  const transaction = await getShippingClient().transactions.create({
    rate: rawRate.objectId,
    labelFileType: "PDF",
    async: false,
  });

  if (!transaction.trackingNumber) {
    throw new Error("Shippo did not return a tracking number for the purchased label.");
  }

  return {
    trackingNumber: transaction.trackingNumber,
    carrier: chosen.carrier,
    service: chosen.service,
    labelUrl: transaction.labelUrl ?? null,
    trackingUrl: transaction.trackingUrlProvider ?? null,
  };
}

/** On-demand tracking refresh for the manual fallback UI. */
export async function getTrackerStatus(trackingCode: string, carrier: string) {
  const track = await getShippingClient().trackingStatus.get(trackingCode, carrier);
  return { status: track.trackingStatus?.status ?? "UNKNOWN", statusDetail: track.trackingStatus?.statusDetails ?? null };
}

/**
 * Shippo's own SDK ships a function called `validateWebhook`, but reading
 * its source confirms it only parses the payload against known schemas —
 * it performs no cryptographic verification at all. Real HMAC webhook
 * signing requires contacting Shippo's solutions team to provision a
 * token, which isn't available on a self-serve account. So this endpoint
 * is secured with a shared secret embedded in the registered webhook URL
 * instead (checked with a constant-time comparison) — the same pattern
 * this app already uses for the Vercel Cron endpoint (CRON_SECRET as a
 * bearer token). Callers must treat a false return as an invalid/untrusted
 * request, same discipline as the Stripe webhook.
 */
export function isValidWebhookToken(url: URL, secret: string): boolean {
  const provided = url.searchParams.get("token") ?? "";
  if (!secret || provided.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
}

export type PrismaShipmentStatus = "LABEL_CREATED" | "IN_TRANSIT" | "DELIVERED" | "RETURNED" | "FAILED";

/** Shippo's tracking-status vocabulary (TrackingStatusEnum) is a small,
 * uppercase, closed set — a much closer match to this app's own
 * ShipmentStatus enum than EasyPost's lowercase, more granular one was. */
export function mapTrackerStatus(status: string): PrismaShipmentStatus {
  switch (status) {
    case "DELIVERED":
      return "DELIVERED";
    case "TRANSIT":
      return "IN_TRANSIT";
    case "RETURNED":
      return "RETURNED";
    case "FAILURE":
      return "FAILED";
    case "PRE_TRANSIT":
    case "UNKNOWN":
    default:
      return "LABEL_CREATED";
  }
}
