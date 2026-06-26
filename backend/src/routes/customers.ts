import { Router } from 'express';
import { requireTenant } from '../middlewares/auth';
import prisma from '../utils/prisma';
import { safeDecrypt, encryptIfPresent } from '../utils/crypto';
import { auditLog } from '../services/auditService';
import { assertTenantOwnership } from '../middlewares/auth';
import { z } from 'zod';

const router = Router();
router.use(requireTenant);

const schema = z.object({
  companyName: z.string().min(1).max(200),
  gstin: z.string().optional(),
  contact: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  deliveryAddress: z.string().optional(),
  paymentTerms: z.coerce.number().default(30),
});

const decrypt = (c: any) => ({
  ...c,
  gstin: safeDecrypt(c.gstin),
  contact: safeDecrypt(c.contact),
  phone: safeDecrypt(c.phone),
  email: safeDecrypt(c.email),
  address: safeDecrypt(c.address),
  deliveryAddress: safeDecrypt(c.deliveryAddress),
});

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const customers = await prisma.customer.findMany({ where: { userId }, orderBy: { companyName: 'asc' } });
    res.json(customers.map(decrypt));
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
  console.log(parsed.error.flatten());
  return res.status(400).json({
    error: parsed.error.flatten()
  });
}
    const {
  gstin,
  contact,
  phone,
  email,
  address,
  deliveryAddress,
  ...data
} = parsed.data;
    const c = await prisma.customer.create({ data: {
  userId,
  ...data,
  gstin: encryptIfPresent(gstin?.toUpperCase()),
  contact: encryptIfPresent(contact),
  phone: encryptIfPresent(phone),
  email: encryptIfPresent(email),
  address: encryptIfPresent(address),
  deliveryAddress: encryptIfPresent(deliveryAddress),
} });
    await auditLog(userId, 'data_create', `Customer created: #${c.id}`, req);
    res.status(201).json(decrypt(c));
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id);
    const owned = await assertTenantOwnership(userId, 'customers', id);
    if (!owned) return res.status(403).json({ error: 'Access denied.' });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed.' });
    const {
  gstin,
  contact,
  phone,
  email,
  address,
  deliveryAddress,
  ...data
} = parsed.data;
    const c = await prisma.customer.update({ where: { id }, data: { ...data, gstin: encryptIfPresent(gstin?.toUpperCase()), contact: encryptIfPresent(contact), phone: encryptIfPresent(phone), email: encryptIfPresent(email), address: encryptIfPresent(address), deliveryAddress: encryptIfPresent(deliveryAddress) } });
    res.json(decrypt(c));
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const id = parseInt(req.params.id);
    const owned = await assertTenantOwnership(userId, 'customers', id);
    if (!owned) return res.status(403).json({ error: 'Access denied.' });
    await prisma.customer.delete({ where: { id } });
    await auditLog(userId, 'data_delete', `Customer deleted: #${id}`, req);
    res.json({ message: 'Deleted.' });
  } catch (err) { next(err); }
});

export default router;
