import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";

const bodySchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "CUSTOMER"]),
});

// PATCH /api/admin/users/:id/role
//
// This is the one action the spec calls out as admin-only, even for
// managers: only ADMIN can change roles. Every change is written to
// AuditLogs with the before/after value, independent of anything the
// client claims — the frontend "are you sure?" dialog is a UX nicety,
// not the security boundary.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actingAdmin = await requireRole("ADMIN");

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: params.id } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (targetUser.id === actingAdmin.id && parsed.data.role !== "ADMIN") {
      return NextResponse.json(
        { error: "You cannot remove your own admin access." },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: params.id },
        data: { role: parsed.data.role },
      });

      await tx.auditLog.create({
        data: {
          userId: actingAdmin.id,
          action: "USER_ROLE_CHANGED",
          entity: "User",
          entityId: user.id,
          oldValue: { role: targetUser.role },
          newValue: { role: user.role },
          ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
        },
      });

      return user;
    });

    return NextResponse.json({
      user: { id: updated.id, email: updated.email, role: updated.role },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
