import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';
import prisma from '../utils/prisma';
import { computeGstSummary } from '../services/gstService';
import { safeDecrypt, encryptIfPresent } from '../utils/crypto';
import { auditLog } from '../services/auditService';
import { assertTenantOwnership } from '../middlewares/auth';

// ── GST Summary (ITC utilization engine) ─────────────────────
export async function getGstSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const from = req.query.from
      ? parseISO(req.query.from as string)
      : startOfMonth(new Date());
    const to = req.query.to
      ? parseISO(req.query.to as string)
      : new Date();

    const summary = await computeGstSummary(userId, from, to);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

// ── GST ITC Ledger history ────────────────────────────────────
export async function getItcLedger(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const ledger = await prisma.gstItcLedger.findMany({
      where: { userId },
      orderBy: { ledgerMonth: 'desc' },
      take: 24, // last 2 years
    });
    res.json(ledger.map((l) => ({
      ...l,
      openingIgst: Number(l.openingIgst),
      openingCgst: Number(l.openingCgst),
      openingSgst: Number(l.openingSgst),
      utilizedIgst: Number(l.utilizedIgst),
      utilizedCgst: Number(l.utilizedCgst),
      utilizedSgst: Number(l.utilizedSgst),
      closingIgst: Number(l.closingIgst),
      closingCgst: Number(l.closingCgst),
      closingSgst: Number(l.closingSgst),
    })));
  } catch (err) {
    next(err);
  }
}

// ── GST Payments ──────────────────────────────────────────────
const gstPaymentSchema = z.object({
  paymentMonth: z.string().regex(/^\d{4}-\d{2}$/),
  amountPaid: z.number().positive(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function listGstPayments(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { from, to } = req.query;
    const payments = await prisma.gstPayment.findMany({
      where: {
        userId,
        ...(from && to ? { paymentDate: { gte: new Date(from as string), lte: new Date(to as string) } } : {}),
      },
      orderBy: { paymentDate: 'desc' },
    });
    res.json(payments.map((p) => ({ ...p, amountPaid: Number(p.amountPaid) })));
  } catch (err) {
    next(err);
  }
}

export async function createGstPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const parsed = gstPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed.', details: parsed.error.flatten().fieldErrors });
    }
    const payment = await prisma.gstPayment.create({
      data: { userId, ...parsed.data, paymentDate: new Date(parsed.data.paymentDate) },
    });
    await auditLog(userId, 'data_create', `GST payment created: ₹${parsed.data.amountPaid} for ${parsed.data.paymentMonth}`, req);
    res.status(201).json({ ...payment, amountPaid: Number(payment.amountPaid) });
  } catch (err) {
    next(err);
  }
}

export async function deleteGstPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id);
    await prisma.gstPayment.deleteMany({ where: { id, userId } });
    await auditLog(userId, 'data_delete', `GST payment deleted: #${id}`, req);
    res.json({ message: 'Deleted.' });
  } catch (err) {
    next(err);
  }
}

// ── GST Adjustments ───────────────────────────────────────────
const gstAdjSchema = z.object({
  sellerName: z.string().min(1),
  sellerGstin: z.string().optional(),
  gstBillAmount: z.number().min(0),
  pctPaid: z.number().min(0).max(100).default(0),
  amountPaid: z.number().min(0),
  profitAmount: z.number().default(0),
  txnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
});

export async function listGstAdjustments(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { from, to } = req.query;
    const rows = await prisma.gstAdjustment.findMany({
      where: {
        userId,
        ...(from && to ? { txnDate: { gte: new Date(from as string), lte: new Date(to as string) } } : {}),
      },
      orderBy: { txnDate: 'desc' },
    });
    res.json(rows.map((r) => ({ ...r, sellerGstin: safeDecrypt(r.sellerGstin || '') })));
  } catch (err) {
    next(err);
  }
}

export async function createGstAdjustment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const parsed = gstAdjSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed.', details: parsed.error.flatten().fieldErrors });
    }
    const { sellerGstin, txnDate, ...data } = parsed.data;
    const row = await prisma.gstAdjustment.create({
      data: {
        userId,
        ...data,
        txnDate: new Date(txnDate),
        sellerGstin: encryptIfPresent(sellerGstin?.toUpperCase()),
      },
    });
    res.status(201).json({ ...row, sellerGstin: safeDecrypt(row.sellerGstin || '') });
  } catch (err) {
    next(err);
  }
}

export async function deleteGstAdjustment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id);
    await prisma.gstAdjustment.deleteMany({ where: { id, userId } });
    res.json({ message: 'Deleted.' });
  } catch (err) {
    next(err);
  }
}
