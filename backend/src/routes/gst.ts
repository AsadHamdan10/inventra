import { Router } from 'express';
import { requireTenant } from '../middlewares/auth';
import {
  getGstSummary, getItcLedger,
  listGstPayments, createGstPayment, deleteGstPayment,
  listGstAdjustments, createGstAdjustment, deleteGstAdjustment,
} from '../controllers/gstController';

const router = Router();
router.use(requireTenant);

router.get('/summary', getGstSummary);
router.get('/itc-ledger', getItcLedger);
router.get('/payments', listGstPayments);
router.post('/payments', createGstPayment);
router.delete('/payments/:id', deleteGstPayment);
router.get('/adjustments', listGstAdjustments);
router.post('/adjustments', createGstAdjustment);
router.delete('/adjustments/:id', deleteGstAdjustment);

export default router;
