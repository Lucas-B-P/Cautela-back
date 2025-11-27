import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateStatus() {
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

    const sqlFile = path.join(__dirname, 'schema_status.sql');
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

    // IMPORTANTE: Atualizar dados existentes ANTES de alterar o ENUM
    console.log('Atualizando status existentes antes de alterar o ENUM...');
    try {
      const [result] = await connection.query(`UPDATE cautelas SET status = 'cautelado' WHERE status = 'assinado'`);
      console.log(`✓ ${result.affectedRows} registro(s) com status "assinado" atualizado(s) para "cautelado"`);
    } catch (error) {
      console.log('⚠ Erro ao atualizar status (pode não haver registros):', error.message);
    }

    console.log(`\nExecutando ${statements.length} comandos de migração...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          const firstLine = statement.split('\n')[0].substring(0, 60);
          console.log(`[${i + 1}/${statements.length}] Executando: ${firstLine}...`);
          
          await connection.query(statement);
          console.log(`✓ Comando ${i + 1} executado com sucesso\n`);
        } catch (error) {
          if (error.code === 'ER_DUP_FIELDNAME' || 
              error.code === 'ER_DUP_KEYNAME' ||
              error.code === 'WARN_DATA_TRUNCATED' ||
              error.message.includes('Duplicate') ||
              error.message.includes('already exists')) {
            console.log(`⚠ Alteração já aplicada ou ignorada, pulando comando ${i + 1}...\n`);
          } else {
            console.error(`❌ Erro ao executar comando ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }

    console.log('\n✅ Migração de status concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrateStatus();

