import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** POST /api/push/subscribe — abonelik kaydet */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const body = await req.json();
  const { endpoint, p256dh, auth: authKey } = body as {
    endpoint: string;
    p256dh: string;
    auth: string;
  };

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: "Eksik alanlar" }, { status: 400 });
  }

  await (prisma as any).pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh, auth: authKey, userId: session.user.id },
    create: { endpoint, p256dh, auth: authKey, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/push/subscribe — aboneliği iptal et */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { endpoint } = (await req.json()) as { endpoint: string };
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint gerekli" }, { status: 400 });
  }

  await (prisma as any).pushSubscription
    .deleteMany({
      where: { endpoint, userId: session.user.id },
    })
    .catch(() => null); // zaten yoksa sessizce geç

  return NextResponse.json({ ok: true });
}
