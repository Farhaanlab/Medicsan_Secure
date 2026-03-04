import { Router } from 'express';
import multer from 'multer';
import { scanPrescription } from '../controllers/ocr.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/scan', authenticate, upload.single('image'), scanPrescription);

export default router;
