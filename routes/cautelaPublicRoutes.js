import express from 'express';
import { getConnection } from '../db/connection.js';

const router = express.Router();

// GET - Buscar cautela por UUID (pública - para página de assinatura)
router.get('/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const connection = getConnection();
    
    console.log('Buscando cautela pública por UUID:', uuid);
    
    // Buscar cautela apenas por UUID (não por ID)
    const [rows] = await connection.execute(
      'SELECT * FROM cautelas WHERE uuid = ?',
      [uuid]
    );
    
    if (rows.length === 0) {
      console.log('Cautela não encontrada para UUID:', uuid);
      return res.status(404).json({ error: 'Cautela não encontrada' });
    }
    
    console.log('Cautela encontrada:', rows[0].id);
    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar cautela pública:', error);
    res.status(500).json({ error: 'Erro ao buscar cautela' });
  }
});

export default router;

