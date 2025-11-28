-- Adicionar campo role na tabela usuarios
ALTER TABLE usuarios
ADD COLUMN role ENUM('admin', 'user') DEFAULT 'user' AFTER nome_completo;

-- Adicionar campo para registrar quem emitiu descautela
ALTER TABLE cautelas
ADD COLUMN emitido_por_usuario_id INT NULL AFTER assinatura_base64,
ADD COLUMN emitido_por_nome VARCHAR(255) NULL AFTER emitido_por_usuario_id,
ADD INDEX idx_emitido_por (emitido_por_usuario_id);

