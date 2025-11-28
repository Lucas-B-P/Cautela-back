-- Banco de dados para Sistema de Cautela de Materiais

-- Tabela de Cautelas
CREATE TABLE IF NOT EXISTS cautelas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    material VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo_material ENUM('consumivel', 'permanente') DEFAULT 'permanente',
    quantidade INT NOT NULL DEFAULT 1,
    responsavel VARCHAR(255) NOT NULL,
    responsavel_nome VARCHAR(255),
    responsavel_email VARCHAR(255),
    status ENUM('pendente', 'cautelado', 'descautelado', 'cancelado') DEFAULT 'pendente',
    data_retirada DATETIME,
    data_devolucao DATETIME,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_assinatura DATETIME,
    observacoes TEXT,
    link_assinatura VARCHAR(500),
    assinatura_base64 LONGTEXT,
    INDEX idx_uuid (uuid),
    INDEX idx_status (status),
    INDEX idx_responsavel_email (responsavel_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Assinaturas
CREATE TABLE IF NOT EXISTS assinaturas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cautela_id INT,
    tipo_assinatura ENUM('cautela', 'descautela') DEFAULT 'cautela',
    uuid VARCHAR(36) UNIQUE,
    nome VARCHAR(255) NOT NULL,
    cargo VARCHAR(255),
    assinatura_base64 LONGTEXT NOT NULL,
    foto_base64 LONGTEXT NULL,
    data_assinatura DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cautela_id) REFERENCES cautelas(id) ON DELETE CASCADE,
    INDEX idx_cautela_id (cautela_id),
    INDEX idx_uuid (uuid),
    INDEX idx_tipo_assinatura (tipo_assinatura)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

