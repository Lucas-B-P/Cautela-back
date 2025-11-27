import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createConnection, getConnection } from './db/connection.js';
import authRoutes from './routes/authRoutes.js';
import cautelaRoutes from './routes/cautelaRoutes.js';
import cautelaPublicRoutes from './routes/cautelaPublicRoutes.js';
import assinaturaRoutes from './routes/assinaturaRoutes.js';
import assinaturaPublicRoutes from './routes/assinaturaPublicRoutes.js';
import { securityHeaders, apiLimiter, validateOrigin } from './middleware/security.js';
import { authenticateToken } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware CORS - DEVE VIR ANTES DE validateOrigin para permitir preflight
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
      // Em produção, validar; em desenvolvimento, permitir todas
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('Not allowed by CORS'));
      } else {
        callback(null, true);
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Middleware de Segurança (após CORS para não interferir no preflight)
app.use(securityHeaders);
app.use(validateOrigin);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting para API
app.use('/api', apiLimiter);

// Rotas públicas (sem autenticação)
app.use('/api/auth', authRoutes);

// Rotas públicas de cautela e assinatura (para acesso via link - SEM AUTENTICAÇÃO)
// IMPORTANTE: Estas rotas devem vir ANTES das rotas protegidas
app.get('/api/cautelas/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const connection = getConnection();
    
    console.log('Buscando cautela pública por UUID:', uuid);
    
    const [rows] = await connection.execute(
      'SELECT * FROM cautelas WHERE uuid = ?',
      [uuid]
    );
    
    if (rows.length === 0) {
      console.log('Cautela não encontrada para UUID:', uuid);
      return res.status(404).json({ error: 'Cautela não encontrada' });
    }
    
    console.log('Cautela encontrada:', rows[0].id);
    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar cautela pública:', error);
    res.status(500).json({ error: 'Erro ao buscar cautela' });
  }
});

app.post('/api/assinaturas/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const { assinatura_base64, nome, cargo } = req.body;
    
    if (!assinatura_base64) {
      return res.status(400).json({ error: 'Campo obrigatório: assinatura_base64' });
    }

    const connection = getConnection();
    
    const [cautelas] = await connection.execute(
      'SELECT * FROM cautelas WHERE uuid = ?',
      [uuid]
    );
    
    if (cautelas.length === 0) {
      return res.status(404).json({ error: 'Cautela não encontrada' });
    }
    
    const cautela = cautelas[0];
    
    // Verificar se pode assinar (deve estar pendente)
    if (cautela.status !== 'pendente') {
      return res.status(400).json({ 
        error: `Esta cautela não pode ser assinada. Status atual: ${cautela.status}` 
      });
    }

    // Determinar tipo de assinatura: se já tem assinatura de cautela, esta é descautela
    const [assinaturasExistentes] = await connection.execute(
      'SELECT * FROM assinaturas WHERE cautela_id = ? AND tipo_assinatura = "cautela"',
      [cautela.id]
    );
    
    const tipoAssinatura = assinaturasExistentes.length > 0 ? 'descautela' : 'cautela';

    // Criar assinatura
    await connection.execute(
      `INSERT INTO assinaturas (cautela_id, tipo_assinatura, nome, cargo, assinatura_base64) 
       VALUES (?, ?, ?, ?, ?)`,
      [cautela.id, tipoAssinatura, nome || cautela.responsavel_nome || 'Responsável', cargo || '', assinatura_base64]
    );

    // Atualizar status da cautela baseado no tipo de assinatura
    if (tipoAssinatura === 'descautela') {
      // Se é descautela, mudar status para descautelado
      await connection.execute(
        `UPDATE cautelas 
         SET status = 'descautelado', 
             data_devolucao = NOW(), 
             assinatura_base64 = ? 
         WHERE id = ?`,
        [assinatura_base64, cautela.id]
      );
    } else {
      // Se é cautela inicial, mudar status para cautelado
      await connection.execute(
        `UPDATE cautelas 
         SET status = 'cautelado', 
             data_assinatura = NOW(), 
             assinatura_base64 = ? 
         WHERE id = ?`,
        [assinatura_base64, cautela.id]
      );
    }

    const [updatedCautela] = await connection.execute(
      'SELECT * FROM cautelas WHERE id = ?',
      [cautela.id]
    );

    res.status(201).json({ 
      ...updatedCautela[0],
      message: 'Assinatura salva com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    res.status(500).json({ error: 'Erro ao criar assinatura' });
  }
});

// Rotas protegidas (requerem autenticação)
app.use('/api/cautelas', authenticateToken, cautelaRoutes);
app.use('/api/assinaturas', authenticateToken, assinaturaRoutes);

// Rota de health check (pública)
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

