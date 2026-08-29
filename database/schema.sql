-- =============================================================
-- Comanda Digital — Schema do Banco de Dados (SQL Server / T-SQL)
-- Toda a lógica de acesso a dados vive em Stored Procedures (s_...)
-- sobre tabelas prefixadas com t_ — o backend nunca roda SQL solto,
-- só chama procedures.
-- =============================================================

IF DB_ID('BDRestaurant_App') IS NULL
BEGIN
  CREATE DATABASE BDRestaurant_App;
END
GO

USE BDRestaurant_App;
GO

-- -------------------------------------------------------------
-- Drop de procedures (antes das tabelas, por causa das FKs)
-- -------------------------------------------------------------
DROP PROCEDURE IF EXISTS dbo.s_relatorio_periodo;
GO
DROP PROCEDURE IF EXISTS dbo.s_relatorio_dia;
GO
DROP PROCEDURE IF EXISTS dbo.s_comanda_itens_insere_demo;
GO
DROP PROCEDURE IF EXISTS dbo.s_comandas_insere_demo;
GO
DROP PROCEDURE IF EXISTS dbo.s_comandas_fecha;
GO
DROP PROCEDURE IF EXISTS dbo.s_comandas_item_atualiza_status;
GO
DROP PROCEDURE IF EXISTS dbo.s_comandas_itens_insere;
GO
DROP PROCEDURE IF EXISTS dbo.s_comandas_abre;
GO
DROP PROCEDURE IF EXISTS dbo.s_comandas_detalha;
GO
DROP PROCEDURE IF EXISTS dbo.s_comandas_lista;
GO
DROP PROCEDURE IF EXISTS dbo.s_itens_remove;
GO
DROP PROCEDURE IF EXISTS dbo.s_itens_atualiza;
GO
DROP PROCEDURE IF EXISTS dbo.s_itens_insere;
GO
DROP PROCEDURE IF EXISTS dbo.s_itens_detalha;
GO
DROP PROCEDURE IF EXISTS dbo.s_itens_lista;
GO
DROP PROCEDURE IF EXISTS dbo.s_categorias_remove;
GO
DROP PROCEDURE IF EXISTS dbo.s_categorias_atualiza;
GO
DROP PROCEDURE IF EXISTS dbo.s_categorias_insere;
GO
DROP PROCEDURE IF EXISTS dbo.s_categorias_lista;
GO
DROP PROCEDURE IF EXISTS dbo.s_usuarios_atualiza_senha_por_email;
GO
DROP PROCEDURE IF EXISTS dbo.s_usuarios_desativa;
GO
DROP PROCEDURE IF EXISTS dbo.s_usuarios_atualiza;
GO
DROP PROCEDURE IF EXISTS dbo.s_usuarios_insere;
GO
DROP PROCEDURE IF EXISTS dbo.s_usuarios_lista;
GO
DROP PROCEDURE IF EXISTS dbo.s_mesas_remove;
GO
DROP PROCEDURE IF EXISTS dbo.s_mesas_atualiza;
GO
DROP PROCEDURE IF EXISTS dbo.s_mesas_insere;
GO
DROP PROCEDURE IF EXISTS dbo.s_mesas_detalha;
GO
DROP PROCEDURE IF EXISTS dbo.s_mesas_lista;
GO
DROP PROCEDURE IF EXISTS dbo.s_restaurantes_atualiza_senha_por_email;
GO
DROP PROCEDURE IF EXISTS dbo.s_login_busca_por_email;
GO

-- -------------------------------------------------------------
-- Drop das tabelas antigas (sem prefixo) — este script migra o
-- schema para o padrão t_/s_, então as tabelas antigas saem de cena.
-- Os triggers antigos (trg_ci_after_insert/delete) somem junto com
-- dbo.comanda_itens, não precisam de DROP TRIGGER separado.
-- -------------------------------------------------------------
DROP TABLE IF EXISTS dbo.comanda_itens;
GO
DROP TABLE IF EXISTS dbo.comandas;
GO
DROP TABLE IF EXISTS dbo.itens;
GO
DROP TABLE IF EXISTS dbo.categorias;
GO
DROP TABLE IF EXISTS dbo.mesas;
GO
DROP TABLE IF EXISTS dbo.usuarios;
GO
DROP TABLE IF EXISTS dbo.restaurantes;
GO

-- -------------------------------------------------------------
-- Drop de tabelas (ordem inversa às FKs)
-- -------------------------------------------------------------
DROP TABLE IF EXISTS dbo.t_comanda_itens;
GO
DROP TABLE IF EXISTS dbo.t_comandas;
GO
DROP TABLE IF EXISTS dbo.t_itens;
GO
DROP TABLE IF EXISTS dbo.t_categorias;
GO
DROP TABLE IF EXISTS dbo.t_mesas;
GO
DROP TABLE IF EXISTS dbo.t_usuarios;
GO
DROP TABLE IF EXISTS dbo.t_restaurantes;
GO

-- -------------------------------------------------------------
-- Restaurantes (multi-tenant root)
-- -------------------------------------------------------------
CREATE TABLE t_restaurantes (
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
CREATE TABLE t_usuarios (
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
    FOREIGN KEY (restaurante_id) REFERENCES t_restaurantes(id) ON DELETE CASCADE
);
GO

-- -------------------------------------------------------------
-- Mesas
-- -------------------------------------------------------------
CREATE TABLE t_mesas (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  restaurante_id  INT      NOT NULL,
  numero          SMALLINT NOT NULL,
  capacidade      SMALLINT NOT NULL DEFAULT 4,
  status          VARCHAR(10) NOT NULL DEFAULT 'livre'
                    CHECK (status IN ('livre','ocupada','reservada')),
  CONSTRAINT uq_mesa_restaurante UNIQUE (restaurante_id, numero),
  CONSTRAINT fk_mesas_restaurante
    FOREIGN KEY (restaurante_id) REFERENCES t_restaurantes(id) ON DELETE CASCADE
);
GO

-- -------------------------------------------------------------
-- Categorias do cardápio
-- -------------------------------------------------------------
CREATE TABLE t_categorias (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  restaurante_id  INT          NOT NULL,
  nome            NVARCHAR(80) NOT NULL,
  ordem           SMALLINT     NOT NULL DEFAULT 0,
  CONSTRAINT fk_categorias_restaurante
    FOREIGN KEY (restaurante_id) REFERENCES t_restaurantes(id) ON DELETE CASCADE
);
GO

-- -------------------------------------------------------------
-- Itens do cardápio
-- -------------------------------------------------------------
CREATE TABLE t_itens (
  id              INT            IDENTITY(1,1) PRIMARY KEY,
  restaurante_id  INT            NOT NULL,
  categoria_id    INT            NOT NULL,
  nome            NVARCHAR(120)  NOT NULL,
  descricao       NVARCHAR(MAX),
  preco           DECIMAL(10,2)  NOT NULL,
  disponivel      BIT            NOT NULL DEFAULT 1,
  imagem_url      VARCHAR(500),
  criado_em       DATETIME2      NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT fk_itens_restaurante
    FOREIGN KEY (restaurante_id) REFERENCES t_restaurantes(id) ON DELETE CASCADE,
  CONSTRAINT fk_itens_categoria
    FOREIGN KEY (categoria_id) REFERENCES t_categorias(id) ON DELETE NO ACTION
);
GO

-- -------------------------------------------------------------
-- Comandas (uma por mesa por atendimento)
-- -------------------------------------------------------------
CREATE TABLE t_comandas (
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
    FOREIGN KEY (restaurante_id) REFERENCES t_restaurantes(id) ON DELETE CASCADE,
  CONSTRAINT fk_comandas_mesa
    FOREIGN KEY (mesa_id) REFERENCES t_mesas(id) ON DELETE NO ACTION,
  CONSTRAINT fk_comandas_garcom
    FOREIGN KEY (garcom_id) REFERENCES t_usuarios(id) ON DELETE NO ACTION
);
GO

-- Regra "uma mesa só pode ter uma comanda aberta por vez", garantida
-- via índice único filtrado, de forma atômica direto no banco.
-- Índices filtrados exigem QUOTED_IDENTIFIER ON na sessão que os cria.
SET QUOTED_IDENTIFIER ON;
GO
CREATE UNIQUE INDEX uq_comandas_mesa_aberta ON t_comandas (mesa_id) WHERE status = 'aberta';
GO

-- -------------------------------------------------------------
-- Itens da comanda
-- -------------------------------------------------------------
CREATE TABLE t_comanda_itens (
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
    FOREIGN KEY (comanda_id) REFERENCES t_comandas(id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_item
    FOREIGN KEY (item_id) REFERENCES t_itens(id) ON DELETE NO ACTION
);
GO

-- -------------------------------------------------------------
-- Triggers: mantêm o total da comanda em sincronia com os itens
-- -------------------------------------------------------------
CREATE TRIGGER trg_t_comanda_itens_after_insert ON t_comanda_itens
AFTER INSERT
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE c
  SET c.total = c.total + agg.soma
  FROM t_comandas c
  JOIN (
    SELECT comanda_id, SUM(preco_unitario * quantidade) AS soma
    FROM inserted
    GROUP BY comanda_id
  ) agg ON agg.comanda_id = c.id;
END
GO

CREATE TRIGGER trg_t_comanda_itens_after_delete ON t_comanda_itens
AFTER DELETE
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE c
  SET c.total = c.total - agg.soma
  FROM t_comandas c
  JOIN (
    SELECT comanda_id, SUM(preco_unitario * quantidade) AS soma
    FROM deleted
    GROUP BY comanda_id
  ) agg ON agg.comanda_id = c.id;
END
GO

-- =============================================================
-- Procedures
-- =============================================================

-- ---------------------------------------------------------------
-- Login
-- ---------------------------------------------------------------
CREATE PROCEDURE dbo.s_login_busca_por_email
  @email NVARCHAR(150)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT u.id, u.nome, u.email, u.senha_hash, u.role, u.ativo,
         u.restaurante_id, r.nome AS restaurante_nome
  FROM t_usuarios u
  JOIN t_restaurantes r ON r.id = u.restaurante_id
  WHERE u.email = @email AND r.ativo = 1;
END
GO

CREATE PROCEDURE dbo.s_restaurantes_atualiza_senha_por_email
  @email NVARCHAR(150),
  @senhaHash VARCHAR(255)
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE t_restaurantes SET senha_hash = @senhaHash WHERE email = @email;
END
GO

-- ---------------------------------------------------------------
-- Mesas
-- ---------------------------------------------------------------
CREATE PROCEDURE dbo.s_mesas_lista
  @restauranteId INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT id, numero, capacidade, status
  FROM t_mesas
  WHERE restaurante_id = @restauranteId
  ORDER BY numero;
END
GO

-- Resultset 1: a mesa. Resultset 2: a comanda aberta dessa mesa (0 ou 1 linha).
CREATE PROCEDURE dbo.s_mesas_detalha
  @id INT,
  @restauranteId INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT id, numero, capacidade, status
  FROM t_mesas
  WHERE id = @id AND restaurante_id = @restauranteId;

  SELECT c.id, c.status, c.total, c.aberta_em, u.nome AS garcom_nome
  FROM t_comandas c
  JOIN t_usuarios u ON u.id = c.garcom_id
  WHERE c.mesa_id = @id AND c.status = 'aberta';
END
GO

CREATE PROCEDURE dbo.s_mesas_insere
  @restauranteId INT,
  @numero SMALLINT,
  @capacidade SMALLINT
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO t_mesas (restaurante_id, numero, capacidade)
  VALUES (@restauranteId, @numero, @capacidade);

  SELECT id, numero, capacidade, status
  FROM t_mesas WHERE id = SCOPE_IDENTITY();
END
GO

CREATE PROCEDURE dbo.s_mesas_atualiza
  @id INT,
  @restauranteId INT,
  @numero SMALLINT = NULL,
  @capacidade SMALLINT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE t_mesas
  SET numero     = COALESCE(@numero, numero),
      capacidade = COALESCE(@capacidade, capacidade)
  WHERE id = @id AND restaurante_id = @restauranteId;

  SELECT @@ROWCOUNT AS linhasAfetadas;
END
GO

CREATE PROCEDURE dbo.s_mesas_remove
  @id INT,
  @restauranteId INT
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM t_mesas WHERE id = @id AND restaurante_id = @restauranteId;
  SELECT @@ROWCOUNT AS linhasAfetadas;
END
GO

-- ---------------------------------------------------------------
-- Usuários
-- ---------------------------------------------------------------
CREATE PROCEDURE dbo.s_usuarios_lista
  @restauranteId INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT id, nome, email, role, ativo
  FROM t_usuarios
  WHERE restaurante_id = @restauranteId
  ORDER BY nome;
END
GO

CREATE PROCEDURE dbo.s_usuarios_insere
  @restauranteId INT,
  @nome NVARCHAR(100),
  @email NVARCHAR(150),
  @senhaHash VARCHAR(255),
  @role VARCHAR(10)
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO t_usuarios (restaurante_id, nome, email, senha_hash, role)
  VALUES (@restauranteId, @nome, @email, @senhaHash, @role);

  SELECT id, nome, email, role, ativo
  FROM t_usuarios WHERE id = SCOPE_IDENTITY();
END
GO

CREATE PROCEDURE dbo.s_usuarios_atualiza
  @id INT,
  @restauranteId INT,
  @nome NVARCHAR(100) = NULL,
  @email NVARCHAR(150) = NULL,
  @senhaHash VARCHAR(255) = NULL,
  @role VARCHAR(10) = NULL,
  @ativo BIT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE t_usuarios
  SET nome       = COALESCE(@nome, nome),
      email      = COALESCE(@email, email),
      senha_hash = COALESCE(@senhaHash, senha_hash),
      role       = COALESCE(@role, role),
      ativo      = COALESCE(@ativo, ativo)
  WHERE id = @id AND restaurante_id = @restauranteId;

  SELECT @@ROWCOUNT AS linhasAfetadas;
END
GO

CREATE PROCEDURE dbo.s_usuarios_desativa
  @id INT,
  @restauranteId INT
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE t_usuarios SET ativo = 0 WHERE id = @id AND restaurante_id = @restauranteId;
  SELECT @@ROWCOUNT AS linhasAfetadas;
END
GO

CREATE PROCEDURE dbo.s_usuarios_atualiza_senha_por_email
  @email NVARCHAR(150),
  @senhaHash VARCHAR(255)
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE t_usuarios SET senha_hash = @senhaHash WHERE email = @email;
END
GO

-- ---------------------------------------------------------------
-- Categorias
-- ---------------------------------------------------------------
CREATE PROCEDURE dbo.s_categorias_lista
  @restauranteId INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT id, nome, ordem
  FROM t_categorias
  WHERE restaurante_id = @restauranteId
  ORDER BY ordem, nome;
END
GO

CREATE PROCEDURE dbo.s_categorias_insere
  @restauranteId INT,
  @nome NVARCHAR(80),
  @ordem SMALLINT
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO t_categorias (restaurante_id, nome, ordem)
  VALUES (@restauranteId, @nome, @ordem);

  SELECT id, nome, ordem FROM t_categorias WHERE id = SCOPE_IDENTITY();
END
GO

CREATE PROCEDURE dbo.s_categorias_atualiza
  @id INT,
  @restauranteId INT,
  @nome NVARCHAR(80) = NULL,
  @ordem SMALLINT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE t_categorias
  SET nome  = COALESCE(@nome, nome),
      ordem = COALESCE(@ordem, ordem)
  WHERE id = @id AND restaurante_id = @restauranteId;

  SELECT @@ROWCOUNT AS linhasAfetadas;
END
GO

CREATE PROCEDURE dbo.s_categorias_remove
  @id INT,
  @restauranteId INT
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM t_categorias WHERE id = @id AND restaurante_id = @restauranteId;
  SELECT @@ROWCOUNT AS linhasAfetadas;
END
GO

-- ---------------------------------------------------------------
-- Itens do cardápio
-- ---------------------------------------------------------------
CREATE PROCEDURE dbo.s_itens_lista
  @restauranteId INT,
  @categoriaId INT = NULL,
  @disponivel BIT = NULL,
  @busca NVARCHAR(120) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SELECT i.id, i.categoria_id, c.nome AS categoria_nome,
         i.nome, i.descricao, i.preco, i.disponivel, i.imagem_url
  FROM t_itens i
  JOIN t_categorias c ON c.id = i.categoria_id
  WHERE i.restaurante_id = @restauranteId
    AND (@categoriaId IS NULL OR i.categoria_id = @categoriaId)
    AND (@disponivel IS NULL OR i.disponivel = @disponivel)
    AND (@busca IS NULL OR i.nome LIKE '%' + @busca + '%')
  ORDER BY c.ordem, c.nome, i.nome;
END
GO

CREATE PROCEDURE dbo.s_itens_detalha
  @id INT,
  @restauranteId INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT id, categoria_id, nome, descricao, preco, disponivel, imagem_url
  FROM t_itens
  WHERE id = @id AND restaurante_id = @restauranteId;
END
GO

CREATE PROCEDURE dbo.s_itens_insere
  @restauranteId INT,
  @categoriaId INT,
  @nome NVARCHAR(120),
  @descricao NVARCHAR(MAX) = NULL,
  @preco DECIMAL(10,2),
  @disponivel BIT,
  @imagemUrl VARCHAR(500) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO t_itens (restaurante_id, categoria_id, nome, descricao, preco, disponivel, imagem_url)
  VALUES (@restauranteId, @categoriaId, @nome, @descricao, @preco, @disponivel, @imagemUrl);

  SELECT id, categoria_id, nome, descricao, preco, disponivel, imagem_url
  FROM t_itens WHERE id = SCOPE_IDENTITY();
END
GO

CREATE PROCEDURE dbo.s_itens_atualiza
  @id INT,
  @restauranteId INT,
  @categoriaId INT = NULL,
  @nome NVARCHAR(120) = NULL,
  @descricao NVARCHAR(MAX) = NULL,
  @preco DECIMAL(10,2) = NULL,
  @disponivel BIT = NULL,
  @imagemUrl VARCHAR(500) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE t_itens
  SET categoria_id = COALESCE(@categoriaId, categoria_id),
      nome         = COALESCE(@nome, nome),
      descricao    = COALESCE(@descricao, descricao),
      preco        = COALESCE(@preco, preco),
      disponivel   = COALESCE(@disponivel, disponivel),
      imagem_url   = COALESCE(@imagemUrl, imagem_url)
  WHERE id = @id AND restaurante_id = @restauranteId;

  SELECT @@ROWCOUNT AS linhasAfetadas;
END
GO

CREATE PROCEDURE dbo.s_itens_remove
  @id INT,
  @restauranteId INT
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM t_itens WHERE id = @id AND restaurante_id = @restauranteId;
  SELECT @@ROWCOUNT AS linhasAfetadas;
END
GO

-- ---------------------------------------------------------------
-- Comandas
-- ---------------------------------------------------------------
CREATE PROCEDURE dbo.s_comandas_lista
  @restauranteId INT,
  @status VARCHAR(10) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SELECT c.id, c.mesa_id, m.numero AS mesa_numero,
         c.garcom_id, u.nome AS garcom_nome,
         c.status, c.total, c.aberta_em, c.fechada_em
  FROM t_comandas c
  JOIN t_mesas m    ON m.id = c.mesa_id
  JOIN t_usuarios u ON u.id = c.garcom_id
  WHERE c.restaurante_id = @restauranteId
    AND (@status IS NULL OR c.status = @status)
  ORDER BY c.aberta_em DESC;
END
GO

-- Resultset 1: cabeçalho da comanda. Resultset 2: os itens.
CREATE PROCEDURE dbo.s_comandas_detalha
  @id INT,
  @restauranteId INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT c.id, c.mesa_id, m.numero AS mesa_numero,
         c.garcom_id, u.nome AS garcom_nome,
         c.status, c.total, c.aberta_em, c.fechada_em
  FROM t_comandas c
  JOIN t_mesas m    ON m.id = c.mesa_id
  JOIN t_usuarios u ON u.id = c.garcom_id
  WHERE c.id = @id AND c.restaurante_id = @restauranteId;

  SELECT ci.id, ci.item_id, i.nome AS item_nome,
         ci.quantidade, ci.preco_unitario, ci.observacao,
         ci.status, ci.pedido_em, ci.pronto_em
  FROM t_comanda_itens ci
  JOIN t_itens i ON i.id = ci.item_id
  WHERE ci.comanda_id = @id
  ORDER BY ci.pedido_em;
END
GO

-- Abre a comanda: valida a mesa, insere a comanda e ocupa a mesa numa
-- única transação. 50001 = mesa não encontrada; 50002 = mesa já tem
-- comanda aberta (corrida entre dois garçons na mesma mesa).
CREATE PROCEDURE dbo.s_comandas_abre
  @restauranteId INT,
  @mesaId INT,
  @garcomId INT
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM t_mesas WHERE id = @mesaId AND restaurante_id = @restauranteId)
  BEGIN
    THROW 50001, 'Mesa não encontrada', 1;
  END

  DECLARE @novoId INT;

  BEGIN TRY
    BEGIN TRANSACTION;

    INSERT INTO t_comandas (restaurante_id, mesa_id, garcom_id)
    VALUES (@restauranteId, @mesaId, @garcomId);

    SET @novoId = SCOPE_IDENTITY();

    UPDATE t_mesas SET status = 'ocupada' WHERE id = @mesaId;

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    IF ERROR_NUMBER() IN (2601, 2627)
      THROW 50002, 'Esta mesa já possui uma comanda aberta.', 1;
    THROW;
  END CATCH

  SELECT c.id, c.mesa_id, m.numero AS mesa_numero,
         c.garcom_id, u.nome AS garcom_nome,
         c.status, c.total, c.aberta_em, c.fechada_em
  FROM t_comandas c
  JOIN t_mesas m    ON m.id = c.mesa_id
  JOIN t_usuarios u ON u.id = c.garcom_id
  WHERE c.id = @novoId;
END
GO

-- Adiciona um ou mais itens à comanda. Recebe a lista em JSON
-- (@itensJson: [{"item_id":1,"quantidade":2,"observacao":"..."}]) e
-- valida TODOS os itens antes de inserir qualquer um — se um item não
-- existir/estiver indisponível, nada é gravado (50003).
-- 50001 = comanda aberta não encontrada.
CREATE PROCEDURE dbo.s_comandas_itens_insere
  @comandaId INT,
  @restauranteId INT,
  @itensJson NVARCHAR(MAX)
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (
    SELECT 1 FROM t_comandas
    WHERE id = @comandaId AND restaurante_id = @restauranteId AND status = 'aberta'
  )
  BEGIN
    THROW 50001, 'Comanda aberta não encontrada', 1;
  END

  DECLARE @pedidos TABLE (item_id INT, quantidade SMALLINT, observacao NVARCHAR(300));
  INSERT INTO @pedidos (item_id, quantidade, observacao)
  SELECT item_id, ISNULL(quantidade, 1), observacao
  FROM OPENJSON(@itensJson)
  WITH (
    item_id     INT           '$.item_id',
    quantidade  SMALLINT      '$.quantidade',
    observacao  NVARCHAR(300) '$.observacao'
  );

  IF EXISTS (
    SELECT 1 FROM @pedidos p
    LEFT JOIN t_itens i
      ON i.id = p.item_id AND i.restaurante_id = @restauranteId AND i.disponivel = 1
    WHERE i.id IS NULL
  )
  BEGIN
    THROW 50003, 'Um ou mais itens não foram encontrados ou estão indisponíveis', 1;
  END

  DECLARE @inseridos TABLE (id INT, item_id INT);

  INSERT INTO t_comanda_itens (comanda_id, item_id, quantidade, preco_unitario, observacao)
  OUTPUT inserted.id, inserted.item_id INTO @inseridos (id, item_id)
  SELECT @comandaId, p.item_id, p.quantidade, i.preco, p.observacao
  FROM @pedidos p
  JOIN t_itens i ON i.id = p.item_id;

  SELECT ins.id, @comandaId AS comanda_id, ci.item_id, i.nome AS item_nome,
         ci.quantidade, ci.preco_unitario, ci.observacao, ci.status,
         ci.pedido_em, ci.pronto_em, c.mesa_id, m.numero AS mesa_numero
  FROM @inseridos ins
  JOIN t_comanda_itens ci ON ci.id = ins.id
  JOIN t_itens i          ON i.id = ci.item_id
  JOIN t_comandas c       ON c.id = @comandaId
  JOIN t_mesas m          ON m.id = c.mesa_id
  ORDER BY ci.pedido_em;
END
GO

CREATE PROCEDURE dbo.s_comandas_item_atualiza_status
  @id INT,
  @comandaId INT,
  @restauranteId INT,
  @status VARCHAR(12)
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @prontoEm DATETIME2 = CASE WHEN @status = 'pronto' THEN SYSDATETIME() ELSE NULL END;

  UPDATE ci
  SET ci.status = @status,
      ci.pronto_em = COALESCE(@prontoEm, ci.pronto_em)
  FROM t_comanda_itens ci
  JOIN t_comandas c ON c.id = ci.comanda_id
  WHERE ci.id = @id AND ci.comanda_id = @comandaId AND c.restaurante_id = @restauranteId;

  SELECT @@ROWCOUNT AS linhasAfetadas;
END
GO

-- Fecha a comanda e libera a mesa numa única transação.
-- 50001 = comanda aberta não encontrada.
CREATE PROCEDURE dbo.s_comandas_fecha
  @id INT,
  @restauranteId INT
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @mesaId INT, @total DECIMAL(10,2);

  SELECT @mesaId = mesa_id, @total = total
  FROM t_comandas
  WHERE id = @id AND restaurante_id = @restauranteId AND status = 'aberta';

  IF @mesaId IS NULL
  BEGIN
    THROW 50001, 'Comanda aberta não encontrada', 1;
  END

  BEGIN TRY
    BEGIN TRANSACTION;

    UPDATE t_comandas SET status = 'fechada', fechada_em = SYSDATETIME() WHERE id = @id;
    UPDATE t_mesas SET status = 'livre' WHERE id = @mesaId;

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH

  SELECT @mesaId AS mesa_id, @total AS total;
END
GO

-- ---------------------------------------------------------------
-- Seed de demonstração (usado por scripts/seed-demo-vendas.js)
-- ---------------------------------------------------------------
CREATE PROCEDURE dbo.s_comandas_insere_demo
  @restauranteId INT,
  @mesaId INT,
  @garcomId INT,
  @abertaEm DATETIME2,
  @fechadaEm DATETIME2
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO t_comandas (restaurante_id, mesa_id, garcom_id, status, total, aberta_em, fechada_em)
  VALUES (@restauranteId, @mesaId, @garcomId, 'fechada', 0, @abertaEm, @fechadaEm);

  SELECT SCOPE_IDENTITY() AS id;
END
GO

CREATE PROCEDURE dbo.s_comanda_itens_insere_demo
  @comandaId INT,
  @itemId INT,
  @quantidade SMALLINT,
  @precoUnitario DECIMAL(10,2),
  @pedidoEm DATETIME2,
  @prontoEm DATETIME2
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO t_comanda_itens (comanda_id, item_id, quantidade, preco_unitario, status, pedido_em, pronto_em)
  VALUES (@comandaId, @itemId, @quantidade, @precoUnitario, 'entregue', @pedidoEm, @prontoEm);
END
GO

-- ---------------------------------------------------------------
-- Relatórios
-- ---------------------------------------------------------------
-- Resultset 1: resumo. Resultset 2: top itens vendidos no dia.
CREATE PROCEDURE dbo.s_relatorio_dia
  @restauranteId INT,
  @data DATE
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    COUNT(*)                AS total_comandas,
    COALESCE(SUM(total), 0) AS faturamento,
    COALESCE(AVG(total), 0) AS ticket_medio
  FROM t_comandas
  WHERE restaurante_id = @restauranteId
    AND status = 'fechada'
    AND CAST(fechada_em AS DATE) = @data;

  SELECT TOP 10 i.nome, SUM(ci.quantidade) AS total_vendido,
         SUM(ci.quantidade * ci.preco_unitario) AS receita
  FROM t_comanda_itens ci
  JOIN t_itens i    ON i.id = ci.item_id
  JOIN t_comandas c ON c.id = ci.comanda_id
  WHERE c.restaurante_id = @restauranteId
    AND c.status = 'fechada'
    AND CAST(c.fechada_em AS DATE) = @data
  GROUP BY ci.item_id, i.nome
  ORDER BY total_vendido DESC;
END
GO

-- Resultset 1: resumo. Resultset 2: faturamento por dia. Resultset 3:
-- top itens vendidos. Resultset 4: faturamento por categoria.
CREATE PROCEDURE dbo.s_relatorio_periodo
  @restauranteId INT,
  @inicio DATE,
  @fim DATE
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    COUNT(*)                AS total_comandas,
    COALESCE(SUM(total), 0) AS faturamento,
    COALESCE(AVG(total), 0) AS ticket_medio
  FROM t_comandas
  WHERE restaurante_id = @restauranteId
    AND status = 'fechada'
    AND CAST(fechada_em AS DATE) BETWEEN @inicio AND @fim;

  SELECT CONVERT(varchar(10), CAST(fechada_em AS DATE), 23) AS data,
         COUNT(*)                AS total_comandas,
         COALESCE(SUM(total), 0) AS faturamento
  FROM t_comandas
  WHERE restaurante_id = @restauranteId
    AND status = 'fechada'
    AND CAST(fechada_em AS DATE) BETWEEN @inicio AND @fim
  GROUP BY CAST(fechada_em AS DATE)
  ORDER BY CAST(fechada_em AS DATE);

  SELECT TOP 10 i.nome, SUM(ci.quantidade) AS total_vendido,
         SUM(ci.quantidade * ci.preco_unitario) AS receita
  FROM t_comanda_itens ci
  JOIN t_itens i    ON i.id = ci.item_id
  JOIN t_comandas c ON c.id = ci.comanda_id
  WHERE c.restaurante_id = @restauranteId
    AND c.status = 'fechada'
    AND CAST(c.fechada_em AS DATE) BETWEEN @inicio AND @fim
  GROUP BY ci.item_id, i.nome
  ORDER BY total_vendido DESC;

  SELECT cat.nome AS categoria_nome,
         SUM(ci.quantidade) AS total_vendido,
         SUM(ci.quantidade * ci.preco_unitario) AS receita
  FROM t_comanda_itens ci
  JOIN t_itens i        ON i.id = ci.item_id
  JOIN t_categorias cat ON cat.id = i.categoria_id
  JOIN t_comandas c     ON c.id = ci.comanda_id
  WHERE c.restaurante_id = @restauranteId
    AND c.status = 'fechada'
    AND CAST(c.fechada_em AS DATE) BETWEEN @inicio AND @fim
  GROUP BY cat.id, cat.nome
  ORDER BY receita DESC;
END
GO

-- -------------------------------------------------------------
-- Dados iniciais de exemplo (restaurante demo)
-- -------------------------------------------------------------
INSERT INTO t_restaurantes (nome, email, senha_hash, plano) VALUES
  (N'Restaurante Demo', 'demo@comanda.app', '$2b$10$PLACEHOLDER_HASH', 'pro');

-- Usuários do restaurante demo (senhas serão geradas com bcrypt na app)
INSERT INTO t_usuarios (restaurante_id, nome, email, senha_hash, role) VALUES
  (1, N'Admin Demo',   'admin@comanda.app',  '$2b$10$PLACEHOLDER_HASH', 'admin'),
  (1, N'Garçom João',  'joao@comanda.app',   '$2b$10$PLACEHOLDER_HASH', 'garcom'),
  (1, N'Cozinha',      'cozinha@comanda.app','$2b$10$PLACEHOLDER_HASH', 'cozinha');

-- Mesas
INSERT INTO t_mesas (restaurante_id, numero, capacidade) VALUES
  (1, 1, 4),(1, 2, 4),(1, 3, 2),(1, 4, 6),(1, 5, 2),
  (1, 6, 4),(1, 7, 4),(1, 8, 8),(1, 9, 2),(1,10, 4);

-- Categorias
INSERT INTO t_categorias (restaurante_id, nome, ordem) VALUES
  (1, N'Entradas',  1),
  (1, N'Pratos',    2),
  (1, N'Bebidas',   3),
  (1, N'Sobremesas',4);

-- Itens do cardápio
INSERT INTO t_itens (restaurante_id, categoria_id, nome, descricao, preco) VALUES
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
