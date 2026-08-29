import EasyPostClient from "@easypost/api";
import type { IRate } from "@easypost/api";

type EasyPostClientInstance = InstanceType<typeof EasyPostClient>;

// Singleton pattern mirrors src/lib/stripe.ts, but lazily constructed:
// unlike the Stripe SDK (tolerant of an empty key until first API call),
// EasyPostClient's constructor throws immediately on a missing key, which
// would otherwise crash Next's build-time page-data collection for every
// route that imports this module before SHIPPING_API_KEY is ever set.
const globalForShipping = globalThis as unknown as { shippingClient?: EasyPostClientInstance };

function getShippingClient(): EasyPostClientInstance {
  if (!globalForShipping.shippingClient) {
    const client = new EasyPostClient(process.env.SHIPPING_API_KEY || "missing-key");
    if (process.env.NODE_ENV !== "production") {
      globalForShipping.shippingClient = client;
    }
    return client;
  }
  return globalForShipping.shippingClient;
}

/** Only EasyPost is actually wired up (SHIPPING_PROVIDER documents which
 * provider is active; a Shippo/ShipStation adapter isn't built since
 * nothing uses them — see the Phase 6 plan). */
export const SHIPPING_PROVIDER = "easypost";

/** Padded-mailer + tape estimate, added on top of real product weight —
 * documented here so it isn't a mystery number buried in a rate call. */
const PACKAGING_WEIGHT_GRAMS = 60;

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
    !settings.shipFromCountry
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
  };
}

function toEasyPostAddress(address: ShipToAddress) {
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
 * Creates a real EasyPost Shipment (their object — a container for rates,
 * distinct from our own Prisma `Shipment` model) and returns its quoted
 * rates. Returns the raw EasyPost shipment too, since buyLabel() needs it
 * to purchase a specific rate.
 */
export async function getRates(shipFrom: ShipFromSettings, toAddress: ShipToAddress, items: ParcelLine[]) {
  const fromAddress = requireShipFromAddress(shipFrom);
  const weight = totalParcelWeightOunces(items);

  const shipment = await getShippingClient().Shipment.create({
    from_address: fromAddress,
    to_address: toEasyPostAddress(toAddress),
    parcel: { weight },
  });

  const rates: RateOption[] = (shipment.rates ?? []).map((r: IRate) => ({
    carrier: r.carrier,
    service: r.service,
    rate: Number(r.rate),
    currency: r.currency,
    deliveryDays: r.delivery_days ?? null,
  }));

  return { shipment, rates };
}

/**
 * Buys a real label. Prefers the given carrier+service (what the shopper
 * was quoted at checkout, or what an earlier rate call already picked for
 * a free-shipping order) if it's still available on a freshly-created
 * shipment; falls back to the cheapest available rate otherwise — rates
 * are shipment-scoped in EasyPost, so a stored rate id from checkout time
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

  const rawRate = shipment.rates.find((r: IRate) => r.carrier === chosen.carrier && r.service === chosen.service);
  if (!rawRate) throw new Error("Selected rate was no longer available on the shipment.");
  const bought = await getShippingClient().Shipment.buy(shipment.id, rawRate);

  return {
    trackingNumber: bought.tracking_code,
    carrier: bought.selected_rate?.carrier ?? chosen.carrier,
    service: bought.selected_rate?.service ?? chosen.service,
    labelUrl: bought.postage_label?.label_url ?? null,
    trackingUrl: bought.tracker?.public_url ?? null,
  };
}

/** On-demand tracking refresh for the manual fallback UI — EasyPost
 * de-dupes Tracker.create() against an existing tracking_code+carrier
 * pair, so this just returns the current status rather than creating a
 * duplicate. */
export async function getTrackerStatus(trackingCode: string, carrier: string) {
  const tracker = await getShippingClient().Tracker.create({ tracking_code: trackingCode, carrier });
  return { status: tracker.status, statusDetail: tracker.status_detail ?? null };
}

/** Throws if the signature doesn't match — callers must treat that as an
 * invalid/untrusted request, same discipline as the Stripe webhook. */
export function validateWebhook(rawBody: Buffer, headers: Record<string, string>, secret: string) {
  return getShippingClient().Utils.validateWebhook(rawBody, headers, secret);
}

export type PrismaShipmentStatus = "LABEL_CREATED" | "IN_TRANSIT" | "DELIVERED" | "RETURNED" | "FAILED";

export function mapTrackerStatus(status: string): PrismaShipmentStatus {
  switch (status) {
    case "delivered":
      return "DELIVERED";
    case "in_transit":
    case "out_for_delivery":
    case "available_for_pickup":
      return "IN_TRANSIT";
    case "return_to_sender":
    case "cancelled":
      return "RETURNED";
    case "failure":
    case "error":
      return "FAILED";
    default:
      return "LABEL_CREATED";
  }
}
