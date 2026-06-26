import prisma from './prisma';

/**
 * Generate collision-safe tenant-scoped IDs.
 * Format: INV-USER15-0001, PUR-USER15-0002
 * Mirrors PHP generateTenantId() exactly.
 */
export async function generateTenantId(
  prefix: string,
  userId: number
): Promise<string> {
  // Use a transaction to safely increment the sequence
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.tenantSequence.findUnique({
      where: { userId_prefix: { userId, prefix } },
    });

    const nextSeq = (existing?.seq ?? 0) + 1;

    await tx.tenantSequence.upsert({
      where: { userId_prefix: { userId, prefix } },
      create: { userId, prefix, seq: nextSeq },
      update: { seq: nextSeq },
    });

    return nextSeq;
  });

  return `${prefix}-USER${userId}-${String(result).padStart(4, '0')}`;
}
