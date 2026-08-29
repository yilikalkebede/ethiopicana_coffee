import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";

const bodySchema = z.object({
  status: z.enum(["ACTIVE", "DEACTIVATED"]),
});

// PATCH /api/admin/users/:id/status
//
// Admin-only, same as role changes. Deactivating a user also tears down
// their sessions immediately (getCurrentUser already rejects non-ACTIVE
// users, but this closes the gap for requests already in flight with a
// still-valid cookie rather than waiting on that check).
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actingAdmin = await requireRole("ADMIN");

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    if (params.id === actingAdmin.id && parsed.data.status !== "ACTIVE") {
      return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: params.id } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: params.id },
        data: { status: parsed.data.status },
      });

      if (parsed.data.status === "DEACTIVATED") {
        await tx.session.deleteMany({ where: { userId: user.id } });
      }

      await tx.auditLog.create({
        data: {
          userId: actingAdmin.id,
          action: "USER_STATUS_CHANGED",
          entity: "User",
          entityId: user.id,
          oldValue: { status: targetUser.status },
          newValue: { status: user.status },
          ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
        },
      });

      return user;
    });

    return NextResponse.json({
      user: { id: updated.id, email: updated.email, status: updated.status },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
