/**
 * ============================================================
 * Inventra — GST ITC Utilization Service
 * Implements Section 49 of CGST Act, 2017
 * ============================================================
 * UTILIZATION ORDER (mandatory, not optional):
 *   Step 1: IGST ITC  → IGST Liability
 *   Step 2: IGST ITC  → CGST Liability  (surplus IGST only)
 *   Step 3: IGST ITC  → SGST Liability  (surplus IGST only)
 *   Step 4: CGST ITC  → CGST Liability  (NEVER against SGST)
 *   Step 5: SGST ITC  → SGST Liability  (NEVER against CGST)
 * ============================================================
 */

import prisma from '../utils/prisma';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface GstComponents {
  igst: number;
  cgst: number;
  sgst: number;
}

export interface GstUtilizationResult {
  // Output liabilities
  output: GstComponents;

  // Available ITC (opening carry-forward + period ITC)
  opening: GstComponents;
  itcFromPurchases: GstComponents;
  itcFromInputBills: GstComponents;
  itcFromAdjustments: number; // treated as IGST
  totalAvailable: GstComponents;

  // Utilization steps (Section 49)
  utilization: {
    igstVsIgst: number;  // Step 1
    igstVsCgst: number;  // Step 2
    igstVsSgst: number;  // Step 3
    cgstVsCgst: number;  // Step 4
    sgstVsSgst: number;  // Step 5
  };
  totalUtilized: GstComponents;

  // Cash payable after ITC
  cashPayable: GstComponents;
  totalCashPayable: number;

  // Closing ITC (carry forward to next period)
  closing: GstComponents;
  totalClosing: number;

  // Payment status
  gstPaid: number;
  balanceRemaining: number;

  // Invoice-level breakdowns
  salesRows: any[];
  purchaseRows: any[];
  inputBillRows: any[];
}

/**
 * Resolve component GST for legacy rows that only have total_gst.
 * Assumes intra-state (CGST/SGST 50:50) — safe backward-compatible default.
 */
function resolveComponents(row: any): GstComponents {
  const compTotal =
    Number(row.igstAmount ?? row.igst_amount ?? 0) +
    Number(row.cgstAmount ?? row.cgst_amount ?? 0) +
    Number(row.sgstAmount ?? row.sgst_amount ?? 0);

  if (compTotal > 0) {
    return {
      igst: Number(row.igstAmount ?? row.igst_amount ?? 0),
      cgst: Number(row.cgstAmount ?? row.cgst_amount ?? 0),
      sgst: Number(row.sgstAmount ?? row.sgst_amount ?? 0),
    };
  }

  // Legacy row fallback — intra-state split
  const total =
    Number(row.totalGst ?? row.total_gst ?? row.gstAmount ?? row.gst_amount ?? 0);
  return {
    igst: 0,
    cgst: Math.round((total / 2) * 100) / 100,
    sgst: Math.round((total / 2) * 100) / 100,
  };
}

function addComponents(a: GstComponents, b: GstComponents): GstComponents {
  return { igst: a.igst + b.igst, cgst: a.cgst + b.cgst, sgst: a.sgst + b.sgst };
}

/**
 * Core ITC utilization engine — Section 49, CGST Act 2017
 */
function calculateUtilization(output: GstComponents, available: GstComponents) {
  let remIgstItc = available.igst;
  let remCgstItc = available.cgst;
  let remSgstItc = available.sgst;

  let remOutIgst = output.igst;
  let remOutCgst = output.cgst;
  let remOutSgst = output.sgst;

  // Step 1: IGST ITC → IGST
  const igstVsIgst = Math.min(remIgstItc, remOutIgst);
  remIgstItc -= igstVsIgst;
  remOutIgst -= igstVsIgst;

  // Step 2: Surplus IGST → CGST
  const igstVsCgst = Math.min(remIgstItc, remOutCgst);
  remIgstItc -= igstVsCgst;
  remOutCgst -= igstVsCgst;

  // Step 3: Surplus IGST → SGST
  const igstVsSgst = Math.min(remIgstItc, remOutSgst);
  remIgstItc -= igstVsSgst;
  remOutSgst -= igstVsSgst;

  // Step 4: CGST ITC → CGST only (hard rule)
  const cgstVsCgst = Math.min(remCgstItc, remOutCgst);
  remCgstItc -= cgstVsCgst;
  remOutCgst -= cgstVsCgst;

  // Step 5: SGST ITC → SGST only (hard rule)
  const sgstVsSgst = Math.min(remSgstItc, remOutSgst);
  remSgstItc -= sgstVsSgst;
  remOutSgst -= sgstVsSgst;

  return {
    utilization: { igstVsIgst, igstVsCgst, igstVsSgst, cgstVsCgst, sgstVsSgst },
    totalUtilized: {
      igst: igstVsIgst + igstVsCgst + igstVsSgst,
      cgst: cgstVsCgst,
      sgst: sgstVsSgst,
    },
    cashPayable: {
      igst: Math.max(0, remOutIgst),
      cgst: Math.max(0, remOutCgst),
      sgst: Math.max(0, remOutSgst),
    },
    closing: {
      igst: Math.max(0, remIgstItc),
      cgst: Math.max(0, remCgstItc),
      sgst: Math.max(0, remSgstItc),
    },
  };
}

/**
 * Main function — compute full GST summary for a tenant period.
 * Automatically saves/updates the ITC ledger carry-forward.
 */
export async function computeGstSummary(
  userId: number,
  from: Date,
  to: Date
): Promise<GstUtilizationResult> {
  const ledgerMonth = format(to, 'yyyy-MM');
  const returnMonthStart = startOfMonth(to);
  const returnMonthEnd = endOfMonth(to);

  // ── Opening carry-forward from previous closed period ────────
  const prevLedger = await prisma.gstItcLedger.findFirst({
    where: { userId, ledgerMonth: { lt: ledgerMonth } },
    orderBy: { ledgerMonth: 'desc' },
  });

  const opening: GstComponents = {
    igst: Number(prevLedger?.closingIgst ?? 0),
    cgst: Number(prevLedger?.closingCgst ?? 0),
    sgst: Number(prevLedger?.closingSgst ?? 0),
  };

  // ── Output GST — sales in RETURN MONTH (not date range) ──────
  const salesRows = await prisma.sale.findMany({
    where: { userId, invoiceDate: { gte: returnMonthStart, lte: returnMonthEnd } },
    include: { items: true },
    orderBy: { invoiceDate: 'desc' },
  });

  let output: GstComponents = { igst: 0, cgst: 0, sgst: 0 };
  const salesWithComponents = salesRows.map((s) => {
    const comp = resolveComponents(s);
    output = addComponents(output, comp);
    return { ...s, _igst: comp.igst, _cgst: comp.cgst, _sgst: comp.sgst };
  });

  // ── Purchase ITC — selected date range ───────────────────────
  const purchaseRows = await prisma.purchase.findMany({
    where: { userId, billDate: { gte: from, lte: to } },
    include: { items: true },
    orderBy: { billDate: 'desc' },
  });

  let itcFromPurchases: GstComponents = { igst: 0, cgst: 0, sgst: 0 };
  const purchasesWithComponents = purchaseRows.map((p) => {
    const comp = resolveComponents(p);
    itcFromPurchases = addComponents(itcFromPurchases, comp);
    return { ...p, _igst: comp.igst, _cgst: comp.cgst, _sgst: comp.sgst };
  });

  // ── GST Input Bills ITC ───────────────────────────────────────
  const inputBillRows = await prisma.gstInputBill.findMany({
    where: { userId, billDate: { gte: from, lte: to } },
    orderBy: { billDate: 'desc' },
  });

  let itcFromInputBills: GstComponents = { igst: 0, cgst: 0, sgst: 0 };
  const billsWithComponents = inputBillRows.map((b) => {
    const comp = resolveComponents(b);
    itcFromInputBills = addComponents(itcFromInputBills, comp);
    return { ...b, _igst: comp.igst, _cgst: comp.cgst, _sgst: comp.sgst };
  });

  // ── GST Adjustments — treated as IGST ITC ────────────────────
  const adjResult = await prisma.gstAdjustment.aggregate({
    where: { userId, txnDate: { gte: from, lte: to } },
    _sum: { gstBillAmount: true },
  });
  const itcFromAdjustments = Number(adjResult._sum.gstBillAmount ?? 0);

  // ── Total Available ITC ───────────────────────────────────────
  const totalAvailable: GstComponents = {
    igst: opening.igst + itcFromPurchases.igst + itcFromInputBills.igst + itcFromAdjustments,
    cgst: opening.cgst + itcFromPurchases.cgst + itcFromInputBills.cgst,
    sgst: opening.sgst + itcFromPurchases.sgst + itcFromInputBills.sgst,
  };

  // ── ITC Utilization (Section 49) ─────────────────────────────
  const { utilization, totalUtilized, cashPayable, closing } =
    calculateUtilization(output, totalAvailable);

  const totalCashPayable = cashPayable.igst + cashPayable.cgst + cashPayable.sgst;
  const totalClosing = closing.igst + closing.cgst + closing.sgst;

  // ── GST Payments made in period ───────────────────────────────
  const paidResult = await prisma.gstPayment.aggregate({
    where: { userId, paymentDate: { gte: from, lte: to } },
    _sum: { amountPaid: true },
  });
  const gstPaid = Number(paidResult._sum.amountPaid ?? 0);
  const balanceRemaining = Math.max(0, totalCashPayable - gstPaid);

  // ── Persist ITC Ledger (upsert) ───────────────────────────────
  await prisma.gstItcLedger.upsert({
    where: { userId_ledgerMonth: { userId, ledgerMonth } },
    create: {
      userId,
      ledgerMonth,
      openingIgst: opening.igst,
      openingCgst: opening.cgst,
      openingSgst: opening.sgst,
      utilizedIgst: totalUtilized.igst,
      utilizedCgst: totalUtilized.cgst,
      utilizedSgst: totalUtilized.sgst,
      closingIgst: closing.igst,
      closingCgst: closing.cgst,
      closingSgst: closing.sgst,
    },
    update: {
      openingIgst: opening.igst,
      openingCgst: opening.cgst,
      openingSgst: opening.sgst,
      utilizedIgst: totalUtilized.igst,
      utilizedCgst: totalUtilized.cgst,
      utilizedSgst: totalUtilized.sgst,
      closingIgst: closing.igst,
      closingCgst: closing.cgst,
      closingSgst: closing.sgst,
    },
  });

  return {
    output,
    opening,
    itcFromPurchases,
    itcFromInputBills,
    itcFromAdjustments,
    totalAvailable,
    utilization,
    totalUtilized,
    cashPayable,
    totalCashPayable,
    closing,
    totalClosing,
    gstPaid,
    balanceRemaining,
    salesRows: salesWithComponents,
    purchaseRows: purchasesWithComponents,
    inputBillRows: billsWithComponents,
  };
}

/**
 * Compute GST components when saving a new sale/purchase.
 * Pass isInterState=true for inter-state transactions.
 */
export function computeGstComponents(
  taxableAmount: number,
  gstPercent: number,
  isInterState: boolean
): { totalGst: number; igstAmount: number; cgstAmount: number; sgstAmount: number } {
  const totalGst = Math.round(taxableAmount * gstPercent) / 100;

  if (isInterState) {
    return { totalGst, igstAmount: totalGst, cgstAmount: 0, sgstAmount: 0 };
  }

  const half = Math.round((totalGst / 2) * 100) / 100;
  return {
    totalGst,
    igstAmount: 0,
    cgstAmount: half,
    sgstAmount: Math.round((totalGst - half) * 100) / 100, // handles rounding
  };
}
