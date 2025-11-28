import express from 'express';
import { getConnection } from '../db/connection.js';

const router = express.Router();

// POST - Criar assinatura pública (por UUID da cautela) - SEM AUTENTICAÇÃO
router.post('/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const { assinatura_base64, foto_base64, nome, cargo } = req.body;
    
    if (!assinatura_base64) {
      return res.status(400).json({ error: 'Campo obrigatório: assinatura_base64' });
    }

    const connection = getConnection();
    
    // Buscar cautela por UUID
    const [cautelas] = await connection.execute(
      'SELECT * FROM cautelas WHERE uuid = ?',
      [uuid]
    );
    
    if (cautelas.length === 0) {
      return res.status(404).json({ error: 'Cautela não encontrada' });
    }
    
    const cautela = cautelas[0];
    
    if (cautela.status !== 'pendente') {
      return res.status(400).json({ error: 'Esta cautela já foi assinada ou cancelada' });
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
    const [result] = await connection.execute(
      `INSERT INTO assinaturas (
        cautela_id, tipo_assinatura, nome, cargo, assinatura_base64, foto_base64
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        cautela.id,
        tipoAssinatura,
        nome || cautela.responsavel_nome || 'Responsável',
        cargo || '',
        assinatura_base64,
        foto_base64 || null
      ]
    );

    // Atualizar status da cautela
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

    // Buscar cautela atualizada
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

export default router;

