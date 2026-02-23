import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("locations");

export async function GET() {
  try {
    const countries = await prisma.country.findMany({
      include: { cities: { include: { districts: true }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, data: countries });
  } catch (error) {
    log.error("Konumlar yüklenirken hata", error);
    return NextResponse.json(
      { success: false, error: "Konumlar yüklenemedi" },
      { status: 500 }
    );
  }
}
