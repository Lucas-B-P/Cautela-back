import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateUsers() {
  let connection;

  try {
    // Conectar ao banco de dados
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'railway',
    });

    console.log('✅ Conectado ao banco de dados');
    console.log('Aplicando migrações de usuários...\n');

    // Ler arquivo de migração
    const sqlFile = path.join(__dirname, 'migrate_users.sql');
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

    for (const statement of statements) {
      if (statement.length > 0) {
        try {
          await connection.query(statement);
          console.log('✓ Migração aplicada:', statement.substring(0, 50) + '...');
        } catch (error) {
          if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠ Campo já existe, pulando...');
          } else {
            throw error;
          }
        }
      }
    }

    console.log('\n✅ Migrações de usuários concluídas!');
  } catch (error) {
    console.error('❌ Erro ao aplicar migrações:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Conexão fechada');
    }
  }
}

migrateUsers();

