import express from 'express';
import { login, register, getMe, getEstudantes, createEstudante } from '../controllers/authController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', authenticate, getMe);
router.get('/estudantes', authenticate, requireAdmin, getEstudantes);
router.post('/estudantes', authenticate, requireAdmin, createEstudante);

export default router;
