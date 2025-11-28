-- Adicionar campo foto_base64 na tabela assinaturas
ALTER TABLE assinaturas 
ADD COLUMN foto_base64 LONGTEXT NULL AFTER assinatura_base64;

