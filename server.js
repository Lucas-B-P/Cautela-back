import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createConnection, getConnection } from './db/connection.js';
import authRoutes from './routes/authRoutes.js';
import cautelaRoutes from './routes/cautelaRoutes.js';
import cautelaPublicRoutes from './routes/cautelaPublicRoutes.js';
import assinaturaRoutes from './routes/assinaturaRoutes.js';
import assinaturaPublicRoutes from './routes/assinaturaPublicRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { securityHeaders, apiLimiter, validateOrigin } from './middleware/security.js';
import { authenticateToken } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware CORS - DEVE VIR ANTES DE TUDO para permitir preflight
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://cautela-front.vercel.app',
  'https://cautela-frontend.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origin (mobile apps, Postman, etc)
    if (!origin) {
      return callback(null, true);
    }
    
    // Verificar se a origem está na lista de permitidas
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Em produção, bloquear; em desenvolvimento, permitir todas
      if (process.env.NODE_ENV === 'production') {
        console.warn(`CORS: Origem não permitida: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      } else {
        callback(null, true);
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // Cache preflight por 24 horas
};

// Aplicar CORS antes de qualquer outro middleware
app.use(cors(corsOptions));

// Handler manual para OPTIONS (preflight) caso necessário
app.options('*', cors(corsOptions));

// Middleware de Segurança (após CORS para não interferir no preflight)
// IMPORTANTE: Helmet pode interferir com CORS, então vem depois
app.use(securityHeaders);

// validateOrigin vem depois do CORS, mas permite OPTIONS
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
    const { assinatura_base64, foto_base64, nome, cargo } = req.body;
    
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

    // Determinar tipo de assinatura: 
    // - Se NÃO existe nenhuma assinatura → é "cautela" (primeira assinatura)
    // - Se JÁ existe uma assinatura de tipo "cautela" → é "descautela" (devolução)
    let assinaturasExistentes = [];
    let tipoAssinatura = 'cautela'; // Por padrão, sempre começa como cautela
    
    try {
      // Primeiro, verificar se existe alguma assinatura para esta cautela
      [assinaturasExistentes] = await connection.execute(
        'SELECT * FROM assinaturas WHERE cautela_id = ?',
        [cautela.id]
      );
      
      // Se não existe nenhuma assinatura, é a primeira (cautela)
      if (assinaturasExistentes.length === 0) {
        tipoAssinatura = 'cautela';
      } else {
        // Se já existe assinatura, verificar se alguma é do tipo "cautela"
        try {
          const [cautelasExistentes] = await connection.execute(
            'SELECT * FROM assinaturas WHERE cautela_id = ? AND tipo_assinatura = "cautela"',
            [cautela.id]
          );
          // Se já tem assinatura de cautela, esta nova é descautela
          tipoAssinatura = cautelasExistentes.length > 0 ? 'descautela' : 'cautela';
        } catch (queryError) {
          // Se a coluna tipo_assinatura não existir, verificar apenas quantidade
          if (queryError.code === 'ER_BAD_FIELD_ERROR' && queryError.message.includes('tipo_assinatura')) {
            console.warn('Coluna tipo_assinatura não existe, usando lógica de contagem...');
            // Se já tem pelo menos uma assinatura, assume que é descautela
            tipoAssinatura = assinaturasExistentes.length > 0 ? 'descautela' : 'cautela';
          } else {
            // Se já tem assinaturas, assume que é descautela (mais seguro)
            tipoAssinatura = assinaturasExistentes.length > 0 ? 'descautela' : 'cautela';
          }
        }
      }
    } catch (queryError) {
      console.error('Erro ao verificar assinaturas existentes:', queryError);
      // Em caso de erro, sempre assume que é cautela (primeira assinatura)
      tipoAssinatura = 'cautela';
    }
    
    console.log(`Tipo de assinatura determinado: ${tipoAssinatura} (${assinaturasExistentes.length} assinatura(s) existente(s))`);

    // Criar assinatura
    // Verificar se a coluna tipo_assinatura existe
    try {
      await connection.execute(
        `INSERT INTO assinaturas (cautela_id, tipo_assinatura, nome, cargo, assinatura_base64, foto_base64) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [cautela.id, tipoAssinatura, nome || cautela.responsavel_nome || 'Responsável', cargo || '', assinatura_base64, foto_base64 || null]
      );
    } catch (insertError) {
      // Se a coluna não existir, tentar inserir sem ela (fallback)
      if (insertError.code === 'ER_BAD_FIELD_ERROR') {
        if (insertError.message.includes('tipo_assinatura')) {
          console.warn('Coluna tipo_assinatura não existe, inserindo sem ela...');
          try {
            await connection.execute(
              `INSERT INTO assinaturas (cautela_id, nome, cargo, assinatura_base64, foto_base64) 
               VALUES (?, ?, ?, ?, ?)`,
              [cautela.id, nome || cautela.responsavel_nome || 'Responsável', cargo || '', assinatura_base64, foto_base64 || null]
            );
          } catch (fotoError) {
            if (fotoError.message.includes('foto_base64')) {
              console.warn('Coluna foto_base64 não existe, inserindo sem ela...');
              await connection.execute(
                `INSERT INTO assinaturas (cautela_id, nome, cargo, assinatura_base64) 
                 VALUES (?, ?, ?, ?)`,
                [cautela.id, nome || cautela.responsavel_nome || 'Responsável', cargo || '', assinatura_base64]
              );
            } else {
              throw fotoError;
            }
          }
        } else if (insertError.message.includes('foto_base64')) {
          console.warn('Coluna foto_base64 não existe, inserindo sem ela...');
          await connection.execute(
            `INSERT INTO assinaturas (cautela_id, tipo_assinatura, nome, cargo, assinatura_base64) 
             VALUES (?, ?, ?, ?, ?)`,
            [cautela.id, tipoAssinatura, nome || cautela.responsavel_nome || 'Responsável', cargo || '', assinatura_base64]
          );
        } else {
          throw insertError;
        }
      } else {
        throw insertError;
      }
    }

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
    console.error('Stack trace:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      sql: error.sql
    });
    
    // Retornar mensagem de erro mais amigável
    let errorMessage = 'Erro ao criar assinatura';
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      errorMessage = 'Erro no banco de dados: coluna não encontrada. Execute as migrações.';
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      errorMessage = 'Erro no banco de dados: tabela não encontrada. Execute as migrações.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      code: error.code,
      sqlState: error.sqlState
    });
  }
});

// Rotas protegidas (requerem autenticação)
app.use('/api/cautelas', authenticateToken, cautelaRoutes);
app.use('/api/assinaturas', authenticateToken, assinaturaRoutes);
app.use('/api/users', userRoutes); // Já inclui authenticateToken e requireAdmin

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

