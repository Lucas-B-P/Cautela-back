import express from 'express';
import { getConnection } from '../db/connection.js';

const router = express.Router();

// GET - Listar todas as cautelas
router.get('/', async (req, res) => {
  try {
    const connection = getConnection();
    const [rows] = await connection.execute('SELECT * FROM cautelas ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar cautelas:', error);
    res.status(500).json({ error: 'Erro ao buscar cautelas' });
  }
});

// GET - Buscar cautela por ID
router.get('/:id', async (req, res) => {
  try {
    const connection = getConnection();
    const [rows] = await connection.execute('SELECT * FROM cautelas WHERE id = ?', [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cautela não encontrada' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar cautela:', error);
    res.status(500).json({ error: 'Erro ao buscar cautela' });
  }
});

// POST - Criar nova cautela
router.post('/', async (req, res) => {
  try {
    const { material, quantidade, responsavel, data_retirada, observacoes } = req.body;
    
    if (!material || !quantidade || !responsavel) {
      return res.status(400).json({ error: 'Campos obrigatórios: material, quantidade, responsavel' });
    }

    const connection = getConnection();
    const [result] = await connection.execute(
      'INSERT INTO cautelas (material, quantidade, responsavel, data_retirada, observacoes) VALUES (?, ?, ?, ?, ?)',
      [material, quantidade, responsavel, data_retirada || new Date(), observacoes || null]
    );

    res.status(201).json({ id: result.insertId, message: 'Cautela criada com sucesso' });
  } catch (error) {
    console.error('Erro ao criar cautela:', error);
    res.status(500).json({ error: 'Erro ao criar cautela' });
  }
});

// PUT - Atualizar cautela
router.put('/:id', async (req, res) => {
  try {
    const { material, quantidade, responsavel, data_retirada, data_devolucao, observacoes } = req.body;
    
    const connection = getConnection();
    const [result] = await connection.execute(
      'UPDATE cautelas SET material = ?, quantidade = ?, responsavel = ?, data_retirada = ?, data_devolucao = ?, observacoes = ? WHERE id = ?',
      [material, quantidade, responsavel, data_retirada, data_devolucao, observacoes, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cautela não encontrada' });
    }

    res.json({ message: 'Cautela atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar cautela:', error);
    res.status(500).json({ error: 'Erro ao atualizar cautela' });
  }
});

// DELETE - Deletar cautela
router.delete('/:id', async (req, res) => {
  try {
    const connection = getConnection();
    const [result] = await connection.execute('DELETE FROM cautelas WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cautela não encontrada' });
    }

    res.json({ message: 'Cautela deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar cautela:', error);
    res.status(500).json({ error: 'Erro ao deletar cautela' });
  }
});

export default router;

