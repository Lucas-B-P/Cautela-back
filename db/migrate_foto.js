import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateFoto() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'railway',
    });

    console.log('✅ Conectado ao banco de dados');

    const sqlFile = path.join(__dirname, 'migrate_foto.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    const statements = sql
      .split(';')
      .map(stmt => {
        return stmt
          .split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n')
          .trim();
      })
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Executando migração para adicionar campo foto_base64...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          await connection.query(statement);
          console.log(`✓ Campo foto_base64 adicionado com sucesso\n`);
        } catch (error) {
          if (error.code === 'ER_DUP_FIELDNAME' || 
              error.message.includes('Duplicate column name')) {
            console.log(`⚠ Campo foto_base64 já existe, pulando...\n`);
          } else {
            console.error(`❌ Erro ao executar migração:`, error.message);
            throw error;
          }
        }
      }
    }

    console.log('✅ Migração de foto concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrateFoto();

