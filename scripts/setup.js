import { createConnection } from '../db/connection.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function setup() {
  try {
    console.log('🚀 Iniciando setup do sistema...\n');
    
    // Conectar ao banco
    await createConnection();
    console.log('✅ Conectado ao banco de dados\n');
    
    // Executar migração
    console.log('📦 Executando migrações...');
    try {
      const { migrate } = await import('../db/migrate.js');
      // A migração já executa automaticamente
    } catch (error) {
      console.log('⚠️ Migração já executada ou erro:', error.message);
    }
    
    // Criar admin (se não existir)
    console.log('\n👤 Verificando usuário administrador...');
    try {
      const { createAdmin } = await import('../db/create-admin.js');
      // O script já executa automaticamente
    } catch (error) {
      console.log('⚠️ Admin já existe ou erro:', error.message);
    }
    
    console.log('\n✅ Setup concluído!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no setup:', error);
    process.exit(1);
  }
}

// Só executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  setup();
}

