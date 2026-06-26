import { Request } from 'express';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

export async function auditLog(
  userId: number,
  action: string,
  details: string,
  req?: Request
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details,
        ipAddress: req?.ip || req?.socket?.remoteAddress || null,
        userAgent: req?.headers['user-agent']?.substring(0, 255) || null,
      },
    });
  } catch (err) {
    logger.error(`Failed to write audit log: ${err}`);
  }
}

export async function getAuditLogs(userId: number, limit = 50, offset = 0) {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      user: { select: { username: true, companyName: true } },
    },
  });
}

export async function getAllAuditLogs(limit = 100, offset = 0) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      user: { select: { username: true, companyName: true } },
    },
  });
}
