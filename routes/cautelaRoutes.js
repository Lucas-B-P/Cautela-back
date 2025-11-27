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

// GET - Buscar histórico de cautela (com todas as assinaturas) - DEVE VIR ANTES DE /:id
router.get('/:id/historico', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = getConnection();
    
    console.log('Buscando histórico para ID:', id);
    
    // Buscar cautela
    const [cautelas] = await connection.execute(
      'SELECT * FROM cautelas WHERE id = ? OR uuid = ?',
      [id, id]
    );
    
    if (cautelas.length === 0) {
      return res.status(404).json({ error: 'Cautela não encontrada' });
    }
    
    const cautela = cautelas[0];
    
    // Buscar todas as assinaturas relacionadas
    const [assinaturas] = await connection.execute(
      `SELECT * FROM assinaturas 
       WHERE cautela_id = ? 
       ORDER BY data_assinatura ASC`,
      [cautela.id]
    );
    
    res.json({
      cautela,
      assinaturas,
      total_assinaturas: assinaturas.length
    });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
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
      tipo_material,
      quantidade, 
      responsavel, 
      responsavel_nome, 
      responsavel_email,
      data_retirada, 
      observacoes 
    } = req.body;
    
    if (!material || !quantidade || !responsavel_nome || !responsavel_email || !tipo_material) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: material, tipo_material, quantidade, responsavel_nome, responsavel_email' 
      });
    }

    if (!['consumivel', 'permanente'].includes(tipo_material)) {
      return res.status(400).json({ 
        error: 'tipo_material deve ser "consumivel" ou "permanente"' 
      });
    }

    const uuid = uuidv4();
    const connection = getConnection();
    
    // Construir link de assinatura (será atualizado com a URL real do frontend)
    const link_assinatura = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/assinar/${uuid}`;
    
    const [result] = await connection.execute(
      `INSERT INTO cautelas (
        uuid, material, descricao, tipo_material, quantidade, responsavel, 
        responsavel_nome, responsavel_email, data_retirada, 
        observacoes, status, link_assinatura
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?)`,
      [
        uuid,
        material, 
        descricao || null,
        tipo_material,
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

// POST - Descautelar (criar nova assinatura de devolução)
router.post('/:id/descautelar', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Descautelar - ID recebido:', id, 'Tipo:', typeof id);
    
    const connection = getConnection();
    
    // Converter ID para número se possível
    const idNumero = parseInt(id);
    const isNumero = !isNaN(idNumero) && idNumero.toString() === id;
    
    // Buscar cautela - tentar primeiro por ID numérico, depois por UUID
    let [cautelas] = [];
    
    if (isNumero) {
      console.log('Buscando por ID numérico:', idNumero);
      [cautelas] = await connection.execute(
        'SELECT * FROM cautelas WHERE id = ?',
        [idNumero]
      );
    }
    
    // Se não encontrou por ID numérico, tentar por UUID ou ID como string
    if (cautelas.length === 0) {
      console.log('Não encontrado por ID numérico, tentando por UUID/ID string...');
      [cautelas] = await connection.execute(
        'SELECT * FROM cautelas WHERE uuid = ? OR id = ?',
        [id, id]
      );
    }
    
    console.log('Cautelas encontradas:', cautelas.length);
    
    if (cautelas.length === 0) {
      console.error('Cautela não encontrada para ID:', id);
      return res.status(404).json({ error: 'Cautela não encontrada' });
    }
    
    const cautela = cautelas[0];
    
    // Verificar se é material permanente
    if (cautela.tipo_material !== 'permanente') {
      return res.status(400).json({ 
        error: 'Apenas materiais permanentes podem ser descautelados' 
      });
    }
    
    // Verificar se está assinada
    if (cautela.status !== 'assinado') {
      return res.status(400).json({ 
        error: 'A cautela precisa estar assinada para ser descautelada' 
      });
    }
    
    // Criar novo UUID para a descautela
    const novoUuid = uuidv4();
    const link_descautela = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/assinar/${novoUuid}`;
    
    // Atualizar status para pendente e criar novo link
    await connection.execute(
      `UPDATE cautelas 
       SET status = 'pendente',
           link_assinatura = ?,
           data_devolucao = NULL
       WHERE id = ?`,
      [link_descautela, cautela.id]
    );
    
    // Buscar cautela atualizada
    const [updatedCautela] = await connection.execute(
      'SELECT * FROM cautelas WHERE id = ?',
      [cautela.id]
    );
    
    res.json({ 
      ...updatedCautela[0],
      message: 'Link de descautela gerado com sucesso',
      novo_uuid: novoUuid
    });
  } catch (error) {
    console.error('Erro ao descautelar:', error);
    res.status(500).json({ error: 'Erro ao descautelar' });
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

