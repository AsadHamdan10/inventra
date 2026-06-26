/**
 * Phase 3 CUTOVER script — DESTRUCTIVE. Read this whole file before running it.
 * ───────────────────────────────────────────────────────────────────────────
 * This is the step that actually achieves Phase 3's security goal: it clears
 * the plaintext financial columns (totalPurchaseCost, grossProfit,
 * purchasePrice, avgPurchaseCost, itemProfit, purchaseRate) so they no
 * longer hold readable numbers — only their *Enc counterparts do.
 *
 * DO NOT RUN THIS until:
 *   1. encryptFinancialData.ts (the backfill migration) has been run
 *      successfully against this database, with zero errors.
 *   2. You have manually verified — through the actual application UI,
 *      not direct SQL — that the Profit Report, Inventory Report,
 *      Dashboard, and several individual Sales/Purchases all show correct
 *      values.
 *   3. You have a verified, restorable database backup taken AFTER step 1
 *      but BEFORE running this script. If this script has a bug, or if
 *      ENCRYPTION_KEY/FINANCIAL_ENCRYPT_KEY is ever lost or rotated
 *      incorrectly afterward, the plaintext values cleared by this script
 *      are gone — the *Enc columns become the ONLY copy of this data.
 *
 * WHAT THIS SCRIPT DOES NOT DO:
 *   - It does NOT drop any column from the database. It only sets
 *     plaintext financial columns to NULL on rows where the matching *Enc
 *     column is confirmed populated.
 *   - It does NOT modify prisma/schema.prisma. Actually removing the
 *     plaintext columns from the schema (and generating/applying that
 *     Prisma migration) is a separate, manual step — intentionally left
 *     out of this script, because that requires editing your schema file
 *     directly and a column-drop migration should always be reviewed by
 *     a human before it's applied, not run unattended.
 *
 * SAFETY GATES BUILT IN:
 *   - Refuses to run at all without --confirm on the command line.
 *   - Pre-flight check: scans every row first; if ANY row has a populated
 *     plaintext value but an EMPTY *Enc column, the script aborts before
 *     clearing anything, anywhere. A single un-migrated row blocks the
 *     entire run — this prevents silent data loss on a row the backfill
 *     missed.
 *   - --dry-run shows exactly what would be cleared without clearing it.
 *
 * USAGE:
 *   npx ts-node backend/src/migration/phase3_cutover.ts --dry-run
 *   npx ts-node backend/src/migration/phase3_cutover.ts --confirm
 */

import prisma from '../utils/prisma';

const DRY_RUN = process.argv.includes('--dry-run');
const CONFIRMED = process.argv.includes('--confirm');

if (!DRY_RUN && !CONFIRMED) {
  console.error('');
  console.error('╔══════════════════════════════════════════════════════════╗');
  console.error('║  REFUSING TO RUN                                          ║');
  console.error('╚══════════════════════════════════════════════════════════╝');
  console.error('');
  console.error('This script clears plaintext financial data permanently.');
  console.error('Run with --dry-run first to preview, then --confirm to apply.');
  console.error('');
  console.error('  npx ts-node backend/src/migration/phase3_cutover.ts --dry-run');
  console.error('  npx ts-node backend/src/migration/phase3_cutover.ts --confirm');
  console.error('');
  process.exit(1);
}

function isEmpty(val: any): boolean {
  return val === null || val === undefined || val === '';
}

function isPresent(val: any): boolean {
  return !isEmpty(val);
}

interface PreflightResult {
  table: string;
  blockers: { id: number; plaintextField: string; encField: string }[];
}

/**
 * Pre-flight: find any row where a plaintext financial field has a real
 * value but its *Enc counterpart is empty. If even one exists, the whole
 * cutover is aborted — that row's data would be permanently lost if we
 * proceeded to null out the plaintext column.
 */
async function preflightSales(): Promise<PreflightResult> {
  const rows = await prisma.sale.findMany({
    select: { id: true, totalPurchaseCost: true, totalPurchaseCostEnc: true, grossProfit: true, grossProfitEnc: true },
  });

  const blockers: PreflightResult['blockers'] = [];
  for (const r of rows as any[]) {
    if (isPresent(r.totalPurchaseCost) && isEmpty(r.totalPurchaseCostEnc)) {
      blockers.push({ id: r.id, plaintextField: 'totalPurchaseCost', encField: 'totalPurchaseCostEnc' });
    }
    if (isPresent(r.grossProfit) && isEmpty(r.grossProfitEnc)) {
      blockers.push({ id: r.id, plaintextField: 'grossProfit', encField: 'grossProfitEnc' });
    }
  }
  return { table: 'sales', blockers };
}

async function preflightSaleItems(): Promise<PreflightResult> {
  const rows = await prisma.saleItem.findMany({
    select: {
      id: true,
      purchasePrice: true, purchasePriceEnc: true,
      avgPurchaseCost: true, avgPurchaseCostEnc: true,
      itemProfit: true, itemProfitEnc: true,
    },
  });

  const blockers: PreflightResult['blockers'] = [];
  for (const r of rows as any[]) {
    if (isPresent(r.purchasePrice) && isEmpty(r.purchasePriceEnc)) {
      blockers.push({ id: r.id, plaintextField: 'purchasePrice', encField: 'purchasePriceEnc' });
    }
    if (isPresent(r.avgPurchaseCost) && isEmpty(r.avgPurchaseCostEnc)) {
      blockers.push({ id: r.id, plaintextField: 'avgPurchaseCost', encField: 'avgPurchaseCostEnc' });
    }
    if (isPresent(r.itemProfit) && isEmpty(r.itemProfitEnc)) {
      blockers.push({ id: r.id, plaintextField: 'itemProfit', encField: 'itemProfitEnc' });
    }
  }
  return { table: 'sale_items', blockers };
}

async function preflightPurchaseItems(): Promise<PreflightResult> {
  const rows = await prisma.purchaseItem.findMany({
    select: { id: true, purchaseRate: true, purchaseRateEnc: true },
  });

  const blockers: PreflightResult['blockers'] = [];
  for (const r of rows as any[]) {
    if (isPresent(r.purchaseRate) && isEmpty(r.purchaseRateEnc)) {
      blockers.push({ id: r.id, plaintextField: 'purchaseRate', encField: 'purchaseRateEnc' });
    }
  }
  return { table: 'purchase_items', blockers };
}

async function clearSalePlaintext(): Promise<number> {
  const rows = await prisma.sale.findMany({
    where: { OR: [{ totalPurchaseCostEnc: { not: null } }, { grossProfitEnc: { not: null } }] },
    select: { id: true, totalPurchaseCostEnc: true, grossProfitEnc: true },
  });

  let count = 0;
  for (const r of rows as any[]) {
    const data: Record<string, any> = {};
    if (isPresent(r.totalPurchaseCostEnc)) data.totalPurchaseCost = null;
    if (isPresent(r.grossProfitEnc)) data.grossProfit = null;
    if (Object.keys(data).length > 0) {
      count++;
      if (!DRY_RUN) await prisma.sale.update({ where: { id: r.id }, data });
    }
  }
  return count;
}

async function clearSaleItemPlaintext(): Promise<number> {
  const rows = await prisma.saleItem.findMany({
    where: {
      OR: [
        { purchasePriceEnc: { not: null } },
        { avgPurchaseCostEnc: { not: null } },
        { itemProfitEnc: { not: null } },
      ],
    },
    select: { id: true, purchasePriceEnc: true, avgPurchaseCostEnc: true, itemProfitEnc: true },
  });

  let count = 0;
  for (const r of rows as any[]) {
    const data: Record<string, any> = {};
    if (isPresent(r.purchasePriceEnc)) data.purchasePrice = null;
    if (isPresent(r.avgPurchaseCostEnc)) data.avgPurchaseCost = null;
    if (isPresent(r.itemProfitEnc)) data.itemProfit = null;
    if (Object.keys(data).length > 0) {
      count++;
      if (!DRY_RUN) await prisma.saleItem.update({ where: { id: r.id }, data });
    }
  }
  return count;
}

async function clearPurchaseItemPlaintext(): Promise<number> {
  const rows = await prisma.purchaseItem.findMany({
    where: {
      purchaseRateEnc: {
        not: null,
      },
    },
    select: {
      id: true,
    },
  });

  let count = 0;

  for (const r of rows) {
    if (!DRY_RUN) {
      await prisma.purchaseItem.update({
        where: {
          id: r.id,
        },
        data: {
          purchaseRate: null,
        },
      });
    }

    count++;
  }

  return count;
}

async function main() {
  console.log('═'.repeat(60));
  console.log('Phase 3 CUTOVER — clearing plaintext financial columns');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only, no writes)' : '⚠ LIVE — WILL CLEAR PLAINTEXT DATA'}`);
  console.log('═'.repeat(60));

  console.log('\nRunning pre-flight check (no writes happen during this step)...');
  const [salesPF, saleItemsPF, purchaseItemsPF] = await Promise.all([
    preflightSales(),
    preflightSaleItems(),
    preflightPurchaseItems(),
  ]);

  const allBlockers = [...salesPF.blockers, ...saleItemsPF.blockers, ...purchaseItemsPF.blockers];

  if (allBlockers.length > 0) {
    console.error('\n╔══════════════════════════════════════════════════════════╗');
    console.error('║  ABORTED — pre-flight check found un-migrated rows         ║');
    console.error('╚══════════════════════════════════════════════════════════╝');
    console.error(`\n${allBlockers.length} row(s) have a plaintext value but no encrypted value.`);
    console.error('Clearing plaintext now would permanently lose this data.\n');
    for (const b of allBlockers.slice(0, 20)) {
      console.error(`  [${b.plaintextField}] id=${b.id} has a value but ${b.encField} is empty`);
    }
    if (allBlockers.length > 20) {
      console.error(`  ... and ${allBlockers.length - 20} more`);
    }
    console.error('\nRun encryptFinancialData.ts (the backfill migration) again first,');
    console.error('then re-run this pre-flight check before attempting cutover.');
    process.exitCode = 1;
    return;
  }

  console.log('✓ Pre-flight passed — every row with a plaintext value also has its encrypted counterpart populated.');

  if (DRY_RUN) {
    console.log('\nDry run — showing what WOULD be cleared:');
  } else {
    console.log('\n⚠ Proceeding to clear plaintext columns now...');
  }

  const salesCleared = await clearSalePlaintext();
  const saleItemsCleared = await clearSaleItemPlaintext();
  const purchaseItemsCleared = await clearPurchaseItemPlaintext();

  console.log('\n' + '═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));
  console.log(`sales            plaintext cleared on ${salesCleared} row(s)`);
  console.log(`sale_items       plaintext cleared on ${saleItemsCleared} row(s)`);
  console.log(`purchase_items   plaintext cleared on ${purchaseItemsCleared} row(s)`);

  if (DRY_RUN) {
    console.log('\nThis was a dry run — nothing was actually changed.');
    console.log('Re-run with --confirm to apply for real.');
  } else {
    console.log('\n✓ Cutover complete. Plaintext financial values are now cleared.');
    console.log('  Remaining manual step: update prisma/schema.prisma to remove the');
    console.log('  plaintext columns (totalPurchaseCost, grossProfit, purchasePrice,');
    console.log('  avgPurchaseCost, itemProfit, purchaseRate) and run');
    console.log('  `npx prisma migrate dev` to generate and review the column-drop');
    console.log('  migration — review that generated SQL by hand before applying it.');
  }
}

main()
  .catch((err) => {
    console.error('Cutover script crashed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });