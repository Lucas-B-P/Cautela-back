import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updateAdminRole() {
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
    console.log('Atualizando role dos usuários admin...\n');

    // Verificar se a coluna role existe
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'role'`,
      [process.env.DB_NAME || 'railway']
    );

    if (columns.length === 0) {
      console.log('⚠ Coluna role não existe. Execute primeiro: npm run migrate-users');
      process.exit(1);
    }

    // Buscar usuários admin (por username ou email)
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@cautela.com';

    const [usuarios] = await connection.execute(
      'SELECT id, username, email, role FROM usuarios WHERE username = ? OR email = ?',
      [adminUsername, adminEmail]
    );

    if (usuarios.length === 0) {
      console.log(`⚠ Nenhum usuário encontrado com username "${adminUsername}" ou email "${adminEmail}"`);
      console.log('Execute primeiro: npm run create-admin');
      process.exit(1);
    }

    let updated = 0;
    for (const usuario of usuarios) {
      if (usuario.role !== 'admin') {
        await connection.execute(
          'UPDATE usuarios SET role = ? WHERE id = ?',
          ['admin', usuario.id]
        );
        console.log(`✓ Usuário "${usuario.username}" atualizado para role "admin"`);
        updated++;
      } else {
        console.log(`✓ Usuário "${usuario.username}" já possui role "admin"`);
      }
    }

    if (updated === 0 && usuarios.length > 0) {
      console.log('\n✅ Todos os usuários admin já possuem role "admin"');
    } else {
      console.log(`\n✅ ${updated} usuário(s) atualizado(s) com sucesso!`);
    }

    // Também atualizar qualquer usuário que não tenha role definido (definir como 'user' por padrão)
    const [usuariosSemRole] = await connection.execute(
      'SELECT id, username FROM usuarios WHERE role IS NULL'
    );

    if (usuariosSemRole.length > 0) {
      console.log(`\nAtualizando ${usuariosSemRole.length} usuário(s) sem role...`);
      await connection.execute(
        'UPDATE usuarios SET role = ? WHERE role IS NULL',
        ['user']
      );
      console.log(`✓ ${usuariosSemRole.length} usuário(s) atualizado(s) com role "user"`);
    }

  } catch (error) {
    console.error('❌ Erro ao atualizar role:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nConexão fechada');
    }
  }
}

updateAdminRole();

