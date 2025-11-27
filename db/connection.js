import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let connection = null;

export const createConnection = async () => {
  try {
    if (connection) {
      return connection;
    }

    // Obter configurações do banco de dados
    const dbConfig = {
      host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306'),
      user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
      password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
      database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'cautela_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };

    // Log de diagnóstico (sem mostrar senha)
    console.log('Tentando conectar ao banco de dados...');
    console.log(`Host: ${dbConfig.host}`);
    console.log(`Port: ${dbConfig.port}`);
    console.log(`User: ${dbConfig.user}`);
    console.log(`Database: ${dbConfig.database}`);
    console.log(`Password: ${dbConfig.password ? '***' : '(não configurada)'}`);

    connection = await mysql.createConnection(dbConfig);

    console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');
    return connection;
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error.message);
    console.error('Código do erro:', error.code);
    console.error('Variáveis de ambiente disponíveis:');
    console.error(`DB_HOST: ${process.env.DB_HOST || '(não definida)'}`);
    console.error(`DB_PORT: ${process.env.DB_PORT || '(não definida)'}`);
    console.error(`DB_USER: ${process.env.DB_USER || '(não definida)'}`);
    console.error(`DB_NAME: ${process.env.DB_NAME || '(não definida)'}`);
    throw error;
  }
};

export const getConnection = () => {
  if (!connection) {
    throw new Error('Conexão com o banco de dados não foi estabelecida');
  }
  return connection;
};

export default { createConnection, getConnection };

