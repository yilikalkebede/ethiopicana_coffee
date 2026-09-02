import { cache } from "react";
import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "singleton";

export type Settings = {
  freeShippingThreshold: number;
  flatShippingRate: number;
  checkoutReservationMinutes: number;
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

/**
 * Reads the one Settings row, creating it with schema defaults on first
 * call (so there's no manual seed step — the row just materializes the
 * first time anything asks). Returns plain numbers rather than Prisma's
 * Decimal so the result is safe to pass straight into client-component
 * props without another serialization step.
 *
 * Wrapped in React.cache() — the root layout (for CartDrawer's free-
 * shipping threshold) and pages like /cart and /checkout each call this
 * independently on the same request; without memoizing, that's a repeated
 * upsert-read for the one Settings row on every page load.
 */
export const getSettings = cache(async (): Promise<Settings> => {
  const row = await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  });

  return {
    freeShippingThreshold: Number(row.freeShippingThreshold),
    flatShippingRate: Number(row.flatShippingRate),
    checkoutReservationMinutes: row.checkoutReservationMinutes,
    shipFromName: row.shipFromName,
    shipFromCompany: row.shipFromCompany,
    shipFromAddress1: row.shipFromAddress1,
    shipFromAddress2: row.shipFromAddress2,
    shipFromCity: row.shipFromCity,
    shipFromState: row.shipFromState,
    shipFromPostalCode: row.shipFromPostalCode,
    shipFromCountry: row.shipFromCountry,
    shipFromPhone: row.shipFromPhone,
    shipFromEmail: row.shipFromEmail,
  };
});
