import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { getConnection } from '../db/connection.js';
import { generateToken, authenticateToken, revokeToken } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/security.js';

const router = express.Router();

// POST - Login
router.post('/login', 
  loginLimiter,
  [
    body('username').trim().notEmpty().withMessage('Username é obrigatório'),
    body('password').notEmpty().withMessage('Senha é obrigatória')
  ],
  async (req, res) => {
    try {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: errors.array()
        });
      }

      const { username, password } = req.body;
      const connection = getConnection();

      // Buscar usuário
      const [usuarios] = await connection.execute(
        'SELECT * FROM usuarios WHERE username = ? OR email = ?',
        [username, username]
      );

      if (usuarios.length === 0) {
        // Não revelar se o usuário existe ou não (segurança)
        return res.status(401).json({ 
          error: 'Credenciais inválidas',
          code: 'INVALID_CREDENTIALS'
        });
      }

      const usuario = usuarios[0];

      // Verificar se está ativo
      if (!usuario.ativo) {
        return res.status(403).json({ 
          error: 'Conta desativada',
          code: 'ACCOUNT_DISABLED'
        });
      }

      // Verificar senha
      const senhaValida = await bcrypt.compare(password, usuario.password_hash);
      
      if (!senhaValida) {
        return res.status(401).json({ 
          error: 'Credenciais inválidas',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Login bem-sucedido - atualizar último login
      await connection.execute(
        'UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?',
        [usuario.id]
      );

      // Gerar token
      const token = generateToken(usuario.id, usuario.username);

      res.json({
        token,
        user: {
          id: usuario.id,
          username: usuario.username,
          email: usuario.email,
          nome_completo: usuario.nome_completo
        },
        message: 'Login realizado com sucesso'
      });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// POST - Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      await revokeToken(token);
    }
    
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({ error: 'Erro ao fazer logout' });
  }
});

// GET - Verificar token (validar se está autenticado)
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

// POST - Criar usuário (apenas para administrador - proteger depois)
router.post('/register',
  [
    body('username').trim().isLength({ min: 3 }).withMessage('Username deve ter no mínimo 3 caracteres'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 8 }).withMessage('Senha deve ter no mínimo 8 caracteres'),
    body('nome_completo').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: errors.array()
        });
      }

      const { username, email, password, nome_completo } = req.body;
      const connection = getConnection();

      // Verificar se usuário já existe
      const [existentes] = await connection.execute(
        'SELECT id FROM usuarios WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existentes.length > 0) {
        return res.status(409).json({ 
          error: 'Username ou email já cadastrado',
          code: 'USER_EXISTS'
        });
      }

      // Hash da senha
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Criar usuário
      const [result] = await connection.execute(
        `INSERT INTO usuarios (username, email, password_hash, nome_completo) 
         VALUES (?, ?, ?, ?)`,
        [username, email, password_hash, nome_completo || null]
      );

      res.status(201).json({
        id: result.insertId,
        username,
        email,
        message: 'Usuário criado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  }
);

export default router;

