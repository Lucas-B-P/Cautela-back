-- Atualização do schema para suportar tipo de material e histórico

-- Adicionar coluna tipo_material na tabela cautelas (se não existir)
-- Nota: Execute manualmente se der erro de coluna duplicada
ALTER TABLE cautelas 
ADD COLUMN tipo_material ENUM('consumivel', 'permanente') DEFAULT 'permanente' AFTER descricao;

-- Atualizar tabela assinaturas para incluir tipo de assinatura (se não existir)
ALTER TABLE assinaturas 
ADD COLUMN tipo_assinatura ENUM('cautela', 'descautela') DEFAULT 'cautela' AFTER cautela_id;

-- Adicionar índice para tipo_assinatura (se não existir)
CREATE INDEX idx_tipo_assinatura ON assinaturas (tipo_assinatura);

