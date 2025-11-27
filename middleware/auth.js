import jwt from 'jsonwebtoken';
import { getConnection } from '../db/connection.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-super-segura-mude-isso-em-producao';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Gerar token JWT
export const generateToken = (userId, username) => {
  return jwt.sign(
    { 
      userId, 
      username,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Verificar token JWT
export const verifyToken = async (token) => {
  try {
    // Verificar se o token foi revogado
    const connection = getConnection();
    const [revogados] = await connection.execute(
      'SELECT * FROM tokens_revogados WHERE token = ? AND expira_em > NOW()',
      [token]
    );
    
    if (revogados.length > 0) {
      throw new Error('Token revogado');
    }
    
    // Verificar assinatura do token
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    }
    throw error;
  }
};

// Middleware de autenticação
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Token de acesso não fornecido',
        code: 'NO_TOKEN'
      });
    }
    
    const decoded = await verifyToken(token);
    
    // Verificar se o usuário ainda existe e está ativo
    const connection = getConnection();
    const [usuarios] = await connection.execute(
      'SELECT id, username, email, ativo FROM usuarios WHERE id = ?',
      [decoded.userId]
    );
    
    if (usuarios.length === 0) {
      return res.status(401).json({ 
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }
    
    if (!usuarios[0].ativo) {
      return res.status(403).json({ 
        error: 'Usuário inativo',
        code: 'USER_INACTIVE'
      });
    }
    
    // Adicionar informações do usuário à requisição
    req.user = {
      id: usuarios[0].id,
      username: usuarios[0].username,
      email: usuarios[0].email
    };
    
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(401).json({ 
      error: error.message || 'Token inválido',
      code: 'AUTH_ERROR'
    });
  }
};

// Revogar token (para logout)
export const revokeToken = async (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded) return;
    
    const connection = getConnection();
    const expiresAt = new Date(decoded.exp * 1000);
    
    await connection.execute(
      'INSERT INTO tokens_revogados (token, usuario_id, expira_em) VALUES (?, ?, ?)',
      [token, decoded.userId, expiresAt]
    );
  } catch (error) {
    console.error('Erro ao revogar token:', error);
    throw error;
  }
};

