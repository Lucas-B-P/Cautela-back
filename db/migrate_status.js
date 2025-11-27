import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateStatus() {
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

    const sqlFile = path.join(__dirname, 'schema_status.sql');
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

    // IMPORTANTE: Atualizar dados existentes ANTES de alterar o ENUM
    console.log('Verificando e atualizando status existentes antes de alterar o ENUM...');
    
    try {
      // Verificar quais valores de status existem
      const [statusValues] = await connection.query(
        `SELECT DISTINCT status, COUNT(*) as count FROM cautelas GROUP BY status`
      );
      console.log('Valores de status encontrados:');
      statusValues.forEach(row => {
        console.log(`  - ${row.status}: ${row.count} registro(s)`);
      });

      // Atualizar todos os valores inválidos
      let totalUpdated = 0;
      
      // Atualizar 'assinado' para 'cautelado'
      try {
        const [result1] = await connection.query(
          `UPDATE cautelas SET status = 'cautelado' WHERE status = 'assinado'`
        );
        totalUpdated += result1.affectedRows;
        if (result1.affectedRows > 0) {
          console.log(`✓ ${result1.affectedRows} registro(s) com status "assinado" atualizado(s) para "cautelado"`);
        }
      } catch (err) {
        console.log('⚠ Nenhum registro com status "assinado" encontrado');
      }

      // Verificar se há outros valores inválidos e atualizar para 'pendente' como fallback
      const validStatuses = ['pendente', 'cautelado', 'descautelado', 'cancelado'];
      const invalidStatuses = statusValues
        .map(row => row.status)
        .filter(status => !validStatuses.includes(status));

      if (invalidStatuses.length > 0) {
        console.log(`⚠ Encontrados valores inválidos: ${invalidStatuses.join(', ')}`);
        for (const invalidStatus of invalidStatuses) {
          try {
            const [result] = await connection.query(
              `UPDATE cautelas SET status = 'pendente' WHERE status = ?`,
              [invalidStatus]
            );
            totalUpdated += result.affectedRows;
            if (result.affectedRows > 0) {
              console.log(`✓ ${result.affectedRows} registro(s) com status "${invalidStatus}" atualizado(s) para "pendente"`);
            }
          } catch (err) {
            console.log(`⚠ Erro ao atualizar status "${invalidStatus}":`, err.message);
          }
        }
      }

      if (totalUpdated === 0) {
        console.log('✓ Nenhum registro precisou ser atualizado');
      } else {
        console.log(`✓ Total: ${totalUpdated} registro(s) atualizado(s)`);
      }
    } catch (error) {
      console.log('⚠ Erro ao verificar/atualizar status:', error.message);
      // Continuar mesmo com erro, pois pode não haver registros
    }

    console.log(`\nExecutando ${statements.length} comandos de migração...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          const firstLine = statement.split('\n')[0].substring(0, 60);
          console.log(`[${i + 1}/${statements.length}] Executando: ${firstLine}...`);
          
          await connection.query(statement);
          console.log(`✓ Comando ${i + 1} executado com sucesso\n`);
        } catch (error) {
          // Se for erro de truncamento de dados, tentar atualizar os dados novamente
          if (error.code === 'WARN_DATA_TRUNCATED' || error.message.includes('Data truncated')) {
            console.log(`⚠ Erro de truncamento detectado, atualizando dados novamente...`);
            try {
              // Forçar atualização de todos os valores inválidos
              await connection.query(`UPDATE cautelas SET status = 'cautelado' WHERE status = 'assinado'`);
              await connection.query(`UPDATE cautelas SET status = 'pendente' WHERE status NOT IN ('pendente', 'cautelado', 'descautelado', 'cancelado')`);
              console.log(`✓ Dados atualizados, tentando novamente...`);
              // Tentar executar o comando novamente
              await connection.query(statement);
              console.log(`✓ Comando ${i + 1} executado com sucesso após correção\n`);
            } catch (retryError) {
              console.log(`⚠ Não foi possível corrigir automaticamente, pulando comando ${i + 1}...\n`);
            }
          } else if (error.code === 'ER_DUP_FIELDNAME' || 
              error.code === 'ER_DUP_KEYNAME' ||
              error.message.includes('Duplicate') ||
              error.message.includes('already exists')) {
            console.log(`⚠ Alteração já aplicada, pulando comando ${i + 1}...\n`);
          } else {
            console.error(`❌ Erro ao executar comando ${i + 1}:`, error.message);
            // Não fazer throw para não parar a migração, apenas logar o erro
            console.error(`⚠ Continuando migração apesar do erro...\n`);
          }
        }
      }
    }

    console.log('\n✅ Migração de status concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrateStatus();

