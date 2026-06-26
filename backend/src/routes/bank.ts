import { Router } from 'express';
import { requireTenant } from '../middlewares/auth';
import prisma from '../utils/prisma';
import { encryptIfPresent, safeDecrypt } from '../utils/crypto';
import { z } from 'zod';
import { auditLog } from '../services/auditService';

const router = Router();
router.use(requireTenant);

// ── Validation Schemas ────────────────────────────────────────
const acctSchema = z.object({
  accountName: z.string().min(1, 'Account Name is required.'),
  accountNumber: z.string().optional().default(''),
  bankName: z.string().optional().default(''),
  ifscCode: z.string().optional().default(''),
  branchName: z.string().optional().default(''),
  openingBalance: z.coerce.number().default(0),
});

const stmtSchema = z.object({
  accountId: z.coerce.number().optional().nullable(),
  txnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Transaction date is required (YYYY-MM-DD).'),
  txnType: z.enum(['credit', 'debit'], { errorMap: () => ({ message: 'Type must be credit or debit.' }) }),
  description: z.string().optional().default(''),
  amount: z.coerce.number().positive('Amount must be greater than zero.'),
  category: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

// ── Helper: running balance for an account ────────────────────
async function getAccountBalance(accountId: number, openingBalance: number): Promise<number> {
  const result = await prisma.$queryRaw<any[]>`
    SELECT COALESCE(SUM(CASE WHEN txn_type='credit' THEN amount ELSE -amount END), 0) AS balance
    FROM bank_statements WHERE account_id = ${accountId}
  `;
  return openingBalance + Number(result[0]?.balance || 0);
}

// ── ACCOUNTS ──────────────────────────────────────────────────
router.get('/accounts', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const accounts = await prisma.bankAccount.findMany({
      where: { userId },
      orderBy: { accountName: 'asc' },
    });

    const withBalance = await Promise.all(
  accounts.map(async (a) => ({
    ...a,
    accountNumber: safeDecrypt(a.accountNumber || ''),
    branchName: a.branchName || '',
    currentBalance: await getAccountBalance(a.id, Number(a.openingBalance || 0)),
  }))
);

    res.json(withBalance);
  } catch (e) { next(e); }
});

router.post('/accounts', async (req, res, next) => {
  try {
    const parsed = acctSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] || 'Validation failed.';
      return res.status(400).json({ error: msg });
    }

    const { accountNumber, ...rest } = parsed.data;
    const acc = await prisma.bankAccount.create({
      data: {
        userId: req.user!.userId,
        ...rest,
        accountNumber: accountNumber ? encryptIfPresent(accountNumber) : null,
      },
    });

    await auditLog(req.user!.userId, 'data_create', `Bank account created: ${rest.accountName}`, req);
    res.status(201).json({
      ...acc,
      accountNumber: safeDecrypt(acc.accountNumber || ''),
      currentBalance: Number(acc.openingBalance || 0),
    });
  } catch (e) { next(e); }
});

router.put('/accounts/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const parsed = acctSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] || 'Validation failed.';
      return res.status(400).json({ error: msg });
    }
    const { accountNumber, ...rest } = parsed.data;
    await prisma.bankAccount.updateMany({
      where: { id, userId: req.user!.userId },
      data: { ...rest, accountNumber: accountNumber ? encryptIfPresent(accountNumber) : null },
    });
    res.json({ message: 'Account updated.' });
  } catch (e) { next(e); }
});

router.delete('/accounts/:id', async (req, res, next) => {
  try {
    await prisma.bankAccount.deleteMany({ where: { id: parseInt(req.params.id), userId: req.user!.userId } });
    res.json({ message: 'Account deleted.' });
  } catch (e) { next(e); }
});

// ── STATEMENTS ────────────────────────────────────────────────
router.get('/statements', async (req, res, next) => {
  try {
    const { from, to, accountId } = req.query;
    const stmts = await prisma.bankStatement.findMany({
      where: {
        userId: req.user!.userId,
        ...(accountId ? { accountId: parseInt(accountId as string) } : {}),
        ...(from && to ? { txnDate: { gte: new Date(from as string), lte: new Date(to as string) } } : {}),
      },
      include: { account: { select: { accountName: true } } },
      orderBy: [
  { txnDate: 'desc' },
  { id: 'desc' },
],
    });
    res.json(stmts.map(s => ({ ...s, amount: Number(s.amount) })));
  } catch (e) { next(e); }
});

router.post('/statements', async (req, res, next) => {
  try {
    const parsed = stmtSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] || 'Validation failed.';
      return res.status(400).json({ error: msg });
    }

    // Validate amount paid does not exceed purchase for payable context (not applicable here)
    const stmt = await prisma.bankStatement.create({
      data: {
        userId: req.user!.userId,
        ...parsed.data,
        txnDate: new Date(parsed.data.txnDate),
      },
    });

    await auditLog(req.user!.userId, 'data_create', `Bank ${parsed.data.txnType}: ₹${parsed.data.amount}`, req);
    res.status(201).json({ ...stmt, amount: Number(stmt.amount) });
  } catch (e) { next(e); }
});

router.put('/statements/:id', async (req, res, next) => {
  try {
    const parsed = stmtSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] || 'Validation failed.';
      return res.status(400).json({ error: msg });
    }
    await prisma.bankStatement.updateMany({
      where: { id: parseInt(req.params.id), userId: req.user!.userId },
      data: { ...parsed.data, txnDate: new Date(parsed.data.txnDate) },
    });
    res.json({ message: 'Transaction updated.' });
  } catch (e) { next(e); }
});

router.delete('/statements/:id', async (req, res, next) => {
  try {
    await prisma.bankStatement.deleteMany({ where: { id: parseInt(req.params.id), userId: req.user!.userId } });
    res.json({ message: 'Transaction deleted.' });
  } catch (e) { next(e); }
});

// ── SUMMARY ───────────────────────────────────────────────────
router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const [credits, debits, acctAgg] = await Promise.all([
      prisma.bankStatement.aggregate({ where: { userId, txnType: 'credit' }, _sum: { amount: true } }),
      prisma.bankStatement.aggregate({ where: { userId, txnType: 'debit' }, _sum: { amount: true } }),
      prisma.bankAccount.aggregate({ where: { userId }, _sum: { openingBalance: true } }),
    ]);
    const totalCredits = Number(credits._sum.amount || 0);
    const totalDebits = Number(debits._sum.amount || 0);
    const openingBalance = Number(acctAgg._sum.openingBalance || 0);
    res.json({ totalCredits, totalDebits, openingBalance, currentBalance: openingBalance + totalCredits - totalDebits });
  } catch (e) { next(e); }
});

export default router;
