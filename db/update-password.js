import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function updatePassword() {
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

    const senha = 'secti321';
    const username = 'admin';

    // Gerar hash correto
    console.log(`Gerando hash para senha: "${senha}"`);
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(senha, saltRounds);
    
    console.log(`Hash gerado: ${password_hash}\n`);

    // Verificar se o hash funciona
    const teste = await bcrypt.compare(senha, password_hash);
    console.log(`Teste do hash: ${teste ? '✅ CORRETO' : '❌ INCORRETO'}\n`);

    // Buscar usuário
    const [usuarios] = await connection.execute(
      'SELECT id, username FROM usuarios WHERE username = ?',
      [username]
    );

    if (usuarios.length === 0) {
      console.log(`❌ Usuário "${username}" não encontrado`);
      return;
    }

    const usuario = usuarios[0];
    console.log(`Encontrado usuário: ${usuario.username} (ID: ${usuario.id})\n`);

    // Atualizar senha
    console.log('Atualizando senha no banco de dados...');
    await connection.execute(
      'UPDATE usuarios SET password_hash = ? WHERE id = ?',
      [password_hash, usuario.id]
    );

    console.log('✅ Senha atualizada com sucesso!\n');

    // Verificar se foi atualizado corretamente
    const [verificacao] = await connection.execute(
      'SELECT password_hash FROM usuarios WHERE id = ?',
      [usuario.id]
    );

    const hashNoBanco = verificacao[0].password_hash;
    const testeFinal = await bcrypt.compare(senha, hashNoBanco);

    console.log('Verificação final:');
    console.log(`Hash no banco: ${hashNoBanco}`);
    console.log(`Teste com senha "${senha}": ${testeFinal ? '✅ CORRETO' : '❌ INCORRETO'}\n`);

    console.log('🎉 Senha atualizada! Agora você pode fazer login com:');
    console.log(`   Username: ${username}`);
    console.log(`   Senha: ${senha}`);

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updatePassword();

