import { Router } from 'express';
import { requireTenant } from '../middlewares/auth';

import {
  listSales,
  getSale,
  createSale,
  updateSale,
  deleteSale,
  addReceivablePayment,
  listReceivables,
  getSalePayments,
  updatePayment,
  deletePayment,
} from '../controllers/saleController';

const router = Router();

router.use(requireTenant);

// Receivables
router.get('/receivables', listReceivables);

// Sales List/Create
router.get('/', listSales);
router.post('/', createSale);

// Payment Routes (MUST come before /:id routes)
router.get('/:saleId/payments', getSalePayments);
router.post('/:id/payments', addReceivablePayment);
router.put('/payments/:paymentId', updatePayment);
router.delete('/payments/:paymentId', deletePayment);

// Sale Routes
router.get('/:id', getSale);
router.put('/:id', updateSale);
router.delete('/:id', deleteSale);

export default router;