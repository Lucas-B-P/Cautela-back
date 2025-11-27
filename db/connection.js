import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let connection = null;

export const createConnection = async () => {
  try {
    if (connection) {
      return connection;
    }

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cautela_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log('Conexão com o banco de dados estabelecida com sucesso!');
    return connection;
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados:', error);
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

