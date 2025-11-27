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

// POST - Criar nova assinatura
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

