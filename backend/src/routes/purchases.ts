import { Router } from 'express';
import { requireTenant } from '../middlewares/auth';
import {
  listPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  deletePurchase,
  getLastPurchasePrice,
  listGstInputBills,
  createGstInputBill,
  deleteGstInputBill,
  addPayablePayment,
  getPayablePayments,
  updatePayablePayment,
  deletePayablePayment,
} from '../controllers/purchaseController';

const router = Router();
router.use(requireTenant);

// ── Static / prefix routes first (must come before /:id) ──────
router.get('/last-price', getLastPurchasePrice);
router.get('/gst-input-bills', listGstInputBills);
router.post('/gst-input-bills', createGstInputBill);
router.delete('/gst-input-bills/:id', deleteGstInputBill);

// ── Payable payment routes ─────────────────────────────────────
// POST   /purchases/payments          → add payment (purchaseId in body)
// PUT    /purchases/payments/:id      → edit payment
// DELETE /purchases/payments/:id      → delete payment
router.post('/payments', addPayablePayment);
router.put('/payments/:paymentId', updatePayablePayment);
router.delete('/payments/:paymentId', deletePayablePayment);

// ── Per-purchase payment history ──────────────────────────────
// GET    /purchases/:purchaseId/payments
router.get('/:purchaseId/payments', getPayablePayments);

// ── Purchase CRUD (/:id last to avoid swallowing above routes) ─
router.get('/', listPurchases);
router.get('/:id', getPurchase);
router.post('/', createPurchase);
router.put('/:id', updatePurchase);
router.delete('/:id', deletePurchase);

export default router;