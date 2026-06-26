import { Router } from 'express';
import { requireTenant } from '../middlewares/auth';
import { getDashboard } from '../controllers/dashboardController';
const router = Router();
router.get('/', requireTenant, getDashboard);
export default router;
