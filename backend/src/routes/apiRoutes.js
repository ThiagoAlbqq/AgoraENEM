import express from 'express';
import { handleCorrection } from '../controllers/correctionController.js';
import authRoutes from './authRoutes.js';
import redacaoRoutes from './redacaoRoutes.js';

const router = express.Router();

// Auth routes (/api/auth/login, /api/auth/register, /api/auth/me, /api/auth/estudantes)
router.use('/auth', authRoutes);

// Redações routes (/api/redacoes, /api/redacoes/sync-legacy)
router.use('/redacoes', redacaoRoutes);

// AI Correction endpoint
router.post(['/corrigir', '/sync'], handleCorrection);

export default router;
