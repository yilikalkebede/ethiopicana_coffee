import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import { supplierSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("MANAGER");

    const existing = await prisma.supplier.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Supplier not found." }, { status: 404 });

    const body = await request.json().catch(() => null);
    const parsed = supplierSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }

    const supplier = await prisma.supplier.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json({ supplier });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
