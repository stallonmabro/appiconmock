import { NextRequest, NextResponse } from "next/server";
import { mkdir, stat } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { renderMockupExport } from "@/lib/mockup-renderer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id || "guest";

  const {
    screenshot: screenshotDataUrl,
    frameId,
    colorId,
    scale = 1,
  } = await req.json();

  if (!screenshotDataUrl || !frameId) {
    return NextResponse.json(
      { error: "Missing screenshot or frame selection" },
      { status: 400 },
    );
  }

  // Load frame metadata
  const metadata = await import("@/public/frames/metadata.json");
  const device = (metadata as any).devices.find((d: any) => d.id === frameId);
  if (!device) {
    return NextResponse.json(
      { error: "Device frame not found" },
      { status: 404 },
    );
  }
  const color =
    device.colors.find((c: any) => c.id === colorId) || device.colors[0];
  const frameConfig = {
    frameImage: color.frameImage,
    screenMask: device.screenMask,
    frameSize: device.frameSize,
  };

  // Decode base64 screenshot
  const base64Data = screenshotDataUrl.replace(
    /^data:image\/\w+;base64,/,
    "",
  );
  const screenshotBuffer = Buffer.from(base64Data, "base64");

  const exportId = uuid();
  const fileName = `mockup-${exportId}.png`;
  const dirPath = path.join(process.cwd(), "storage", "exports");
  await mkdir(dirPath, { recursive: true });
  const filePath = path.join(dirPath, fileName);

  await renderMockupExport(screenshotBuffer, frameConfig, filePath, scale);

  const { size: fileSize } = await stat(filePath);

  await prisma.export.create({
    data: {
      userId,
      projectId: null,
      type: "mockup",
      fileUrl: `/storage/exports/${fileName}`,
      fileSize,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  return NextResponse.json({ downloadUrl: `/api/download/${fileName}`, fileSize });
}
