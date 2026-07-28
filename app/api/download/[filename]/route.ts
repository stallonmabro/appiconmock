import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Sanitize: only allow alphanumeric, dots, dashes, underscores
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  if (sanitized !== filename) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const exportDir = path.join(process.cwd(), "storage", "exports");
  const resolved = path.resolve(exportDir, sanitized);

  // Prevent path traversal — resolved must stay within exportDir
  if (!resolved.startsWith(exportDir + path.sep)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  try {
    const buffer = await fs.readFile(resolved);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${sanitized}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found or expired" }, { status: 404 });
  }
}
