import {
  syncLegacyRedacoes,
  getRedacoes,
  createRedacao,
  vincularAlunoRedacao,
  validarRedacao,
  deleteRedacao,
  deleteAllRedacoes,
  exportDatabase
} from '../controllers/redacaoController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/export-db', exportDatabase);
router.get('/export', exportDatabase);
router.post('/sync-legacy', authenticate, syncLegacyRedacoes);
router.get('/', authenticate, getRedacoes);
router.post('/', authenticate, createRedacao);
router.patch('/:id/vincular', authenticate, requireAdmin, vincularAlunoRedacao);
router.patch('/:id/validar', authenticate, requireAdmin, validarRedacao);
router.delete('/clear-all', authenticate, requireAdmin, deleteAllRedacoes);
router.delete('/:id', authenticate, requireAdmin, deleteRedacao);

export default router;

