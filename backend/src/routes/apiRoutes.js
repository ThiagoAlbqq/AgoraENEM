import express from 'express';
import { handleCorrection } from '../controllers/correctionController.js';

const router = express.Router();

router.post(['/corrigir', '/sync'], handleCorrection);

export default router;
