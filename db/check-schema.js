import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkSchema() {
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
    console.log('Verificando estrutura do banco...\n');

    // Verificar colunas da tabela cautelas
    const [cautelasColumns] = await connection.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'cautelas'`,
      [process.env.DB_NAME || 'railway']
    );

    console.log('Colunas da tabela cautelas:');
    cautelasColumns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.COLUMN_TYPE})`);
    });

    const hasTipoMaterial = cautelasColumns.some(col => col.COLUMN_NAME === 'tipo_material');
    const hasStatus = cautelasColumns.some(col => col.COLUMN_NAME === 'status');
    
    console.log(`\n✓ tipo_material: ${hasTipoMaterial ? 'EXISTE' : 'NÃO EXISTE'}`);
    console.log(`✓ status: ${hasStatus ? 'EXISTE' : 'NÃO EXISTE'}`);

    // Verificar valores do ENUM de status
    if (hasStatus) {
      const [statusEnum] = await connection.execute(
        `SELECT COLUMN_TYPE 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'cautelas' AND COLUMN_NAME = 'status'`,
        [process.env.DB_NAME || 'railway']
      );
      console.log(`  Tipo: ${statusEnum[0]?.COLUMN_TYPE || 'N/A'}`);
    }

    // Verificar colunas da tabela assinaturas
    const [assinaturasColumns] = await connection.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'assinaturas'`,
      [process.env.DB_NAME || 'railway']
    );

    console.log('\nColunas da tabela assinaturas:');
    assinaturasColumns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.COLUMN_TYPE})`);
    });

    const hasTipoAssinatura = assinaturasColumns.some(col => col.COLUMN_NAME === 'tipo_assinatura');
    
    console.log(`\n✓ tipo_assinatura: ${hasTipoAssinatura ? 'EXISTE' : 'NÃO EXISTE'}`);

    // Verificar valores do ENUM de tipo_assinatura
    if (hasTipoAssinatura) {
      const [tipoEnum] = await connection.execute(
        `SELECT COLUMN_TYPE 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'assinaturas' AND COLUMN_NAME = 'tipo_assinatura'`,
        [process.env.DB_NAME || 'railway']
      );
      console.log(`  Tipo: ${tipoEnum[0]?.COLUMN_TYPE || 'N/A'}`);
    }

    console.log('\n✅ Verificação concluída!');

    // Retornar status
    return {
      cautelas: {
        tipo_material: hasTipoMaterial,
        status: hasStatus
      },
      assinaturas: {
        tipo_assinatura: hasTipoAssinatura
      }
    };

  } catch (error) {
    console.error('❌ Erro ao verificar schema:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkSchema()
  .then(result => {
    console.log('\n📊 Resumo:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro:', error);
    process.exit(1);
  });

