import bcrypt from 'bcryptjs';

// Hash fornecido pelo usuário
const hashFornecido = '$2a$12$6q1YWvhca52ZPmHWNPo/seyAIX1C1dNcctJJ96CvukPtv9gTAUgSS';
const senhaTeste = 'secti321';
const senhaAntiga = 'admin123';

console.log('🔍 Testando hash de senha...\n');

// Testar com a senha nova
console.log('Testando com senha "secti321":');
const resultado1 = await bcrypt.compare(senhaTeste, hashFornecido);
console.log(`Resultado: ${resultado1 ? '✅ CORRETO' : '❌ INCORRETO'}\n`);

// Testar com a senha antiga
console.log('Testando com senha "admin123":');
const resultado2 = await bcrypt.compare(senhaAntiga, hashFornecido);
console.log(`Resultado: ${resultado2 ? '✅ CORRETO' : '❌ INCORRETO'}\n`);

// Gerar novo hash para a senha secti321
console.log('Gerando novo hash para "secti321":');
const novoHash = await bcrypt.hash(senhaTeste, 12);
console.log(`Novo hash: ${novoHash}\n`);

// Verificar se o novo hash funciona
console.log('Verificando novo hash:');
const resultado3 = await bcrypt.compare(senhaTeste, novoHash);
console.log(`Resultado: ${resultado3 ? '✅ CORRETO' : '❌ INCORRETO'}\n`);

console.log('📝 Use o novo hash gerado acima para atualizar no banco de dados.');

