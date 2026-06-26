/**
 * Phase 3 financial-data backfill migration.
 * ─────────────────────────────────────────────
 * Encrypts existing plaintext financial fields into their *Enc columns:
 *
 *   Sale.totalPurchaseCost      → Sale.totalPurchaseCostEnc
 *   Sale.grossProfit            → Sale.grossProfitEnc
 *   SaleItem.purchasePrice      → SaleItem.purchasePriceEnc
 *   SaleItem.avgPurchaseCost    → SaleItem.avgPurchaseCostEnc
 *   SaleItem.itemProfit         → SaleItem.itemProfitEnc
 *   PurchaseItem.purchaseRate   → PurchaseItem.purchaseRateEnc
 *
 * SAFE TO RUN ANYTIME, REPEATEDLY, WHILE THE APP IS LIVE.
 *   - Purely additive: only ever WRITES to *Enc columns. Never reads from,
 *     modifies, or deletes any plaintext column. There is no destructive
 *     operation anywhere in this file.
 *   - Idempotent: a row whose *Enc column is already populated is treated
 *     as already-done and skipped (see isAlreadyEncrypted() below). Running
 *     this script ten times has the same end state as running it once.
 *   - Crash-safe: commits row-by-row in small batches, so an interruption
 *     partway through loses no data and is safe to simply re-run.
 *
 * THIS IS NOT THE CUTOVER SCRIPT. After running this and verifying the
 * application displays correct values everywhere, the SEPARATE script
 * `phase3_cutover.ts` (also provided) is what actually removes the
 * plaintext columns — and that one is destructive and requires an
 * explicit confirmation flag. Do not skip the verification step in between.
 *
 * USAGE:
 *   npx ts-node backend/src/migration/encryptFinancialData.ts
 *   npx ts-node backend/src/migration/encryptFinancialData.ts --dry-run
 *   npx ts-node backend/src/migration/encryptFinancialData.ts --batch-size=200
 */

import prisma from '../utils/prisma';
import { encryptFinancialData, decryptFinancialData } from '../utils/financialCrypto';

const DRY_RUN = process.argv.includes('--dry-run');
const batchArg = process.argv.find((a) => a.startsWith('--batch-size='));
const BATCH_SIZE = batchArg ? parseInt(batchArg.split('=')[1], 10) : 200;

/**
 * True if the *Enc column already has a real value — meaning this row was
 * already migrated (or was created post-encryption-rollout and already has
 * both columns populated by the dual-write in the controllers).
 */
function isAlreadyEncrypted(encValue: string | null | undefined): boolean {
  return encValue !== null && encValue !== undefined && encValue !== '';
}

/**
 * Encrypt a plaintext numeric value for backfill, treating null/undefined
 * the same way the application's own encryptFinancialData() does elsewhere
 * — i.e. only encrypt when there's a real value to protect.
 */
function migrateValue(plaintext: any): string | null {
  if (plaintext === null || plaintext === undefined) return null;
  const n = Number(plaintext);
  if (!Number.isFinite(n)) return null;
  return encryptFinancialData(n);
}

interface Counters {
  scanned: number;
  updated: number;
  errors: number;
}

function freshCounters(): Counters {
  return { scanned: 0, updated: 0, errors: 0 };
}

async function migrateSales(counters: Counters) {
  const total = await prisma.sale.count();
  console.log(`\n[sales] ${total} rows to scan`);

  let skip = 0;
  while (skip < total) {
    const batch = await prisma.sale.findMany({
      skip,
      take: BATCH_SIZE,
      select: {
        id: true,
        totalPurchaseCost: true,
        totalPurchaseCostEnc: true,
        grossProfit: true,
        grossProfitEnc: true,
      },
    });

    for (const s of batch as any[]) {
      counters.scanned++;
      try {
        const data: Record<string, any> = {};

        if (!isAlreadyEncrypted(s.totalPurchaseCostEnc)) {
          const enc = migrateValue(s.totalPurchaseCost);
          if (enc !== null) data.totalPurchaseCostEnc = enc;
        }

        if (!isAlreadyEncrypted(s.grossProfitEnc)) {
          const enc = migrateValue(s.grossProfit);
          if (enc !== null) data.grossProfitEnc = enc;
        }

        if (Object.keys(data).length > 0) {
          counters.updated++;
          if (!DRY_RUN) {
            await prisma.sale.update({ where: { id: s.id }, data });
          }
        }
      } catch (err) {
        counters.errors++;
        console.error(`[sales] FAILED id=${s.id}:`, (err as Error).message);
      }
    }

    skip += BATCH_SIZE;
    console.log(`[sales] processed ${Math.min(skip, total)}/${total}`);
  }
}

async function migrateSaleItems(counters: Counters) {
  const total = await prisma.saleItem.count();
  console.log(`\n[sale_items] ${total} rows to scan`);

  let skip = 0;
  while (skip < total) {
    const batch = await prisma.saleItem.findMany({
      skip,
      take: BATCH_SIZE,
      select: {
        id: true,
        purchasePrice: true,
        purchasePriceEnc: true,
        avgPurchaseCost: true,
        avgPurchaseCostEnc: true,
        itemProfit: true,
        itemProfitEnc: true,
      },
    });

    for (const item of batch as any[]) {
      counters.scanned++;
      try {
        const data: Record<string, any> = {};

        if (!isAlreadyEncrypted(item.purchasePriceEnc)) {
          const enc = migrateValue(item.purchasePrice);
          if (enc !== null) data.purchasePriceEnc = enc;
        }

        if (!isAlreadyEncrypted(item.avgPurchaseCostEnc)) {
          const enc = migrateValue(item.avgPurchaseCost);
          if (enc !== null) data.avgPurchaseCostEnc = enc;
        }

        if (!isAlreadyEncrypted(item.itemProfitEnc)) {
          const enc = migrateValue(item.itemProfit);
          if (enc !== null) data.itemProfitEnc = enc;
        }

        if (Object.keys(data).length > 0) {
          counters.updated++;
          if (!DRY_RUN) {
            await prisma.saleItem.update({ where: { id: item.id }, data });
          }
        }
      } catch (err) {
        counters.errors++;
        console.error(`[sale_items] FAILED id=${item.id}:`, (err as Error).message);
      }
    }

    skip += BATCH_SIZE;
    console.log(`[sale_items] processed ${Math.min(skip, total)}/${total}`);
  }
}

async function migratePurchaseItems(counters: Counters) {
  const total = await prisma.purchaseItem.count();
  console.log(`\n[purchase_items] ${total} rows to scan`);

  let skip = 0;
  while (skip < total) {
    const batch = await prisma.purchaseItem.findMany({
      skip,
      take: BATCH_SIZE,
      select: {
        id: true,
        purchaseRate: true,
        purchaseRateEnc: true,
      },
    });

    for (const item of batch as any[]) {
      counters.scanned++;
      try {
        if (!isAlreadyEncrypted(item.purchaseRateEnc)) {
          const enc = migrateValue(item.purchaseRate);
          if (enc !== null) {
            counters.updated++;
            if (!DRY_RUN) {
              await prisma.purchaseItem.update({
                where: { id: item.id },
                data: { purchaseRateEnc: enc },
              });
            }
          }
        }
      } catch (err) {
        counters.errors++;
        console.error(`[purchase_items] FAILED id=${item.id}:`, (err as Error).message);
      }
    }

    skip += BATCH_SIZE;
    console.log(`[purchase_items] processed ${Math.min(skip, total)}/${total}`);
  }
}

/**
 * Spot-check: after migrating, re-read a small sample and confirm the
 * encrypted value actually decrypts back to the original plaintext number.
 * This catches a wrong ENCRYPTION_KEY / FINANCIAL_ENCRYPT_KEY, a bug in
 * encryptFinancialData(), or silent data corruption — before you trust
 * the migration enough to ever consider removing the plaintext columns.
 */
async function verifySample() {
  console.log('\n' + '─'.repeat(60));
  console.log('VERIFICATION — spot-checking 5 sales and 5 purchase items');
  console.log('─'.repeat(60));

  const sales = await prisma.sale.findMany({
    take: 5,
    where: { grossProfitEnc: { not: null } },
    select: { id: true, grossProfit: true, grossProfitEnc: true },
  });

  for (const s of sales as any[]) {
    const decrypted = decryptFinancialData(s.grossProfitEnc);
    const expected = Number(s.grossProfit ?? 0);
    const match = Math.abs(decrypted - expected) < 0.01;
    console.log(
      `  Sale #${s.id}: plaintext=${expected}  decrypted(enc)=${decrypted}  ${match ? '✓ match' : '✗ MISMATCH'}`
    );
    if (!match) {
      console.warn('  ⚠ Mismatch detected — do NOT proceed to remove plaintext columns until this is investigated.');
    }
  }

  const items = await prisma.purchaseItem.findMany({
    take: 5,
    where: { purchaseRateEnc: { not: null } },
    select: { id: true, purchaseRate: true, purchaseRateEnc: true },
  });

  for (const item of items as any[]) {
    const decrypted = decryptFinancialData(item.purchaseRateEnc);
    const expected = Number(item.purchaseRate ?? 0);
    const match = Math.abs(decrypted - expected) < 0.01;
    console.log(
      `  PurchaseItem #${item.id}: plaintext=${expected}  decrypted(enc)=${decrypted}  ${match ? '✓ match' : '✗ MISMATCH'}`
    );
    if (!match) {
      console.warn('  ⚠ Mismatch detected — do NOT proceed to remove plaintext columns until this is investigated.');
    }
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('Phase 3 financial data — backfill migration');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE (will write to DB)'}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log('═'.repeat(60));

  const totals: Record<string, Counters> = {
    sales: freshCounters(),
    saleItems: freshCounters(),
    purchaseItems: freshCounters(),
  };

  await migrateSales(totals.sales);
  await migrateSaleItems(totals.saleItems);
  await migratePurchaseItems(totals.purchaseItems);

  console.log('\n' + '═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));
  let grandScanned = 0, grandUpdated = 0, grandErrors = 0;
  for (const [table, c] of Object.entries(totals)) {
    console.log(`${table.padEnd(15)} scanned=${c.scanned}  updated=${c.updated}  errors=${c.errors}`);
    grandScanned += c.scanned;
    grandUpdated += c.updated;
    grandErrors += c.errors;
  }
  console.log('-'.repeat(60));
  console.log(`TOTAL           scanned=${grandScanned}  updated=${grandUpdated}  errors=${grandErrors}`);

  if (!DRY_RUN && grandUpdated > 0) {
    await verifySample();
  }

  if (DRY_RUN) {
    console.log('\nThis was a dry run — no data was changed. Re-run without --dry-run to apply.');
  }
  if (grandErrors > 0) {
    console.log(`\n⚠ ${grandErrors} row(s) failed to migrate — see errors above. Safe to re-run; already-migrated rows are skipped.`);
    process.exitCode = 1;
  } else if (!DRY_RUN) {
    console.log('\n✓ Migration complete. Next step: manually verify the Profit Report, Inventory');
    console.log('  Report, and a handful of individual Sales/Purchases through the actual app UI');
    console.log('  (not direct SQL) before considering phase3_cutover.ts.');
  }
}

main()
  .catch((err) => {
    console.error('Migration crashed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });