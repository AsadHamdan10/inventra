import { Router } from 'express';
import { requireTenant, requireSuperAdmin } from '../middlewares/auth';
import { getAuditLogs } from '../services/auditService';
const router = Router();
router.get('/', requireTenant, async (req, res, next) => {
  try {
    const logs = await getAuditLogs(req.user!.userId, 50, 0);
    res.json(logs);
  } catch (err) { next(err); }
});
export default router;
