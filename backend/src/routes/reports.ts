import { Router } from 'express';
import { requireTenant } from '../middlewares/auth';
import {
  getProfitReport,
  getInventoryReport,
  getLedger,
  getGstReport,
  getReceivables,
  getPayables,
} from '../controllers/reportController';

const router = Router();
router.use(requireTenant);

router.get('/profit',    getProfitReport);
router.get('/inventory', getInventoryReport);

/**
 * GET /api/reports/ledger
 *
 * ?from=YYYY-MM-DD  &to=YYYY-MM-DD          → Day Book (all transactions, business-wide balance)
 * ?from=...  &to=...  &party=VendorOrCustomer → Party Ledger (Sales + Purchases for party only)
 */
router.get('/ledger', getLedger);

router.get('/gst',         getGstReport);
router.get('/receivables', getReceivables);
router.get('/payables',    getPayables);

export default router;