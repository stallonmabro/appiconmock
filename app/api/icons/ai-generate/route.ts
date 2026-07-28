import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateIconImages, hashPrompt } from "@/lib/imagen";

const GUEST_DAILY_LIMIT = 5;
const USER_DAILY_LIMIT = 20;

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role ?? "guest";

  // Determine daily limit
  const limit =
    role === "premium" || role === "admin"
      ? Infinity
      : role === "user"
        ? USER_DAILY_LIMIT
        : GUEST_DAILY_LIMIT;

  // Quota check for non-premium users with a valid user ID
  if (role !== "premium" && role !== "admin" && userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (user.aiQuotaResetAt < today) {
      await prisma.user.update({
        where: { id: userId },
        data: { aiQuotaUsed: 0, aiQuotaResetAt: new Date() },
      });
    } else if (user.aiQuotaUsed >= limit) {
      return NextResponse.json(
        {
          error:
            "Daily AI generation limit reached. Try again tomorrow or sign up for more.",
          quotaExceeded: true,
        },
        { status: 429 }
      );
    }
  }

  const { prompt } = await req.json();
  if (!prompt || prompt.length < 3) {
    return NextResponse.json(
      { error: "Prompt must be at least 3 characters" },
      { status: 400 }
    );
  }

  // Check cache
  const promptHash = hashPrompt(prompt);
  const cached = await prisma.aIGenerationCache.findUnique({
    where: { promptHash },
  });
  if (cached) {
    return NextResponse.json({ images: [cached.imageUrl], cached: true });
  }

  try {
    const images = await generateIconImages(prompt, 4);

    // Cache the first image
    await prisma.aIGenerationCache
      .create({
        data: { promptHash, imageUrl: images[0] },
      })
      .catch(() => {
        // Silently ignore duplicate key errors
      });

    // Increment quota for authenticated non-premium users
    if (userId && role !== "premium" && role !== "admin") {
      await prisma.user.update({
        where: { id: userId },
        data: { aiQuotaUsed: { increment: 1 } },
      });
    }

    return NextResponse.json({ images });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "AI generation failed";
    console.error("Imagen error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
