# Comanda Digital

App de comanda digital para restaurantes e bares — SaaS multi-tenant.

## Estrutura

```
comanda-app/
├── backend/     Node.js + Express + Socket.IO
├── web/         React (painel admin + tela da cozinha)
├── mobile/      React Native + Expo (app do garçom)
└── database/    Schema SQL
```

## Setup rápido

### 1. Banco de dados (MySQL)

```bash
mysql -u root -p < database/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# edite .env com suas credenciais
npm install
node scripts/seed-passwords.js   # configura hashes das senhas de demo
npm run dev
```

### 3. Web (admin + cozinha)

```bash
cd web
npm install
npm run dev     # http://localhost:3000
```

### 4. Mobile (garçom)

```bash
cd mobile
npm install
# crie mobile/.env com: EXPO_PUBLIC_API_URL=http://SEU_IP:3001
npx expo start
```

## Credenciais de demo

| Email                  | Senha      | Role    |
|------------------------|------------|---------|
| admin@comanda.app      | admin123   | admin   |
| joao@comanda.app       | garcom123  | garcom  |
| cozinha@comanda.app    | cozinha123 | cozinha |

## API — Endpoints principais

| Método | Rota                                  | Descrição                   |
|--------|---------------------------------------|-----------------------------|
| POST   | /auth/login                           | Login (retorna JWT)         |
| GET    | /mesas                                | Lista mesas                 |
| POST   | /comandas                             | Abre comanda em mesa        |
| POST   | /comandas/:id/itens                   | Adiciona itens à comanda    |
| PATCH  | /comandas/:id/itens/:itemId/status    | Cozinha atualiza status     |
| POST   | /comandas/:id/fechar                  | Fecha comanda, libera mesa  |
| GET    | /cardapio/itens                       | Lista cardápio              |
| GET    | /relatorios/dia                       | Relatório diário            |

## Socket.IO — Eventos

| Evento          | Direção            | Payload                                   |
|-----------------|--------------------|-------------------------------------------|
| `novo_pedido`   | server → cozinha   | `{ comanda_id, mesa_id, itens[] }`        |
| `status_item`   | server → garçom    | `{ comanda_id, item_id, status }`         |
| `mesa_atualizada`| server → todos    | `{ mesa_id, status }`                     |
