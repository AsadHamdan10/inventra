/**
 * migrate-payables.ts
 * ─────────────────────────────────────────────────────────────
 * One-time migration: backfill PayablePayment rows from
 * historical Purchase.paymentPaid values.
 *
 * Safe to run multiple times — idempotent by design.
 *
 * Usage:
 *   npx ts-node scripts/migrate-payables.ts
 *
 * Output:
 *   Migrated X purchases
 *   Skipped  Y purchases
 *   Created  Z payable payment records
 * ─────────────────────────────────────────────────────────────
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('──────────────────────────────────────────────');
  console.log('  Inventra — PayablePayment Migration');
  console.log('──────────────────────────────────────────────');
  console.log('Starting migration...\n');

  // Fetch every purchase that has paymentPaid > 0
  const candidates = await prisma.purchase.findMany({
    where: {
      paymentPaid: { gt: 0 },
    },
    select: {
      id:          true,
      billNo:      true,
      billDate:    true,
      paymentPaid: true,
      grandTotal:  true,
      vendorName:  true,
      // Count existing PayablePayment rows for this purchase
      _count: {
        select: { PayablePayments: true },
      },
    },
    orderBy: { id: 'asc' },
  });

  console.log(`Found ${candidates.length} purchase(s) with paymentPaid > 0.\n`);

  let migrated = 0;
  let skipped  = 0;
  let created  = 0;

  for (const purchase of candidates) {
    const existingCount = purchase._count.PayablePayments;

    // Skip if any PayablePayment already exists for this purchase
    if (existingCount > 0) {
      console.log(
        `  SKIP  #${purchase.id} — ${purchase.billNo} (${purchase.vendorName})` +
        ` — already has ${existingCount} payment record(s)`
      );
      skipped++;
      continue;
    }

    const amount = new Prisma.Decimal(purchase.paymentPaid.toString());

    // Create the single backfill PayablePayment row
    await prisma.payablePayment.create({
      data: {
        purchaseId: purchase.id,
        amount,
        datePaid:   purchase.billDate,   // best available date
        mode:       'Legacy Migration',
        reference:  'Migrated from old purchase paymentPaid',
        notes:      'Auto-created during PayablePayment migration',
      },
    });

    // Verify purchase.paymentPaid still matches (it should — we never touch it)
    // Re-sync just to be safe so syncPaymentPaid() logic stays canonical.
    const totals = await prisma.payablePayment.aggregate({
      where: { purchaseId: purchase.id },
      _sum:  { amount: true },
    });

    await prisma.purchase.update({
      where: { id: purchase.id },
      data:  { paymentPaid: totals._sum.amount ?? 0 },
    });

    console.log(
      `  DONE  #${purchase.id} — ${purchase.billNo} (${purchase.vendorName})` +
      ` — migrated ₹${amount.toFixed(2)}`
    );

    migrated++;
    created++;
  }

  console.log('\n──────────────────────────────────────────────');
  console.log(`  Migrated ${migrated} purchase(s)`);
  console.log(`  Skipped  ${skipped} purchase(s)`);
  console.log(`  Created  ${created} payable payment record(s)`);
  console.log('──────────────────────────────────────────────\n');
  console.log('Migration complete. All future payments must be');
  console.log('recorded via POST /purchases/payments only.');
  console.log('──────────────────────────────────────────────\n');
}

main()
  .catch((err) => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });