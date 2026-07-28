import { NextRequest, NextResponse } from "next/server";
import { generateIconZIP, compositeLayers } from "@/lib/sharp-pipeline";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { v4 as uuid } from "uuid";
import fs from "fs/promises";
import path from "path";
import { createWriteStream } from "fs";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id || "guest";
  const role = session?.user?.role || "guest";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const count = await prisma.export.count({
    where: { userId, createdAt: { gte: today } },
  });
  const limit = role === "guest" ? 3 : role === "premium" ? Infinity : 20;
  if (count >= limit) {
    return NextResponse.json(
      { error: "Daily export limit reached. Sign up for more." },
      { status: 429 }
    );
  }

  const { layers, canvasSize = 1024, exportType = "all", customSizes } = await req.json();

  if (!layers?.length) {
    return NextResponse.json({ error: "No layers to export" }, { status: 400 });
  }

  try {
    const compositeBuffer = await compositeLayers(layers, canvasSize);
    const exportId = uuid();
    const fileName = `icon-export-${exportId}.zip`;
    const exportDir = path.join(process.cwd(), "storage", "exports");
    const filePath = path.join(exportDir, fileName);

    await fs.mkdir(exportDir, { recursive: true });

    await new Promise<void>((resolve, reject) => {
      const writeStream = createWriteStream(filePath);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
      generateIconZIP(writeStream, compositeBuffer, exportType, customSizes).catch(reject);
    });

    const { size: fileSize } = await fs.stat(filePath);

    await prisma.export.create({
      data: {
        userId,
        projectId: "00000000-0000-0000-0000-000000000000",
        type: exportType === "all" ? "ios" : (exportType as "ios" | "android" | "mockup"),
        fileUrl: `/storage/exports/${fileName}`,
        fileSize,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      downloadUrl: `/api/download/${fileName}`,
      fileSize,
    });
  } catch (err) {
    console.error("Export failed:", err);
    return NextResponse.json({ error: "Export failed. Try again." }, { status: 500 });
  }
}
