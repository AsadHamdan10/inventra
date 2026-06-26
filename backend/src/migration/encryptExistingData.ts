/**
 * One-time backfill migration: encrypt any remaining plaintext sensitive
 * fields, and (re-)populate blind-index hash columns for User.
 *
 * SAFE TO RUN MULTIPLE TIMES. It is idempotent:
 *   - A value that is already a "v1:" GCM blob is left untouched.
 *   - A value that is a legacy "v0" CBC blob gets re-encrypted to v1 GCM
 *     (decrypt with the old cipher, re-encrypt with the new one).
 *   - A value that is genuine plaintext (pre-dates any encryption on that
 *     column) gets encrypted for the first time.
 *   - Blind-index hash columns are recomputed from the decrypted value
 *     every run, so re-running after fixing a bug is harmless.
 *
 * SAFE DURING MIXED-DATA TRANSITION. The application code
 * (encryptIfPresent / safeDecrypt / decryptData in utils/crypto.ts) already
 * handles all three states — v1 GCM, legacy v0 CBC, and raw plaintext — on
 * read, so the API does not break while this script is gradually catching
 * the database up. You can deploy the new application code *before*
 * running this script with zero downtime; this script is a cleanup pass,
 * not a hard prerequisite for the app to work.
 *
 * USAGE:
 *   npx ts-node backend/src/migration/encryptExistingData.ts
 *   npx ts-node backend/src/migration/encryptExistingData.ts --dry-run
 *   npx ts-node backend/src/migration/encryptExistingData.ts --batch-size=200
 *
 * RECOMMENDED ROLLOUT ORDER:
 *   1. Take a database backup / snapshot (pg_dump or your hosting provider's
 *      snapshot feature). This is a write operation across many rows —
 *      have a rollback path before you start.
 *   2. Deploy the new application code (encryption.ts, updated controllers,
 *      updated schema/migration for new columns) — old plaintext rows
 *      still read/write correctly because of the fallback behavior above.
 *   3. Run this script with --dry-run first and review the summary counts.
 *   4. Run it for real during a low-traffic window. It commits row-by-row
 *      in small batches, so a crash partway through loses no data and is
 *      safe to simply re-run.
 *   5. Spot-check a handful of records through the app UI (not direct SQL)
 *      to confirm decryption still shows correct values.
 *   6. Optional cleanup once you've verified all data is on v1 GCM: remove
 *      decryptLegacyCbc() from utils/crypto.ts.
 */

import prisma from '../utils/prisma';
import { encryptData, decryptData, blindIndex } from '../utils/crypto';

const DRY_RUN = process.argv.includes('--dry-run');
const batchArg = process.argv.find((a) => a.startsWith('--batch-size='));
const BATCH_SIZE = batchArg ? parseInt(batchArg.split('=')[1], 10) : 200;

const VERSION_PREFIX = 'v1:';

/** True if the value is already in the current v1 GCM format — nothing to do. */
function isAlreadyV1(val: string | null | undefined): boolean {
  return !!val && val.startsWith(VERSION_PREFIX);
}

/**
 * Re-encrypt a single field value to v1 GCM if it isn't already.
 * Returns null if no change is needed (caller skips the column in its update).
 */
function migrateValue(val: string | null | undefined): string | null {
  if (!val || val.trim() === '') return null; // nothing to encrypt
  if (isAlreadyV1(val)) return null; // already migrated, no-op
  // decryptData() transparently handles legacy CBC blobs and raw plaintext;
  // re-encrypting the decrypted result always produces a fresh v1 GCM blob.
  const plaintext = decryptData(val);
  if (!plaintext) return null;
  return encryptData(plaintext);
}

interface Counters {
  scanned: number;
  updated: number;
  errors: number;
}

function freshCounters(): Counters {
  return { scanned: 0, updated: 0, errors: 0 };
}

async function migrateUsers(counters: Counters) {
  const total = await prisma.user.count();
  console.log(`\n[users] ${total} rows to scan`);

  let skip = 0;
  while (skip < total) {
    const batch = await prisma.user.findMany({
      skip,
      take: BATCH_SIZE,
      select: {
        id: true,
        mobile: true,
        gstin: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        district: true,
        state: true,
        pincode: true,
        panNumber: true,
        gstinHash: true,
        mobileHash: true,
        panNumberHash: true,
      },
    });

    for (const u of batch) {
      counters.scanned++;
      try {
        const data: Record<string, any> = {};

        const mobileEnc = migrateValue(u.mobile);
        if (mobileEnc !== null) data.mobile = mobileEnc;

        const gstinEnc = migrateValue(u.gstin);
        if (gstinEnc !== null) data.gstin = gstinEnc;

        const addr1Enc = migrateValue(u.addressLine1);
        if (addr1Enc !== null) data.addressLine1 = addr1Enc;

        const addr2Enc = migrateValue(u.addressLine2);
        if (addr2Enc !== null) data.addressLine2 = addr2Enc;

        const cityEnc = migrateValue(u.city);
        if (cityEnc !== null) data.city = cityEnc;

        const districtEnc = migrateValue(u.district);
        if (districtEnc !== null) data.district = districtEnc;

        const stateEnc = migrateValue(u.state);
        if (stateEnc !== null) data.state = stateEnc;

        const pincodeEnc = migrateValue(u.pincode);
        if (pincodeEnc !== null) data.pincode = pincodeEnc;

        const panEnc = migrateValue(u.panNumber);
        if (panEnc !== null) data.panNumber = panEnc;

        // Backfill blind-index hashes from the *current* decrypted value,
        // regardless of whether the encrypted column itself changed —
        // these columns are new and start out NULL for every existing row.
        const currentMobile = u.mobile ? decryptData(u.mobile) : null;
        const currentGstin = u.gstin ? decryptData(u.gstin) : null;
        const currentPan = u.panNumber ? decryptData(u.panNumber) : null;

        const mobileHash = blindIndex(currentMobile);
        if (mobileHash !== u.mobileHash) data.mobileHash = mobileHash;

        const gstinHash = currentGstin ? blindIndex(currentGstin.toUpperCase()) : null;
        if (gstinHash !== u.gstinHash) data.gstinHash = gstinHash;

        const panHash = currentPan ? blindIndex(currentPan.toUpperCase()) : null;
        if (panHash !== u.panNumberHash) data.panNumberHash = panHash;

        if (Object.keys(data).length > 0) {
          counters.updated++;
          if (!DRY_RUN) {
            await prisma.user.update({ where: { id: u.id }, data });
          }
        }
      } catch (err) {
        counters.errors++;
        console.error(`[users] FAILED id=${u.id}:`, (err as Error).message);
      }
    }

    skip += BATCH_SIZE;
    console.log(`[users] processed ${Math.min(skip, total)}/${total}`);
  }
}

async function migrateVendors(counters: Counters) {
  const total = await prisma.vendor.count();
  console.log(`\n[vendors] ${total} rows to scan`);

  let skip = 0;
  while (skip < total) {
    const batch = await prisma.vendor.findMany({
      skip,
      take: BATCH_SIZE,
      select: { id: true, vendorGstin: true, contact: true, phone: true, email: true, address: true },
    });

    for (const v of batch) {
      counters.scanned++;
      try {
        const data: Record<string, any> = {};
        const gstinEnc = migrateValue(v.vendorGstin);
        if (gstinEnc !== null) data.vendorGstin = gstinEnc;
        const contactEnc = migrateValue((v as any).contact);
        if (contactEnc !== null) data.contact = contactEnc;
        const phoneEnc = migrateValue(v.phone);
        if (phoneEnc !== null) data.phone = phoneEnc;
        const emailEnc = migrateValue(v.email);
        if (emailEnc !== null) data.email = emailEnc;
        const addressEnc = migrateValue(v.address);
        if (addressEnc !== null) data.address = addressEnc;

        if (Object.keys(data).length > 0) {
          counters.updated++;
          if (!DRY_RUN) await prisma.vendor.update({ where: { id: v.id }, data });
        }
      } catch (err) {
        counters.errors++;
        console.error(`[vendors] FAILED id=${v.id}:`, (err as Error).message);
      }
    }

    skip += BATCH_SIZE;
    console.log(`[vendors] processed ${Math.min(skip, total)}/${total}`);
  }
}

async function migrateCustomers(counters: Counters) {
  const total = await prisma.customer.count();
  console.log(`\n[customers] ${total} rows to scan`);

  let skip = 0;
  while (skip < total) {
    const batch = await prisma.customer.findMany({
      skip,
      take: BATCH_SIZE,
      select: { id: true, gstin: true, phone: true, email: true, address: true, deliveryAddress: true },
    });

    for (const c of batch) {
      counters.scanned++;
      try {
        const data: Record<string, any> = {};
        const gstinEnc = migrateValue((c as any).gstin);
        if (gstinEnc !== null) data.gstin = gstinEnc;
        const phoneEnc = migrateValue(c.phone);
        if (phoneEnc !== null) data.phone = phoneEnc;
        const emailEnc = migrateValue(c.email);
        if (emailEnc !== null) data.email = emailEnc;
        const addressEnc = migrateValue(c.address);
        if (addressEnc !== null) data.address = addressEnc;
        const deliveryEnc = migrateValue((c as any).deliveryAddress);
        if (deliveryEnc !== null) data.deliveryAddress = deliveryEnc;

        if (Object.keys(data).length > 0) {
          counters.updated++;
          if (!DRY_RUN) await prisma.customer.update({ where: { id: c.id }, data });
        }
      } catch (err) {
        counters.errors++;
        console.error(`[customers] FAILED id=${c.id}:`, (err as Error).message);
      }
    }

    skip += BATCH_SIZE;
    console.log(`[customers] processed ${Math.min(skip, total)}/${total}`);
  }
}

async function migrateSales(counters: Counters) {
  const total = await prisma.sale.count();
  console.log(`\n[sales] ${total} rows to scan`);

  let skip = 0;
  while (skip < total) {
    const batch = await prisma.sale.findMany({
      skip,
      take: BATCH_SIZE,
      select: { id: true, companyGstin: true, customerAddress: true, deliveryAddress: true },
    });

    for (const s of batch) {
      counters.scanned++;
      try {
        const data: Record<string, any> = {};
        const gstinEnc = migrateValue(s.companyGstin);
        if (gstinEnc !== null) data.companyGstin = gstinEnc;
        const custAddrEnc = migrateValue(s.customerAddress);
        if (custAddrEnc !== null) data.customerAddress = custAddrEnc;
        const delAddrEnc = migrateValue(s.deliveryAddress);
        if (delAddrEnc !== null) data.deliveryAddress = delAddrEnc;

        if (Object.keys(data).length > 0) {
          counters.updated++;
          if (!DRY_RUN) await prisma.sale.update({ where: { id: s.id }, data });
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

async function migratePurchases(counters: Counters) {
  const total = await prisma.purchase.count();
  console.log(`\n[purchases] ${total} rows to scan`);

  let skip = 0;
  while (skip < total) {
    const batch = await prisma.purchase.findMany({
      skip,
      take: BATCH_SIZE,
      select: { id: true, vendorGstin: true },
    });

    for (const p of batch) {
      counters.scanned++;
      try {
        const data: Record<string, any> = {};
        const gstinEnc = migrateValue(p.vendorGstin);
        if (gstinEnc !== null) data.vendorGstin = gstinEnc;

        if (Object.keys(data).length > 0) {
          counters.updated++;
          if (!DRY_RUN) await prisma.purchase.update({ where: { id: p.id }, data });
        }
      } catch (err) {
        counters.errors++;
        console.error(`[purchases] FAILED id=${p.id}:`, (err as Error).message);
      }
    }

    skip += BATCH_SIZE;
    console.log(`[purchases] processed ${Math.min(skip, total)}/${total}`);
  }
}

async function migrateGstTables(counters: Counters) {
  // GstAdjustment.sellerGstin and GstInputBill.sellerGstin
  const adjTotal = await prisma.gstAdjustment.count();
  console.log(`\n[gst_adjustments] ${adjTotal} rows to scan`);
  let skip = 0;
  while (skip < adjTotal) {
    const batch = await prisma.gstAdjustment.findMany({ skip, take: BATCH_SIZE, select: { id: true, sellerGstin: true } });
    for (const r of batch) {
      counters.scanned++;
      try {
        const enc = migrateValue(r.sellerGstin);
        if (enc !== null) {
          counters.updated++;
          if (!DRY_RUN) await prisma.gstAdjustment.update({ where: { id: r.id }, data: { sellerGstin: enc } });
        }
      } catch (err) {
        counters.errors++;
        console.error(`[gst_adjustments] FAILED id=${r.id}:`, (err as Error).message);
      }
    }
    skip += BATCH_SIZE;
  }

  const billTotal = await prisma.gstInputBill.count();
  console.log(`[gst_input_bills] ${billTotal} rows to scan`);
  skip = 0;
  while (skip < billTotal) {
    const batch = await prisma.gstInputBill.findMany({ skip, take: BATCH_SIZE, select: { id: true, sellerGstin: true } });
    for (const r of batch) {
      counters.scanned++;
      try {
        const enc = migrateValue(r.sellerGstin);
        if (enc !== null) {
          counters.updated++;
          if (!DRY_RUN) await prisma.gstInputBill.update({ where: { id: r.id }, data: { sellerGstin: enc } });
        }
      } catch (err) {
        counters.errors++;
        console.error(`[gst_input_bills] FAILED id=${r.id}:`, (err as Error).message);
      }
    }
    skip += BATCH_SIZE;
  }
}

async function migrateBankAccounts(counters: Counters) {
  const total = await prisma.bankAccount.count();
  console.log(`\n[bank_accounts] ${total} rows to scan`);

  let skip = 0;
  while (skip < total) {
    const batch = await prisma.bankAccount.findMany({
      skip,
      take: BATCH_SIZE,
      select: { id: true, accountNumber: true },
    });

    for (const b of batch) {
      counters.scanned++;
      try {
        const enc = migrateValue((b as any).accountNumber);
        if (enc !== null) {
          counters.updated++;
          if (!DRY_RUN) await prisma.bankAccount.update({ where: { id: b.id }, data: { accountNumber: enc } as any });
        }
      } catch (err) {
        counters.errors++;
        console.error(`[bank_accounts] FAILED id=${b.id}:`, (err as Error).message);
      }
    }

    skip += BATCH_SIZE;
    console.log(`[bank_accounts] processed ${Math.min(skip, total)}/${total}`);
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log(`Field encryption backfill migration`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE (will write to DB)'}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log('═'.repeat(60));

  const totals: Record<string, Counters> = {
    users: freshCounters(),
    vendors: freshCounters(),
    customers: freshCounters(),
    sales: freshCounters(),
    purchases: freshCounters(),
    gst: freshCounters(),
    bankAccounts: freshCounters(),
  };

  await migrateUsers(totals.users);
  await migrateVendors(totals.vendors);
  await migrateCustomers(totals.customers);
  await migrateSales(totals.sales);
  await migratePurchases(totals.purchases);
  await migrateGstTables(totals.gst);
  await migrateBankAccounts(totals.bankAccounts);

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
  if (DRY_RUN) {
    console.log('\nThis was a dry run — no data was changed. Re-run without --dry-run to apply.');
  }
  if (grandErrors > 0) {
    console.log(`\n⚠ ${grandErrors} row(s) failed to migrate — see errors above. Safe to re-run; already-migrated rows are skipped.`);
    process.exitCode = 1;
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