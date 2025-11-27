import express from 'express';
import { getConnection } from '../db/connection.js';

const router = express.Router();

// GET - Listar todas as assinaturas
router.get('/', async (req, res) => {
  try {
    const connection = getConnection();
    const [rows] = await connection.execute('SELECT * FROM assinaturas ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar assinaturas:', error);
    res.status(500).json({ error: 'Erro ao buscar assinaturas' });
  }
});

// GET - Buscar assinatura por ID
router.get('/:id', async (req, res) => {
  try {
    const connection = getConnection();
    const [rows] = await connection.execute('SELECT * FROM assinaturas WHERE id = ?', [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error);
    res.status(500).json({ error: 'Erro ao buscar assinatura' });
  }
});

// POST - Criar nova assinatura (por UUID da cautela)
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
    // Se já tem assinatura de cautela, esta é uma descautela
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
      // Se é descautela, marcar como devolvido
      await connection.execute(
        `UPDATE cautelas 
         SET status = 'assinado', 
             data_devolucao = NOW(),
             assinatura_base64 = ?
         WHERE id = ?`,
        [assinatura_base64, cautela.id]
      );
    } else {
      // Se é cautela inicial
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

// POST - Criar nova assinatura (rota genérica)
router.post('/', async (req, res) => {
  try {
    const { nome, cargo, assinatura_base64, cautela_id } = req.body;
    
    if (!nome || !cargo || !assinatura_base64) {
      return res.status(400).json({ error: 'Campos obrigatórios: nome, cargo, assinatura_base64' });
    }

    const connection = getConnection();
    const [result] = await connection.execute(
      'INSERT INTO assinaturas (nome, cargo, assinatura_base64, cautela_id) VALUES (?, ?, ?, ?)',
      [nome, cargo, assinatura_base64, cautela_id || null]
    );

    res.status(201).json({ id: result.insertId, message: 'Assinatura criada com sucesso' });
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    res.status(500).json({ error: 'Erro ao criar assinatura' });
  }
});

// PUT - Atualizar assinatura
router.put('/:id', async (req, res) => {
  try {
    const { nome, cargo, assinatura_base64, cautela_id } = req.body;
    
    const connection = getConnection();
    const [result] = await connection.execute(
      'UPDATE assinaturas SET nome = ?, cargo = ?, assinatura_base64 = ?, cautela_id = ? WHERE id = ?',
      [nome, cargo, assinatura_base64, cautela_id, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    res.json({ message: 'Assinatura atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error);
    res.status(500).json({ error: 'Erro ao atualizar assinatura' });
  }
});

// DELETE - Deletar assinatura
router.delete('/:id', async (req, res) => {
  try {
    const connection = getConnection();
    const [result] = await connection.execute('DELETE FROM assinaturas WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    res.json({ message: 'Assinatura deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar assinatura:', error);
    res.status(500).json({ error: 'Erro ao deletar assinatura' });
  }
});

export default router;

