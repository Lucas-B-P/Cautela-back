# Guia de Deploy no Railway

## 1. Configurar Variáveis de Ambiente

No dashboard do Railway, acesse seu projeto → **Variables** e adicione:

### Variáveis do Banco de Dados
```
DB_HOST=switchyard.proxy.rlwy.net
DB_PORT=45986
DB_USER=root
DB_PASSWORD=mPgTuqTxpPYDeQQDFacNLmqZcSjGErDo
DB_NAME=railway
```

### Variáveis do Servidor
```
PORT=3001
FRONTEND_URL=https://cautela-front.vercel.app
```

### Variáveis de Autenticação (IMPORTANTE!)
```
JWT_SECRET=<GERE_UMA_CHAVE_SEGURA_AQUI>
JWT_EXPIRES_IN=24h
```

**⚠️ IMPORTANTE:** Gere uma chave JWT segura. Você pode usar:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Variáveis do Admin (para criar primeiro usuário)
```
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@cautela.com
ADMIN_PASSWORD=<DEFINA_UMA_SENHA_FORTE>
ADMIN_NAME=Administrador
```

## 2. Executar Migrações e Criar Admin

### Opção 1: Via Terminal do Railway (Recomendado)

1. Acesse o dashboard do Railway
2. Vá em seu serviço → **Deployments**
3. Clique no deployment mais recente
4. Clique na aba **"Logs"** ou **"Terminal"**
5. Execute os comandos:

```bash
# Executar migração do banco (adicionar campos tipo_material e tipo_assinatura)
npm run migrate

# Criar usuário administrador
npm run create-admin
```

### Opção 2: Via Railway CLI

Se você tem o Railway CLI instalado:

```bash
# Instalar Railway CLI (se não tiver)
npm i -g @railway/cli

# Fazer login
railway login

# Conectar ao projeto
railway link

# Executar comandos
railway run npm run migrate
railway run npm run create-admin
```

### Opção 3: Adicionar ao Script de Deploy

Você pode modificar o `railway.json` para executar automaticamente:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run migrate && npm run create-admin && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Nota:** Esta opção executará as migrações a cada deploy. Use apenas se necessário.

## 3. Verificar se Funcionou

### Verificar Health Check
```bash
curl https://cautela-back-production.up.railway.app/api/health
```

Deve retornar:
```json
{
  "status": "OK",
  "message": "Servidor funcionando",
  "database": "conectado",
  "timestamp": "..."
}
```

### Testar Login
```bash
curl -X POST https://cautela-back-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"sua_senha"}'
```

## 4. Troubleshooting

### Erro: "Cannot find module"
- Verifique se todas as dependências estão no `package.json`
- O `package-lock.json` deve estar commitado

### Erro: "Database connection failed"
- Verifique as variáveis de ambiente do banco de dados
- Confirme que o banco está acessível

### Erro: "JWT_SECRET not defined"
- Adicione a variável `JWT_SECRET` no Railway
- Gere uma chave segura

### Erro: "Table already exists"
- Normal se executar migração mais de uma vez
- O script ignora erros de tabela existente

## 5. Comandos Úteis

### Ver logs em tempo real
No Railway dashboard → **Deployments** → **Logs**

### Reiniciar serviço
No Railway dashboard → **Settings** → **Restart**

### Ver variáveis de ambiente
No Railway dashboard → **Variables**

## 6. Estrutura de Comandos

```bash
# Desenvolvimento local
npm install          # Instalar dependências
npm run migrate      # Executar migrações
npm run create-admin # Criar usuário admin
npm run dev          # Rodar em modo desenvolvimento

# Produção (Railway)
npm start            # Inicia o servidor (executado automaticamente)
```

## 7. Segurança

⚠️ **IMPORTANTE:**
- Nunca commite o arquivo `.env`
- Use variáveis de ambiente no Railway
- Gere uma `JWT_SECRET` forte e única
- Altere a senha do admin após o primeiro login
- Use senhas fortes para produção

