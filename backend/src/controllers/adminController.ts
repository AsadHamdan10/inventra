import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { auditLog } from '../services/auditService';

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({
      where: { role: { not: 'super_admin' } },
      orderBy: { createdAt: 'desc' },
      select: { id:true, companyName:true, username:true, email:true, mobile:true, role:true, status:true, createdAt:true },
    });
    res.json(users);
  } catch (err) { next(err); }
}

export async function approveUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id);
    await prisma.user.update({ where: { id }, data: { status: 'approved' } });
    await auditLog(req.user!.userId, 'user_approved', `User #${id} approved`, req);
    res.json({ message: 'User approved.' });
  } catch (err) { next(err); }
}

export async function rejectUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id);
    await prisma.user.update({ where: { id }, data: { status: 'rejected' } });
    await auditLog(req.user!.userId, 'user_rejected', `User #${id} rejected`, req);
    res.json({ message: 'User rejected.' });
  } catch (err) { next(err); }
}

export async function suspendUser(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id);
    await prisma.user.update({ where: { id }, data: { status: 'suspended' } });
    await auditLog(req.user!.userId, 'user_suspended', `User #${id} suspended`, req);
    res.json({ message: 'User suspended.' });
  } catch (err) { next(err); }
}

export async function resetUserPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id);
    const { password } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 chars.' });
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id }, data: { password: hash, forcePasswordChange: true } });
    await auditLog(req.user!.userId, 'admin_password_reset', `Password reset for user #${id}`, req);
    res.json({ message: 'Password reset. User must change on next login.' });
  } catch (err) { next(err); }
}

export async function getAdminDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const [totalUsers, pending, approved, suspended] = await Promise.all([
  prisma.user.count({
    where: {
      role: { not: 'super_admin' }
    }
  }),

  prisma.user.count({
    where: {
      role: { not: 'super_admin' },
      status: 'pending'
    }
  }),

  prisma.user.count({
    where: {
      role: { not: 'super_admin' },
      status: 'approved'
    }
  }),

  prisma.user.count({
    where: {
      role: { not: 'super_admin' },
      status: 'suspended'
    }
  }),
]);
    const recentLogs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 20,
      include: { user: { select: { companyName: true, username: true } } } });
    res.json({ totalUsers, pending, approved, suspended, recentLogs });
  } catch (err) { next(err); }
}

export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string || '1');
    const limit = 50;
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' }, take: limit, skip: (page-1)*limit,
      include: { user: { select: { companyName: true, username: true } } },
    });
    res.json(logs);
  } catch (err) { next(err); }
}
