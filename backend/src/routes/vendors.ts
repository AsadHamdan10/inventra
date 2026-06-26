import { Router } from 'express';
import { requireTenant } from '../middlewares/auth';
import {
  listVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
  getVendorItems,
} from '../controllers/vendorController';

const router = Router();

router.use(requireTenant);

router.get('/', listVendors);
router.get('/items', getVendorItems);
router.get('/:id', getVendor);
router.post('/', createVendor);
router.put('/:id', updateVendor);
router.delete('/:id', deleteVendor);

export default router;
