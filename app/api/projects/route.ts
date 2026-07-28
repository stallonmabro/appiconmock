import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, type: true, thumbnailUrl: true, updatedAt: true },
    take: 50,
  });
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, type, state } = await req.json();
  if (!name || !type) return NextResponse.json({ error: "Name and type required" }, { status: 400 });

  const project = await prisma.project.create({
    data: { userId: session.user.id, name, type: type as any, state: state || {} },
  });
  return NextResponse.json({ project });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.project.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ success: true });
}
