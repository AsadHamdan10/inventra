import { Router } from 'express';
import { requireTenant } from '../middlewares/auth';
import prisma from '../utils/prisma';
const router = Router();
router.use(requireTenant);
router.get('/', async (req, res, next) => {
  try { const n = await prisma.notification.findMany({ where: { userId: req.user!.userId }, orderBy: { createdAt: 'desc' }, take: 20 }); res.json(n); } catch(e){ next(e); }
});
router.put('/:id/read', async (req, res, next) => {
  try { await prisma.notification.updateMany({ where: { id: parseInt(req.params.id), userId: req.user!.userId }, data: { isRead: true } }); res.json({ ok: true }); } catch(e){ next(e); }
});
export default router;
