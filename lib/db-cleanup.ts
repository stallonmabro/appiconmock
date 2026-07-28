import { prisma } from "./prisma";

export async function cleanupExpiredExports() {
  await prisma.export.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

export async function cleanupExpiredAICache() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.aIGenerationCache.deleteMany({
    where: { createdAt: { lt: oneDayAgo } },
  });
}

export async function resetDailyQuotas() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.user.updateMany({
    where: { aiQuotaResetAt: { lt: yesterday } },
    data: { aiQuotaUsed: 0, aiQuotaResetAt: new Date() },
  });
}
