# Configuração do Railway

## Variáveis de Ambiente Necessárias

Para que o backend funcione corretamente no Railway, você precisa configurar as seguintes variáveis de ambiente:

### 1. Variáveis do Banco de Dados

No Railway, acesse seu projeto → **Variables** e adicione:

```
DB_HOST=switchyard.proxy.rlwy.net
DB_PORT=45986
DB_USER=root
DB_PASSWORD=mPgTuqTxpPYDeQQDFacNLmqZcSjGErDo
DB_NAME=railway
```

### 2. Variáveis do Servidor

```
PORT=3001
FRONTEND_URL=https://cautela-front.vercel.app
```

## Como Configurar no Railway

1. Acesse o dashboard do Railway: https://railway.app
2. Selecione seu projeto `Cautela-back`
3. Vá em **Variables** (ou **Settings** → **Variables**)
4. Clique em **+ New Variable** para cada variável
5. Adicione todas as variáveis listadas acima
6. Salve as alterações
7. O Railway fará um redeploy automaticamente

## Verificação

Após configurar as variáveis, verifique se o servidor está funcionando:

1. Acesse: `https://cautela-back-production.up.railway.app/api/health`
2. Deve retornar: `{"status":"OK","message":"Servidor funcionando","database":"conectado",...}`

## Troubleshooting

### Erro: ECONNREFUSED ::1:3306

Isso significa que as variáveis de ambiente não estão configuradas. Verifique:
- Se todas as variáveis estão definidas no Railway
- Se os valores estão corretos (sem espaços extras)
- Se o deploy foi feito após adicionar as variáveis

### Erro: CORS

Certifique-se de que `FRONTEND_URL` está configurada com a URL correta do Vercel.

