import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function checkPassword() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'railway',
    });

    console.log('✅ Conectado ao banco de dados\n');

    // Buscar usuário admin
    const [usuarios] = await connection.execute(
      'SELECT id, username, email, password_hash, LENGTH(password_hash) as hash_length FROM usuarios WHERE username = ? OR email LIKE ?',
      ['admin', '%admin%']
    );

    if (usuarios.length === 0) {
      console.log('❌ Nenhum usuário admin encontrado');
      return;
    }

    console.log(`Encontrados ${usuarios.length} usuário(s):\n`);

    for (const usuario of usuarios) {
      console.log(`Usuário: ${usuario.username}`);
      console.log(`Email: ${usuario.email}`);
      console.log(`Hash no banco: ${usuario.password_hash}`);
      console.log(`Tamanho do hash: ${usuario.hash_length} caracteres\n`);

      // Testar com diferentes senhas
      const senhas = ['secti321', 'admin123', 'Secti321', 'SECTI321'];
      
      console.log('Testando senhas:');
      for (const senha of senhas) {
        const resultado = await bcrypt.compare(senha, usuario.password_hash);
        console.log(`  "${senha}": ${resultado ? '✅ CORRETO' : '❌ INCORRETO'}`);
      }
      
      console.log('\n' + '='.repeat(60) + '\n');
    }

    // Verificar se há espaços ou caracteres extras
    const [usuario] = usuarios;
    const hashOriginal = usuario.password_hash;
    const hashTrimmed = hashOriginal.trim();
    
    if (hashOriginal !== hashTrimmed) {
      console.log('⚠️ ATENÇÃO: O hash no banco tem espaços em branco!');
      console.log(`Hash original: "${hashOriginal}"`);
      console.log(`Hash sem espaços: "${hashTrimmed}"\n`);
      
      // Testar com hash sem espaços
      console.log('Testando com hash sem espaços:');
      const resultado = await bcrypt.compare('secti321', hashTrimmed);
      console.log(`Resultado: ${resultado ? '✅ CORRETO' : '❌ INCORRETO'}\n`);
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkPassword();

