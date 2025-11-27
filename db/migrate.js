import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateDatabase() {
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

    console.log('✅ Conectado ao banco de dados:', process.env.DB_NAME || 'railway');
    console.log('');

    // Ler o arquivo SQL de migração
    const sqlFile = path.join(__dirname, 'schema_update.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Executar o SQL
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

    console.log(`Executando ${statements.length} comandos de migração...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          const firstLine = statement.split('\n')[0].substring(0, 60);
          console.log(`[${i + 1}/${statements.length}] Executando: ${firstLine}...`);
          
          await connection.query(statement);
          console.log(`✓ Comando ${i + 1} executado com sucesso\n`);
        } catch (error) {
          // Ignorar erro se a coluna já existir
          if (error.code === 'ER_DUP_FIELDNAME' || 
              error.code === 'ER_DUP_KEYNAME' || 
              error.code === 'ER_CANT_DROP_FIELD_OR_KEY' ||
              error.message.includes('Duplicate column name') ||
              error.message.includes('Duplicate key name')) {
            console.log(`⚠ Coluna ou índice já existe, pulando comando ${i + 1}...\n`);
          } else {
            console.error(`❌ Erro ao executar comando ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }

    console.log('\n✅ Migração concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrateDatabase();

