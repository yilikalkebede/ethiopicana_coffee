import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError } from "@/lib/auth";
import { supplierSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireRole("MANAGER");
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ suppliers });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole("MANAGER");

    const body = await request.json().catch(() => null);
    const parsed = supplierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({ data: parsed.data });
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
