import express from 'express';
import { getConnection } from '../db/connection.js';

const router = express.Router();

// POST - Criar assinatura pública (por UUID da cautela) - SEM AUTENTICAÇÃO
router.post('/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const { assinatura_base64, nome, cargo } = req.body;
    
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

    // Determinar tipo de assinatura baseado no status atual
    const [assinaturasExistentes] = await connection.execute(
      'SELECT * FROM assinaturas WHERE cautela_id = ? AND tipo_assinatura = "cautela"',
      [cautela.id]
    );
    
    const tipoAssinatura = assinaturasExistentes.length > 0 ? 'descautela' : 'cautela';

    // Criar assinatura
    const [result] = await connection.execute(
      `INSERT INTO assinaturas (
        cautela_id, tipo_assinatura, nome, cargo, assinatura_base64
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        cautela.id,
        tipoAssinatura,
        nome || cautela.responsavel_nome || 'Responsável',
        cargo || '',
        assinatura_base64
      ]
    );

    // Atualizar status da cautela
    if (tipoAssinatura === 'descautela') {
      await connection.execute(
        `UPDATE cautelas 
         SET status = 'assinado', 
             data_devolucao = NOW(),
             assinatura_base64 = ?
         WHERE id = ?`,
        [assinatura_base64, cautela.id]
      );
    } else {
      await connection.execute(
        `UPDATE cautelas 
         SET status = 'assinado', 
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

