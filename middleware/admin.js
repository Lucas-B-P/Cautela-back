import { getConnection } from '../db/connection.js';

// Middleware para verificar se o usuário é administrador
export const requireAdmin = async (req, res, next) => {
  try {
    // Verificar se o usuário está autenticado
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const connection = getConnection();
    
    // Buscar informações do usuário incluindo role
    const [usuarios] = await connection.execute(
      'SELECT id, username, email, role, ativo FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ 
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    const usuario = usuarios[0];

    // Verificar se está ativo
    if (!usuario.ativo) {
      return res.status(403).json({ 
        error: 'Usuário inativo',
        code: 'USER_INACTIVE'
      });
    }

    // Verificar se é administrador
    // Se role for NULL ou não for 'admin', negar acesso
    // Usar COALESCE para tratar NULL como 'user'
    const userRole = usuario.role || 'user';
    if (userRole !== 'admin') {
      return res.status(403).json({ 
        error: 'Acesso negado. Apenas administradores podem realizar esta ação.',
        code: 'FORBIDDEN'
      });
    }

    // Adicionar informações completas do usuário à requisição
    req.user = {
      ...req.user,
      role: usuario.role
    };

    next();
  } catch (error) {
    console.error('Erro ao verificar permissões de admin:', error);
    return res.status(500).json({ 
      error: 'Erro ao verificar permissões',
      code: 'PERMISSION_CHECK_ERROR'
    });
  }
};

