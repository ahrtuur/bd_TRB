# TRB — Telas Rio Branco · Front-end (Painel de Pedidos)

Front-end do sistema de gerenciamento de pedidos da **Telas Rio Branco**, construído
sobre a camada de dados [`trb-database`](https://github.com/arthurfwolff/bd_TRB/tree/main/trb-database).

A interface replica as telas do protótipo (Figma): painel de pedidos com contadores
por status, kanban, produção com fila e máquinas, entregas, clientes, filtros e
notificações (toasts).

---

## Stack

| Camada    | Tecnologia                                                        |
|-----------|-------------------------------------------------------------------|
| Front-end | HTML + CSS + JavaScript puro (sem build)                           |
| API       | FastAPI (REST) servindo o front e expondo pedidos/clientes/máquinas |
| Dados     | Em memória (mesmo seed do `trb-database`) por padrão · MongoDB opcional |

> O back-end original (`trb-database`) é só camada de dados MongoDB, **sem API HTTP**.
> Este projeto adiciona uma API REST fina por cima, com store em memória populado pelo
> mesmo seed, para rodar em qualquer máquina sem precisar subir um MongoDB.

---

## Como rodar

### Opção 1 — completo (API + front), recomendado

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.app:app --reload
```

Acesse **http://localhost:8000**.

### Opção 2 — só o front (offline)

Abra `frontend/index.html` direto no navegador. Sem API, o front detecta a ausência
e cai automaticamente para o seed local (`frontend/js/data.js`).

---

## Login

É uma demo: qualquer usuário/senha entra (já vem preenchido).

---

## Telas

| Aba         | O que mostra                                                            |
|-------------|-------------------------------------------------------------------------|
| **Pedidos** | Contadores por status, busca, filtros, tabela paginada e visão kanban   |
| **Produção**| Pedidos em produção, status das máquinas e fila de espera               |
| **Entregas**| Pedidos em "Aguarda entrega" e "Entregue"                               |
| **Clientes**| Grade de clientes; ao clicar, histórico de pedidos do cliente           |

Clicar em qualquer pedido abre o **detalhe**, com botão **Editar pedido**.
O botão **+ Novo pedido** cria pedidos. Tudo é refletido na API/seed em tempo real.

---

## API REST

| Método | Rota                          | Descrição                          |
|--------|-------------------------------|------------------------------------|
| GET    | `/api/pedidos`                | Lista (filtros: `status`, `q`, `tipo_tela`, `cliente`, paginação) |
| GET    | `/api/pedidos/stats`          | Contagem por status                |
| GET    | `/api/pedidos/{numero}`       | Detalhe                            |
| POST   | `/api/pedidos`                | Cria pedido                        |
| PUT    | `/api/pedidos/{numero}`       | Edita pedido                       |
| PATCH  | `/api/pedidos/{numero}/status`| Muda status (e aloca máquina)      |
| DELETE | `/api/pedidos/{numero}`       | Remove pedido                      |
| GET    | `/api/clientes`               | Lista clientes                     |
| GET    | `/api/clientes/{codigo}`      | Cliente + pedidos                  |
| GET    | `/api/maquinas`               | Estado das máquinas                |

Documentação interativa em **http://localhost:8000/docs**.

---

## Ligar no MongoDB real

O store é uma abstração (`backend/store.py`). Para usar o MongoDB do `trb-database`,
implemente um `MongoStore` com a mesma interface (reaproveitando os `repositories`)
e selecione-o via `TRB_STORAGE=mongo` + `MONGO_URI`.

---

## Estrutura

```
bd_TRB/
├── backend/
│   ├── app.py          # API FastAPI + serve o front
│   ├── store.py        # store em memória (+ ponto de extensão p/ Mongo)
│   ├── seed_data.py    # dados de exemplo (= seed do trb-database)
│   └── models.py       # status e rótulos
├── frontend/
│   ├── index.html
│   ├── css/styles.css
│   └── js/{api.js, app.js, data.js}
├── requirements.txt
└── README.md
```
