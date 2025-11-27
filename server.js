import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createConnection, getConnection } from './db/connection.js';
import cautelaRoutes from './routes/cautelaRoutes.js';
import assinaturaRoutes from './routes/assinaturaRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware CORS
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'https://cautela-front.vercel.app',
      'https://cautela-frontend.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ];
    
    // Permitir requisições sem origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Permitir todas as origens em desenvolvimento
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/api/cautelas', cautelaRoutes);
app.use('/api/assinaturas', assinaturaRoutes);

// Rota de health check
app.get('/api/health', async (req, res) => {
  try {
    const connection = getConnection();
    await connection.execute('SELECT 1');
    res.json({ 
      status: 'OK', 
      message: 'Servidor funcionando',
      database: 'conectado',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'ERROR', 
      message: 'Servidor com problemas',
      database: 'desconectado',
      error: error.message
    });
  }
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({ 
    message: 'API do Sistema de Cautela de Materiais',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      cautelas: '/api/cautelas',
      assinaturas: '/api/assinaturas'
    }
  });
});

// Inicializar banco de dados e servidor
createConnection()
  .then(() => {
    // Escutar em todas as interfaces (0.0.0.0) para funcionar no Railway
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`CORS habilitado para: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    });
  })
  .catch((error) => {
    console.error('Erro ao conectar ao banco de dados:', error);
    process.exit(1);
  });

