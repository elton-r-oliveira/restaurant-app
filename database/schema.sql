-- =============================================================
-- Comanda Digital — Schema do Banco de Dados
-- =============================================================

CREATE DATABASE IF NOT EXISTS BDRestaurant_App
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE BDRestaurant_App;

-- -------------------------------------------------------------
-- Restaurantes (multi-tenant root)
-- -------------------------------------------------------------
CREATE TABLE restaurantes (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(150)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  senha_hash    VARCHAR(255)  NOT NULL,
  plano         ENUM('trial','basico','pro') NOT NULL DEFAULT 'trial',
  ativo         TINYINT(1)    NOT NULL DEFAULT 1,
  criado_em     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- Usuários do restaurante (garçons, cozinha, admins)
-- -------------------------------------------------------------
CREATE TABLE usuarios (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  restaurante_id  INT UNSIGNED NOT NULL,
  nome            VARCHAR(100) NOT NULL,
  email           VARCHAR(150) NOT NULL,
  senha_hash      VARCHAR(255) NOT NULL,
  role            ENUM('garcom','cozinha','admin') NOT NULL DEFAULT 'garcom',
  ativo           TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_email_restaurante (email, restaurante_id),
  CONSTRAINT fk_usuarios_restaurante
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- Mesas
-- -------------------------------------------------------------
CREATE TABLE mesas (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  restaurante_id  INT UNSIGNED NOT NULL,
  numero          SMALLINT UNSIGNED NOT NULL,
  capacidade      SMALLINT UNSIGNED NOT NULL DEFAULT 4,
  status          ENUM('livre','ocupada','reservada') NOT NULL DEFAULT 'livre',
  UNIQUE KEY uq_mesa_restaurante (restaurante_id, numero),
  CONSTRAINT fk_mesas_restaurante
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- Categorias do cardápio
-- -------------------------------------------------------------
CREATE TABLE categorias (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  restaurante_id  INT UNSIGNED NOT NULL,
  nome            VARCHAR(80)  NOT NULL,
  ordem           SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_categorias_restaurante
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- Itens do cardápio
-- -------------------------------------------------------------
CREATE TABLE itens (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  restaurante_id  INT UNSIGNED NOT NULL,
  categoria_id    INT UNSIGNED NOT NULL,
  nome            VARCHAR(120) NOT NULL,
  descricao       TEXT,
  preco           DECIMAL(10,2) NOT NULL,
  disponivel      TINYINT(1)   NOT NULL DEFAULT 1,
  imagem_url      VARCHAR(500),
  criado_em       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_itens_restaurante
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE,
  CONSTRAINT fk_itens_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT
);

-- -------------------------------------------------------------
-- Comandas (uma por mesa por atendimento)
-- -------------------------------------------------------------
CREATE TABLE comandas (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  restaurante_id  INT UNSIGNED NOT NULL,
  mesa_id         INT UNSIGNED NOT NULL,
  garcom_id       INT UNSIGNED NOT NULL,
  status          ENUM('aberta','fechada','cancelada') NOT NULL DEFAULT 'aberta',
  total           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  aberta_em       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fechada_em      DATETIME,
  CONSTRAINT fk_comandas_restaurante
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE,
  CONSTRAINT fk_comandas_mesa
    FOREIGN KEY (mesa_id) REFERENCES mesas(id) ON DELETE RESTRICT,
  CONSTRAINT fk_comandas_garcom
    FOREIGN KEY (garcom_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- Regra garantida via trigger abaixo (não via unique index, pois MySQL não suporta partial index)

-- -------------------------------------------------------------
-- Itens da comanda
-- -------------------------------------------------------------
CREATE TABLE comanda_itens (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  comanda_id      INT UNSIGNED NOT NULL,
  item_id         INT UNSIGNED NOT NULL,
  quantidade      SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  preco_unitario  DECIMAL(10,2) NOT NULL,      -- snapshot do preço na hora do pedido
  observacao      VARCHAR(300),
  status          ENUM('pendente','em_preparo','pronto','entregue') NOT NULL DEFAULT 'pendente',
  pedido_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pronto_em       DATETIME,
  CONSTRAINT fk_ci_comanda
    FOREIGN KEY (comanda_id) REFERENCES comandas(id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_item
    FOREIGN KEY (item_id) REFERENCES itens(id) ON DELETE RESTRICT
);

-- -------------------------------------------------------------
-- Trigger: atualiza total da comanda ao inserir item
-- -------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER trg_ci_after_insert
AFTER INSERT ON comanda_itens
FOR EACH ROW
BEGIN
  UPDATE comandas
  SET total = total + (NEW.preco_unitario * NEW.quantidade)
  WHERE id = NEW.comanda_id;
END$$

-- Trigger: atualiza total da comanda ao deletar item
CREATE TRIGGER trg_ci_after_delete
AFTER DELETE ON comanda_itens
FOR EACH ROW
BEGIN
  UPDATE comandas
  SET total = total - (OLD.preco_unitario * OLD.quantidade)
  WHERE id = OLD.comanda_id;
END$$

-- Trigger: impede mesa de ter mais de uma comanda aberta ao mesmo tempo
CREATE TRIGGER trg_comanda_before_insert
BEFORE INSERT ON comandas
FOR EACH ROW
BEGIN
  DECLARE cnt INT;
  SELECT COUNT(*) INTO cnt
  FROM comandas
  WHERE mesa_id = NEW.mesa_id AND status = 'aberta';
  IF cnt > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Esta mesa já possui uma comanda aberta.';
  END IF;
END$$

DELIMITER ;

-- -------------------------------------------------------------
-- Dados iniciais de exemplo (restaurante demo)
-- -------------------------------------------------------------
INSERT INTO restaurantes (nome, email, senha_hash, plano) VALUES
  ('Restaurante Demo', 'demo@comanda.app', '$2b$10$PLACEHOLDER_HASH', 'pro');

-- Usuários do restaurante demo (senhas serão geradas com bcrypt na app)
INSERT INTO usuarios (restaurante_id, nome, email, senha_hash, role) VALUES
  (1, 'Admin Demo',   'admin@comanda.app',  '$2b$10$PLACEHOLDER_HASH', 'admin'),
  (1, 'Garçom João',  'joao@comanda.app',   '$2b$10$PLACEHOLDER_HASH', 'garcom'),
  (1, 'Cozinha',      'cozinha@comanda.app','$2b$10$PLACEHOLDER_HASH', 'cozinha');

-- Mesas
INSERT INTO mesas (restaurante_id, numero, capacidade) VALUES
  (1, 1, 4),(1, 2, 4),(1, 3, 2),(1, 4, 6),(1, 5, 2),
  (1, 6, 4),(1, 7, 4),(1, 8, 8),(1, 9, 2),(1,10, 4);

-- Categorias
INSERT INTO categorias (restaurante_id, nome, ordem) VALUES
  (1, 'Entradas',  1),
  (1, 'Pratos',    2),
  (1, 'Bebidas',   3),
  (1, 'Sobremesas',4);

-- Itens do cardápio
INSERT INTO itens (restaurante_id, categoria_id, nome, descricao, preco) VALUES
  (1, 1, 'Pão de Alho',       'Pão artesanal com manteiga de alho',          12.00),
  (1, 1, 'Fritas',            'Batata frita crocante com sal',                14.00),
  (1, 2, 'Filé ao Molho',     'Filé mignon ao molho madeira com fritas',      58.00),
  (1, 2, 'Frango Grelhado',   'Frango grelhado com legumes e arroz',          42.00),
  (1, 2, 'Massa Carbonara',   'Espaguete à carbonara com bacon crocante',     38.00),
  (1, 3, 'Água',              'Água mineral 500ml',                            5.00),
  (1, 3, 'Refrigerante',      'Lata 350ml',                                    7.00),
  (1, 3, 'Cerveja',           'Long neck 355ml',                              12.00),
  (1, 3, 'Suco Natural',      'Laranja, limão ou maracujá 300ml',             14.00),
  (1, 4, 'Pudim',             'Pudim de leite condensado',                    16.00),
  (1, 4, 'Brownie',           'Brownie de chocolate com sorvete de creme',    18.00);
