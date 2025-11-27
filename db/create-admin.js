import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createAdmin() {
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

    // Criar tabelas de autenticação se não existirem
    const sqlFile = path.join(__dirname, 'schema_auth.sql');
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

    console.log('Criando tabelas de autenticação...\n');

    for (const statement of statements) {
      if (statement.length > 0) {
        try {
          await connection.query(statement);
          console.log('✓ Tabela criada');
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_KEYNAME') {
            console.log('⚠ Tabela já existe, pulando...');
          } else {
            throw error;
          }
        }
      }
    }

    // Criar usuário administrador
    const username = process.env.ADMIN_USERNAME || 'admin';
    const email = process.env.ADMIN_EMAIL || 'admin@cautela.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const nomeCompleto = process.env.ADMIN_NAME || 'Administrador';

    // Verificar se usuário já existe
    const [existentes] = await connection.execute(
      'SELECT id FROM usuarios WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existentes.length > 0) {
      console.log('\n⚠ Usuário administrador já existe!');
      console.log(`Username: ${username}`);
      console.log(`Email: ${email}`);
      return;
    }

    // Hash da senha
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Criar usuário
    const [result] = await connection.execute(
      `INSERT INTO usuarios (username, email, password_hash, nome_completo) 
       VALUES (?, ?, ?, ?)`,
      [username, email, password_hash, nomeCompleto]
    );

    console.log('\n✅ Usuário administrador criado com sucesso!');
    console.log(`\nCredenciais de acesso:`);
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);
    console.log(`Senha: ${password}`);
    console.log(`\n⚠ IMPORTANTE: Altere a senha após o primeiro login!`);

  } catch (error) {
    console.error('❌ Erro ao criar administrador:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createAdmin();

