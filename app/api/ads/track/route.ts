import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  const { placement } = await req.json();

  await prisma.adImpression.create({
    data: {
      userId: session?.user?.id || null,
      placement: placement as any,
    },
  });

  return NextResponse.json({ tracked: true });
}
