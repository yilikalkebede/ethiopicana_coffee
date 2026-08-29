import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const profileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});

/**
 * Email is deliberately not editable here — changing it would need to
 * re-run the email-verification flow (spec §3: registration already
 * issues an EmailVerificationToken), which is out of scope for this fix.
 * Name/phone are safe to update directly.
 */
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone || null,
    },
  });

  return NextResponse.json({
    user: { firstName: updated.firstName, lastName: updated.lastName, phone: updated.phone },
  });
}
