import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

const SETTINGS_ID = "singleton";

const settingsSchema = z.object({
  freeShippingThreshold: z.number().nonnegative(),
  flatShippingRate: z.number().nonnegative(),
  checkoutReservationMinutes: z.number().int().min(30).max(1440),
  shipFromName: z.string().optional(),
  shipFromCompany: z.string().optional(),
  shipFromAddress1: z.string().optional(),
  shipFromAddress2: z.string().optional(),
  shipFromCity: z.string().optional(),
  shipFromState: z.string().optional(),
  shipFromPostalCode: z.string().optional(),
  shipFromCountry: z.string().optional(),
  shipFromPhone: z.string().optional(),
  shipFromEmail: z.string().email().optional(),
});

export async function GET() {
  try {
    await requireRole("ADMIN");
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireRole("ADMIN");

    const body = await request.json().catch(() => null);
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await getSettings();

    const updated = await prisma.$transaction(async (tx) => {
      const settings = await tx.settings.upsert({
        where: { id: SETTINGS_ID },
        update: parsed.data,
        create: { id: SETTINGS_ID, ...parsed.data },
      });

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "SETTINGS_UPDATED",
          entity: "Settings",
          entityId: SETTINGS_ID,
          oldValue: existing,
          newValue: parsed.data,
        },
      });

      return settings;
    });

    return NextResponse.json({
      settings: {
        freeShippingThreshold: Number(updated.freeShippingThreshold),
        flatShippingRate: Number(updated.flatShippingRate),
        checkoutReservationMinutes: updated.checkoutReservationMinutes,
        shipFromName: updated.shipFromName,
        shipFromCompany: updated.shipFromCompany,
        shipFromAddress1: updated.shipFromAddress1,
        shipFromAddress2: updated.shipFromAddress2,
        shipFromCity: updated.shipFromCity,
        shipFromState: updated.shipFromState,
        shipFromPostalCode: updated.shipFromPostalCode,
        shipFromCountry: updated.shipFromCountry,
        shipFromPhone: updated.shipFromPhone,
        shipFromEmail: updated.shipFromEmail,
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
