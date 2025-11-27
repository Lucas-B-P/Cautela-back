import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  let connection;

  try {
    // Conectar sem especificar o banco de dados primeiro
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    console.log('Conectado ao servidor MySQL');

    // Selecionar o banco de dados
    const dbName = process.env.DB_NAME || 'railway';
    await connection.query(`USE ${dbName}`);
    console.log(`Usando banco de dados: ${dbName}`);

    // Ler o arquivo SQL
    const sqlFile = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Remover comentários e dividir em comandos
    const statements = sql
      .split(';')
      .map(stmt => {
        // Remover comentários de linha
        return stmt
          .split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n')
          .trim();
      })
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`\nEncontrados ${statements.length} comandos SQL para executar\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          // Mostrar qual comando está sendo executado
          const firstLine = statement.split('\n')[0].substring(0, 50);
          console.log(`[${i + 1}/${statements.length}] Executando: ${firstLine}...`);
          
          await connection.query(statement);
          console.log(`✓ Comando ${i + 1} executado com sucesso\n`);
        } catch (error) {
          // Ignorar erro se a tabela já existir
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_KEYNAME') {
            console.log(`⚠ Tabela ou índice já existe, pulando comando ${i + 1}...\n`);
          } else {
            console.error(`❌ Erro ao executar comando ${i + 1}:`, error.message);
            console.error(`SQL: ${statement.substring(0, 100)}...\n`);
            throw error;
          }
        }
      }
    }

    console.log('\n✅ Banco de dados inicializado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();

