-- =============================================================
-- Comanda Digital — Schema do Banco de Dados (SQL Server / T-SQL)
-- =============================================================

IF DB_ID('BDRestaurant_App') IS NULL
BEGIN
  CREATE DATABASE BDRestaurant_App;
END
GO

USE BDRestaurant_App;
GO

-- -------------------------------------------------------------
-- Restaurantes (multi-tenant root)
-- -------------------------------------------------------------
CREATE TABLE restaurantes (
  id            INT IDENTITY(1,1) PRIMARY KEY,
  nome          NVARCHAR(150) NOT NULL,
  email         NVARCHAR(150) NOT NULL UNIQUE,
  senha_hash    VARCHAR(255)  NOT NULL,
  plano         VARCHAR(10)   NOT NULL DEFAULT 'trial'
                  CHECK (plano IN ('trial','basico','pro')),
  ativo         BIT           NOT NULL DEFAULT 1,
  criado_em     DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);
GO

-- -------------------------------------------------------------
-- Usuários do restaurante (garçons, cozinha, admins)
-- -------------------------------------------------------------
CREATE TABLE usuarios (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  restaurante_id  INT           NOT NULL,
  nome            NVARCHAR(100) NOT NULL,
  email           NVARCHAR(150) NOT NULL,
  senha_hash      VARCHAR(255)  NOT NULL,
  role            VARCHAR(10)   NOT NULL DEFAULT 'garcom'
                    CHECK (role IN ('garcom','cozinha','admin')),
  ativo           BIT           NOT NULL DEFAULT 1,
  criado_em       DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT uq_email_restaurante UNIQUE (email, restaurante_id),
  CONSTRAINT fk_usuarios_restaurante
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE
);
GO

-- -------------------------------------------------------------
-- Mesas
-- -------------------------------------------------------------
CREATE TABLE mesas (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  restaurante_id  INT      NOT NULL,
  numero          SMALLINT NOT NULL,
  capacidade      SMALLINT NOT NULL DEFAULT 4,
  status          VARCHAR(10) NOT NULL DEFAULT 'livre'
                    CHECK (status IN ('livre','ocupada','reservada')),
  CONSTRAINT uq_mesa_restaurante UNIQUE (restaurante_id, numero),
  CONSTRAINT fk_mesas_restaurante
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE
);
GO

-- -------------------------------------------------------------
-- Categorias do cardápio
-- -------------------------------------------------------------
CREATE TABLE categorias (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  restaurante_id  INT          NOT NULL,
  nome            NVARCHAR(80) NOT NULL,
  ordem           SMALLINT     NOT NULL DEFAULT 0,
  CONSTRAINT fk_categorias_restaurante
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE
);
GO

-- -------------------------------------------------------------
-- Itens do cardápio
-- -------------------------------------------------------------
CREATE TABLE itens (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  restaurante_id  INT            NOT NULL,
  categoria_id    INT            NOT NULL,
  nome            NVARCHAR(120)  NOT NULL,
  descricao       NVARCHAR(MAX),
  preco           DECIMAL(10,2)  NOT NULL,
  disponivel      BIT            NOT NULL DEFAULT 1,
  imagem_url      VARCHAR(500),
  criado_em       DATETIME2      NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT fk_itens_restaurante
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE,
  CONSTRAINT fk_itens_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE NO ACTION
);
GO

-- -------------------------------------------------------------
-- Comandas (uma por mesa por atendimento)
-- -------------------------------------------------------------
CREATE TABLE comandas (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  restaurante_id  INT           NOT NULL,
  mesa_id         INT           NOT NULL,
  garcom_id       INT           NOT NULL,
  status          VARCHAR(10)   NOT NULL DEFAULT 'aberta'
                    CHECK (status IN ('aberta','fechada','cancelada')),
  total           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  aberta_em       DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
  fechada_em      DATETIME2     NULL,
  CONSTRAINT fk_comandas_restaurante
    FOREIGN KEY (restaurante_id) REFERENCES restaurantes(id) ON DELETE CASCADE,
  CONSTRAINT fk_comandas_mesa
    FOREIGN KEY (mesa_id) REFERENCES mesas(id) ON DELETE NO ACTION,
  CONSTRAINT fk_comandas_garcom
    FOREIGN KEY (garcom_id) REFERENCES usuarios(id) ON DELETE NO ACTION
);
GO

-- Regra "uma mesa só pode ter uma comanda aberta por vez", garantida
-- via índice único filtrado — recurso que o MySQL não tem (lá isso
-- exigia um trigger; aqui o próprio índice cuida disso de forma atômica).
-- Índices filtrados exigem QUOTED_IDENTIFIER ON na sessão que os cria.
SET QUOTED_IDENTIFIER ON;
GO
CREATE UNIQUE INDEX uq_comandas_mesa_aberta ON comandas (mesa_id) WHERE status = 'aberta';
GO

-- -------------------------------------------------------------
-- Itens da comanda
-- -------------------------------------------------------------
CREATE TABLE comanda_itens (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  comanda_id      INT           NOT NULL,
  item_id         INT           NOT NULL,
  quantidade      SMALLINT      NOT NULL DEFAULT 1,
  preco_unitario  DECIMAL(10,2) NOT NULL,      -- snapshot do preço na hora do pedido
  observacao      NVARCHAR(300),
  status          VARCHAR(12)   NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('pendente','em_preparo','pronto','entregue')),
  pedido_em       DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
  pronto_em       DATETIME2     NULL,
  CONSTRAINT fk_ci_comanda
    FOREIGN KEY (comanda_id) REFERENCES comandas(id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_item
    FOREIGN KEY (item_id) REFERENCES itens(id) ON DELETE NO ACTION
);
GO

-- -------------------------------------------------------------
-- Trigger: atualiza total da comanda ao inserir item(ns)
-- -------------------------------------------------------------
CREATE TRIGGER trg_ci_after_insert ON comanda_itens
AFTER INSERT
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE c
  SET c.total = c.total + agg.soma
  FROM comandas c
  JOIN (
    SELECT comanda_id, SUM(preco_unitario * quantidade) AS soma
    FROM inserted
    GROUP BY comanda_id
  ) agg ON agg.comanda_id = c.id;
END
GO

-- Trigger: atualiza total da comanda ao deletar item(ns)
CREATE TRIGGER trg_ci_after_delete ON comanda_itens
AFTER DELETE
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE c
  SET c.total = c.total - agg.soma
  FROM comandas c
  JOIN (
    SELECT comanda_id, SUM(preco_unitario * quantidade) AS soma
    FROM deleted
    GROUP BY comanda_id
  ) agg ON agg.comanda_id = c.id;
END
GO

-- -------------------------------------------------------------
-- Dados iniciais de exemplo (restaurante demo)
-- -------------------------------------------------------------
INSERT INTO restaurantes (nome, email, senha_hash, plano) VALUES
  (N'Restaurante Demo', 'demo@comanda.app', '$2b$10$PLACEHOLDER_HASH', 'pro');

-- Usuários do restaurante demo (senhas serão geradas com bcrypt na app)
INSERT INTO usuarios (restaurante_id, nome, email, senha_hash, role) VALUES
  (1, N'Admin Demo',   'admin@comanda.app',  '$2b$10$PLACEHOLDER_HASH', 'admin'),
  (1, N'Garçom João',  'joao@comanda.app',   '$2b$10$PLACEHOLDER_HASH', 'garcom'),
  (1, N'Cozinha',      'cozinha@comanda.app','$2b$10$PLACEHOLDER_HASH', 'cozinha');

-- Mesas
INSERT INTO mesas (restaurante_id, numero, capacidade) VALUES
  (1, 1, 4),(1, 2, 4),(1, 3, 2),(1, 4, 6),(1, 5, 2),
  (1, 6, 4),(1, 7, 4),(1, 8, 8),(1, 9, 2),(1,10, 4);

-- Categorias
INSERT INTO categorias (restaurante_id, nome, ordem) VALUES
  (1, N'Entradas',  1),
  (1, N'Pratos',    2),
  (1, N'Bebidas',   3),
  (1, N'Sobremesas',4);

-- Itens do cardápio
INSERT INTO itens (restaurante_id, categoria_id, nome, descricao, preco) VALUES
  (1, 1, N'Pão de Alho',       N'Pão artesanal com manteiga de alho',          12.00),
  (1, 1, N'Fritas',            N'Batata frita crocante com sal',                14.00),
  (1, 2, N'Filé ao Molho',     N'Filé mignon ao molho madeira com fritas',      58.00),
  (1, 2, N'Frango Grelhado',   N'Frango grelhado com legumes e arroz',          42.00),
  (1, 2, N'Massa Carbonara',   N'Espaguete à carbonara com bacon crocante',     38.00),
  (1, 3, N'Água',              N'Água mineral 500ml',                            5.00),
  (1, 3, N'Refrigerante',      N'Lata 350ml',                                    7.00),
  (1, 3, N'Cerveja',           N'Long neck 355ml',                              12.00),
  (1, 3, N'Suco Natural',      N'Laranja, limão ou maracujá 300ml',             14.00),
  (1, 4, N'Pudim',             N'Pudim de leite condensado',                    16.00),
  (1, 4, N'Brownie',           N'Brownie de chocolate com sorvete de creme',    18.00);
GO
