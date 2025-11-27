-- Atualização do schema para novos status

-- Alterar ENUM de status para incluir cautelado e descautelado
ALTER TABLE cautelas 
MODIFY COLUMN status ENUM('pendente', 'cautelado', 'descautelado', 'cancelado') DEFAULT 'pendente';

