import express from 'express';
import { v4 as uuidv4 } from 'uuid';
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

// GET - Buscar cautela por ID ou UUID
router.get('/:id', async (req, res) => {
  try {
    const connection = getConnection();
    const { id } = req.params;
    
    // Tentar buscar por UUID primeiro, depois por ID
    let [rows] = await connection.execute(
      'SELECT * FROM cautelas WHERE uuid = ? OR id = ?',
      [id, id]
    );
    
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
    const { 
      material, 
      descricao, 
      quantidade, 
      responsavel, 
      responsavel_nome, 
      responsavel_email,
      data_retirada, 
      observacoes 
    } = req.body;
    
    if (!material || !quantidade || !responsavel_nome || !responsavel_email) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: material, quantidade, responsavel_nome, responsavel_email' 
      });
    }

    const uuid = uuidv4();
    const connection = getConnection();
    
    // Construir link de assinatura (será atualizado com a URL real do frontend)
    const link_assinatura = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/assinar/${uuid}`;
    
    const [result] = await connection.execute(
      `INSERT INTO cautelas (
        uuid, material, descricao, quantidade, responsavel, 
        responsavel_nome, responsavel_email, data_retirada, 
        observacoes, status, link_assinatura
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?)`,
      [
        uuid,
        material, 
        descricao || null,
        quantidade, 
        responsavel || responsavel_nome,
        responsavel_nome,
        responsavel_email,
        data_retirada || new Date(), 
        observacoes || null,
        link_assinatura
      ]
    );

    const [newCautela] = await connection.execute(
      'SELECT * FROM cautelas WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ 
      ...newCautela[0],
      message: 'Cautela criada com sucesso' 
    });
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

