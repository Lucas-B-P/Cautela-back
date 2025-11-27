import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verifyDatabase() {
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

    // Verificar se as tabelas existem
    const [tables] = await connection.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
      [process.env.DB_NAME || 'railway']
    );

    console.log(`📊 Tabelas encontradas: ${tables.length}`);
    
    if (tables.length === 0) {
      console.log('❌ Nenhuma tabela encontrada no banco de dados!');
    } else {
      console.log('\nTabelas:');
      tables.forEach((table, index) => {
        console.log(`  ${index + 1}. ${table.TABLE_NAME}`);
      });
    }

    // Verificar estrutura das tabelas
    if (tables.length > 0) {
      console.log('\n📋 Estrutura das tabelas:\n');
      
      for (const table of tables) {
        const tableName = table.TABLE_NAME;
        const [columns] = await connection.execute(
          `DESCRIBE ${tableName}`
        );
        
        console.log(`Tabela: ${tableName}`);
        console.log('Colunas:');
        columns.forEach(col => {
          console.log(`  - ${col.Field} (${col.Type})`);
        });
        console.log('');
      }
    }

    // Verificar se as tabelas esperadas existem
    const expectedTables = ['cautelas', 'assinaturas'];
    const existingTableNames = tables.map(t => t.TABLE_NAME);
    
    console.log('\n🔍 Verificação de tabelas esperadas:');
    expectedTables.forEach(tableName => {
      if (existingTableNames.includes(tableName)) {
        console.log(`  ✅ ${tableName} - EXISTE`);
      } else {
        console.log(`  ❌ ${tableName} - NÃO ENCONTRADA`);
      }
    });

  } catch (error) {
    console.error('❌ Erro ao verificar banco de dados:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verifyDatabase();

