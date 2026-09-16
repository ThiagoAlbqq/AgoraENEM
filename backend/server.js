import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './src/routes/apiRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS to allow frontend communication
app.use(cors());

// Payload limit setup for image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Mount API routes
app.use('/api', apiRoutes);

// Root health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Ágora ENEM API Operational' });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`  Plataforma SaaS IA (ENEM x Sisedu - Agente Unificado)`);
    console.log(`  API Endpoint: http://localhost:${PORT}/api/corrigir`);
    console.log(`==================================================`);
  });
}

export default app;
