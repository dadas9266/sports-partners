import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("sports");

export async function GET() {
  try {
    const sports = await prisma.sport.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ success: true, data: sports });
  } catch (error) {
    log.error("Sporlar yüklenirken hata", error);
    return NextResponse.json(
      { success: false, error: "Sporlar yüklenemedi" },
      { status: 500 }
    );
  }
}
