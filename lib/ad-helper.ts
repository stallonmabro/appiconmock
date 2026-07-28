import { prisma } from "./prisma";

const FREQUENCY_MS = 3 * 60 * 1000; // 3 minutes

export async function canShowAd(userId: string | null, placement: string): Promise<boolean> {
  if (!userId) return true; // guests always see ads

  const session = await prisma.adImpression.findFirst({
    where: { userId },
    orderBy: { timestamp: "desc" },
  });

  // Registered users: 1 ad per session (no recent impression)
  if (session && Date.now() - session.timestamp.getTime() < FREQUENCY_MS) {
    return false;
  }
  return true;
}
