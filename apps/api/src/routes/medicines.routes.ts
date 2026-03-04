import { Router } from 'express';
import { searchMedicines, getMedicineById } from '../controllers/medicines.controller';

const router = Router();

router.get('/search', searchMedicines);
router.get('/:id', getMedicineById);

export default router;
