import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateIconImages, hashPrompt } from "@/lib/imagen";

const GUEST_DAILY_LIMIT = 5;
const USER_DAILY_LIMIT = 20;

// In-memory guest quota tracker keyed by hashed IP.
// Entries are cleaned up on each request when their resetAt has passed.
const guestQuota = new Map<string, { count: number; resetAt: Date }>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkGuestQuota(ipHash: string): boolean {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Clean up stale entries across the whole map
  for (const [key, entry] of guestQuota) {
    if (entry.resetAt < today) {
      guestQuota.delete(key);
    }
  }

  const entry = guestQuota.get(ipHash);
  if (!entry || entry.resetAt < today) {
    guestQuota.set(ipHash, { count: 0, resetAt: now });
    return true;
  }

  return entry.count < GUEST_DAILY_LIMIT;
}

function incrementGuestQuota(ipHash: string): void {
  const entry = guestQuota.get(ipHash);
  if (entry) {
    entry.count += 1;
  }
}

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

  // Quota check for authenticated non-premium users (DB-backed).
  // NOTE: The read-then-write pattern here (fetch quota, compare, then update)
  // is not transactional. Concurrent requests can slip past the limit. Acceptable
  // for v1 scale — if this becomes a problem, wrap in a Prisma transaction or
  // use an atomic conditional update.
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

  // Quota check for unauthenticated guests (IP-based, in-memory).
  if (!userId) {
    const ip = getClientIp(req);
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);

    if (!checkGuestQuota(ipHash)) {
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

    // Increment guest IP quota
    if (!userId) {
      const ip = getClientIp(req);
      const ipHash = crypto
        .createHash("sha256")
        .update(ip)
        .digest("hex")
        .slice(0, 16);
      incrementGuestQuota(ipHash);
    }

    return NextResponse.json({ images });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "AI generation failed";
    console.error("Imagen error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
