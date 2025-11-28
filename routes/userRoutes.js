import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { getConnection } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = express.Router();

// Todas as rotas requerem autenticação e permissão de admin
router.use(authenticateToken);
router.use(requireAdmin);

// GET - Listar todos os usuários
router.get('/', async (req, res) => {
  try {
    const connection = getConnection();
    const [usuarios] = await connection.execute(
      `SELECT id, username, email, nome_completo, 
              COALESCE(role, 'user') as role, 
              COALESCE(ativo, 1) as ativo, 
              ultimo_login, data_criacao, data_atualizacao
       FROM usuarios 
       ORDER BY data_criacao DESC`
    );
    
    res.json(usuarios);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// GET - Buscar usuário por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = getConnection();
    
    const [usuarios] = await connection.execute(
      `SELECT id, username, email, nome_completo, role, ativo, 
              ultimo_login, data_criacao, data_atualizacao
       FROM usuarios 
       WHERE id = ?`,
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(usuarios[0]);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// POST - Criar novo usuário
router.post('/',
  [
    body('username').trim().isLength({ min: 3 }).withMessage('Username deve ter no mínimo 3 caracteres'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 8 }).withMessage('Senha deve ter no mínimo 8 caracteres'),
    body('nome_completo').optional().trim(),
    body('role').optional().isIn(['admin', 'user']).withMessage('Role deve ser admin ou user')
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

      const { username, email, password, nome_completo, role = 'user' } = req.body;
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
        `INSERT INTO usuarios (username, email, password_hash, nome_completo, role) 
         VALUES (?, ?, ?, ?, ?)`,
        [username, email, password_hash, nome_completo || null, role]
      );

      // Buscar usuário criado (sem senha)
      const [novoUsuario] = await connection.execute(
        `SELECT id, username, email, nome_completo, role, ativo, 
                data_criacao
         FROM usuarios 
         WHERE id = ?`,
        [result.insertId]
      );

      res.status(201).json({
        ...novoUsuario[0],
        message: 'Usuário criado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  }
);

// PUT - Atualizar usuário
router.put('/:id',
  [
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('nome_completo').optional().trim(),
    body('role').optional().isIn(['admin', 'user']).withMessage('Role deve ser admin ou user'),
    body('ativo').optional().isBoolean().withMessage('Ativo deve ser true ou false')
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

      const { id } = req.params;
      const { email, nome_completo, role, ativo } = req.body;
      const connection = getConnection();

      // Verificar se usuário existe
      const [usuarios] = await connection.execute(
        'SELECT id FROM usuarios WHERE id = ?',
        [id]
      );

      if (usuarios.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Não permitir que o usuário remova seu próprio acesso de admin
      if (role === 'user' && parseInt(id) === req.user.id) {
        return res.status(403).json({ 
          error: 'Você não pode remover seu próprio acesso de administrador' 
        });
      }

      // Construir query de atualização dinamicamente
      const updates = [];
      const values = [];

      if (email !== undefined) {
        // Verificar se email já está em uso por outro usuário
        const [emailEmUso] = await connection.execute(
          'SELECT id FROM usuarios WHERE email = ? AND id != ?',
          [email, id]
        );
        if (emailEmUso.length > 0) {
          return res.status(409).json({ error: 'Email já está em uso' });
        }
        updates.push('email = ?');
        values.push(email);
      }

      if (nome_completo !== undefined) {
        updates.push('nome_completo = ?');
        values.push(nome_completo || null);
      }

      if (role !== undefined) {
        updates.push('role = ?');
        values.push(role);
      }

      if (ativo !== undefined) {
        // Não permitir que o usuário desative a si mesmo
        if (!ativo && parseInt(id) === req.user.id) {
          return res.status(403).json({ 
            error: 'Você não pode desativar sua própria conta' 
          });
        }
        updates.push('ativo = ?');
        values.push(ativo);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
      }

      values.push(id);

      await connection.execute(
        `UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      // Buscar usuário atualizado
      const [usuarioAtualizado] = await connection.execute(
        `SELECT id, username, email, nome_completo, role, ativo, 
                ultimo_login, data_criacao, data_atualizacao
         FROM usuarios 
         WHERE id = ?`,
        [id]
      );

      res.json({
        ...usuarioAtualizado[0],
        message: 'Usuário atualizado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  }
);

// PUT - Atualizar senha do usuário
router.put('/:id/password',
  [
    body('password').isLength({ min: 8 }).withMessage('Senha deve ter no mínimo 8 caracteres')
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

      const { id } = req.params;
      const { password } = req.body;
      const connection = getConnection();

      // Verificar se usuário existe
      const [usuarios] = await connection.execute(
        'SELECT id FROM usuarios WHERE id = ?',
        [id]
      );

      if (usuarios.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Hash da nova senha
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(password, saltRounds);

      await connection.execute(
        'UPDATE usuarios SET password_hash = ? WHERE id = ?',
        [password_hash, id]
      );

      res.json({ message: 'Senha atualizada com sucesso' });
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      res.status(500).json({ error: 'Erro ao atualizar senha' });
    }
  }
);

// DELETE - Deletar usuário
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = getConnection();

    // Não permitir que o usuário delete a si mesmo
    if (parseInt(id) === req.user.id) {
      return res.status(403).json({ 
        error: 'Você não pode deletar sua própria conta' 
      });
    }

    // Verificar se usuário existe
    const [usuarios] = await connection.execute(
      'SELECT id FROM usuarios WHERE id = ?',
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    await connection.execute('DELETE FROM usuarios WHERE id = ?', [id]);

    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
});

export default router;

