import { Router } from 'express';
import { getInventory, addToInventory, updateInventory, deleteInventory, getHistory, logIntake, importMedicines, uploadRingtone } from '../controllers/user-data.controller';
import { authenticate } from '../middlewares/auth.middleware';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../../uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req: any, file, cb) => {
        cb(null, `${req.user?.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage });

router.use(authenticate); // Protect all routes

router.get('/inventory', getInventory);
router.post('/inventory', addToInventory);
router.post('/inventory/import', importMedicines);
router.patch('/inventory/:id', updateInventory);
router.delete('/inventory/:id', deleteInventory);

router.get('/history', getHistory);
router.post('/history', logIntake);

router.post('/ringtone', upload.single('ringtone'), uploadRingtone);

export default router;
