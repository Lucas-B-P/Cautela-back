import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createConnection } from './db/connection.js';
import cautelaRoutes from './routes/cautelaRoutes.js';
import assinaturaRoutes from './routes/assinaturaRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/api/cautelas', cautelaRoutes);
app.use('/api/assinaturas', assinaturaRoutes);

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor funcionando' });
});

// Inicializar banco de dados e servidor
createConnection()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Erro ao conectar ao banco de dados:', error);
    process.exit(1);
  });

