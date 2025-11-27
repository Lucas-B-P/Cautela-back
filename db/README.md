# Scripts de Banco de Dados

## Arquivos

- `schema.sql` - Script SQL para criar as tabelas do banco de dados
- `init-db.js` - Script Node.js para inicializar o banco de dados automaticamente

## Como usar

### Opção 1: Usando o script Node.js (Recomendado)

```bash
npm run init-db
```

Este script irá:
1. Conectar ao servidor MySQL usando as credenciais do arquivo `.env`
2. Selecionar o banco de dados especificado
3. Executar o script `schema.sql` para criar as tabelas

### Opção 2: Executar SQL manualmente

Você pode executar o arquivo `schema.sql` diretamente no seu cliente MySQL:

```bash
mysql -h switchyard.proxy.rlwy.net -P 45986 -u root -p railway < db/schema.sql
```

Ou copie e cole o conteúdo do arquivo `schema.sql` no seu cliente MySQL (phpMyAdmin, MySQL Workbench, etc.)

## Estrutura do Banco de Dados

### Tabela: `cautelas`
Armazena as informações das cautelas de materiais.

**Campos principais:**
- `id` - ID único (auto-incremento)
- `uuid` - UUID único para links de assinatura
- `material` - Nome do material
- `descricao` - Descrição detalhada
- `quantidade` - Quantidade de itens
- `responsavel_nome` - Nome do responsável
- `responsavel_email` - Email do responsável
- `status` - Status: 'pendente', 'assinado', 'cancelado'
- `link_assinatura` - Link para assinatura
- `assinatura_base64` - Assinatura digital (quando assinada)
- `data_criacao` - Data de criação
- `data_assinatura` - Data da assinatura

### Tabela: `assinaturas`
Armazena as assinaturas digitais.

**Campos principais:**
- `id` - ID único
- `cautela_id` - Referência à cautela
- `nome` - Nome de quem assinou
- `cargo` - Cargo
- `assinatura_base64` - Imagem da assinatura em base64
- `data_assinatura` - Data da assinatura

