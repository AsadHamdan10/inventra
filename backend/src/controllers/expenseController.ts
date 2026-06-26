import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { auditLog } from '../services/auditService';
import { assertTenantOwnership } from '../middlewares/auth';

const schema = z.object({
  expenseName: z.string().min(1).max(200),
  amount: z.number().positive(),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().default('General'),
  deductProfit: z.boolean().default(true),
  notes: z.string().optional(),
});

export async function listExpenses(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { from, to } = req.query;
    const rows = await prisma.expense.findMany({
      where: { userId, ...(from && to ? { expenseDate: { gte: new Date(from as string), lte: new Date(to as string) } } : {}) },
      orderBy: { expenseDate: 'desc' },
    });
    res.json(rows.map(r => ({ ...r, amount: Number(r.amount) })));
  } catch (err) { next(err); }
}

export async function createExpense(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed.', details: parsed.error.flatten().fieldErrors });
    const row = await prisma.expense.create({ data: { userId, ...parsed.data, expenseDate: new Date(parsed.data.expenseDate) } });
    await auditLog(userId, 'data_create', `Expense: ${parsed.data.expenseName}`, req);
    res.status(201).json({ ...row, amount: Number(row.amount) });
  } catch (err) { next(err); }
}

export async function updateExpense(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id);
    const owned = await assertTenantOwnership(userId, 'expenses', id);
    if (!owned) return res.status(403).json({ error: 'Access denied.' });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed.' });
    const row = await prisma.expense.update({ where: { id }, data: { ...parsed.data, expenseDate: new Date(parsed.data.expenseDate) } });
    res.json({ ...row, amount: Number(row.amount) });
  } catch (err) { next(err); }
}

export async function deleteExpense(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id);
    const owned = await assertTenantOwnership(userId, 'expenses', id);
    if (!owned) return res.status(403).json({ error: 'Access denied.' });
    await prisma.expense.delete({ where: { id } });
    await auditLog(userId, 'data_delete', `Expense deleted: #${id}`, req);
    res.json({ message: 'Deleted.' });
  } catch (err) { next(err); }
}
