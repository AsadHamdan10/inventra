import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { encryptData, safeDecrypt, encryptIfPresent } from '../utils/crypto';
import { auditLog } from '../services/auditService';
import { assertTenantOwnership } from '../middlewares/auth';

const vendorSchema = z.object({
  vendorName: z.string().min(1).max(200),
  vendorGstin: z.string().optional(),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
});

function decryptVendor(v: any) {
  return {
    ...v,
    vendorGstin: safeDecrypt(v.vendorGstin),
    contact: safeDecrypt(v.contact),
    phone: safeDecrypt(v.phone),
    email: safeDecrypt(v.email),
    address: safeDecrypt(v.address),
  };
}

export async function listVendors(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { from, to, search } = req.query;

    const vendors = await prisma.vendor.findMany({
      where: {
        userId,
        ...(from && to ? { createdAt: { gte: new Date(from as string), lte: new Date(to as string) } } : {}),
      },
      include: {
        _count: { select: { purchases: true } },
      },
      orderBy: { vendorName: 'asc' },
    });

    const decrypted = vendors.map((v) => ({
      ...decryptVendor(v),
      purchaseCount: v._count.purchases,
    }));

    // Filter by search term after decryption (since fields are encrypted)
    const filtered = search
      ? decrypted.filter((v) =>
          v.vendorName.toLowerCase().includes((search as string).toLowerCase()) ||
          v.phone?.toLowerCase().includes((search as string).toLowerCase()) ||
          v.email?.toLowerCase().includes((search as string).toLowerCase())
        )
      : decrypted;

    res.json(filtered);
  } catch (err) {
    next(err);
  }
}

export async function getVendor(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id);

    const owned = await assertTenantOwnership(userId, 'vendors', id);
    if (!owned) return res.status(403).json({ error: 'Access denied.' });

    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });

    res.json(decryptVendor(vendor));
  } catch (err) {
    next(err);
  }
}

export async function createVendor(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const parsed = vendorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed.', details: parsed.error.flatten().fieldErrors });
    }

    const { vendorName, vendorGstin, contact, phone, email, address } = parsed.data;

    const vendor = await prisma.vendor.create({
      data: {
        userId,
        vendorName,
        vendorGstin: encryptIfPresent(vendorGstin?.toUpperCase()),
        contact: encryptIfPresent(contact),
        phone: encryptIfPresent(phone),
        email: encryptIfPresent(email),
        address: encryptIfPresent(address),
      },
    });

    await auditLog(userId, 'data_create', `Vendor created: ${vendorName} (#${vendor.id})`, req);
    res.status(201).json(decryptVendor(vendor));
  } catch (err) {
    next(err);
  }
}

export async function updateVendor(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id);

    const owned = await assertTenantOwnership(userId, 'vendors', id);
    if (!owned) return res.status(403).json({ error: 'Access denied.' });

    const parsed = vendorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed.', details: parsed.error.flatten().fieldErrors });
    }

    const { vendorName, vendorGstin, contact, phone, email, address } = parsed.data;

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        vendorName,
        vendorGstin: encryptIfPresent(vendorGstin?.toUpperCase()),
        contact: encryptIfPresent(contact),
        phone: encryptIfPresent(phone),
        email: encryptIfPresent(email),
        address: encryptIfPresent(address),
      },
    });

    await auditLog(userId, 'data_update', `Vendor updated: #${id}`, req);
    res.json(decryptVendor(vendor));
  } catch (err) {
    next(err);
  }
}

export async function deleteVendor(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id);

    const owned = await assertTenantOwnership(userId, 'vendors', id);
    if (!owned) return res.status(403).json({ error: 'Access denied.' });

    await prisma.vendor.delete({ where: { id } });
    await auditLog(userId, 'data_delete', `Vendor deleted: #${id}`, req);
    res.json({ message: 'Vendor deleted.' });
  } catch (err) {
    next(err);
  }
}

/** Get vendor's GSTIN and last purchase items for auto-fill */
export async function getVendorItems(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const vendorName = req.query.vendorName as string;

    const vendor = await prisma.vendor.findFirst({
      where: { userId, vendorName },
    });

    const lastPurchase = await prisma.purchase.findFirst({
      where: { userId, vendorName },
      orderBy: { billDate: 'desc' },
      include: { items: true },
    });

    res.json({
      gstin: vendor ? safeDecrypt(vendor.vendorGstin || '') : '',
      items: lastPurchase?.items || [],
    });
  } catch (err) {
    next(err);
  }
}
