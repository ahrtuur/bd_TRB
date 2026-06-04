"""API REST do TRB — Telas Rio Branco (Painel de Pedidos).

Expõe os dados do back-end (pedidos, clientes, máquinas) e serve o front-end.
Rode com:  uvicorn backend.app:app --reload
"""
import math
import os
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .models import StatusPedido
from .store import get_store

app = FastAPI(title="TRB — Telas Rio Branco", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")


# ----------------------------------------------------------------- schemas
def _iso(dt) -> Optional[str]:
    if isinstance(dt, datetime):
        return dt.date().isoformat()
    return dt


def serializar_pedido(p: dict) -> dict:
    return {
        "numero": p["numero"],
        "codigo_cliente": p["codigo_cliente"],
        "nome_cliente": p["nome_cliente"],
        "tipo_tela": p["tipo_tela"],
        "quantidade": p["quantidade"],
        "data_pedido": _iso(p.get("data_pedido")),
        "data_entrega": _iso(p.get("data_entrega")),
        "status": p["status"],
        "status_label": StatusPedido.LABELS.get(p["status"], p["status"]),
        "maquina": p.get("maquina"),
    }


def serializar_cliente(c: dict) -> dict:
    return {
        "codigo": c["codigo"],
        "nome": c["nome"],
        "telefone": c.get("telefone"),
        "email": c.get("email"),
        "endereco": c.get("endereco"),
    }


class PedidoIn(BaseModel):
    codigo_cliente: str
    nome_cliente: Optional[str] = None
    tipo_tela: str
    quantidade: float = 1.0
    data_pedido: Optional[str] = None
    data_entrega: Optional[str] = None
    status: str = StatusPedido.NOVO
    maquina: Optional[str] = None


class StatusIn(BaseModel):
    status: str
    maquina: Optional[str] = None


def _parse_data(valor: Optional[str]) -> Optional[datetime]:
    if not valor:
        return None
    try:
        return datetime.fromisoformat(valor)
    except ValueError:
        return None


# ------------------------------------------------------------------- rotas
@app.get("/api/health")
def health():
    return {"ok": True, "storage": os.getenv("TRB_STORAGE", "memory")}


@app.get("/api/pedidos/stats")
def stats():
    store = get_store()
    contagem = store.contar_por_status()
    return {
        "por_status": contagem,
        "ordem": StatusPedido.ORDEM,
        "labels": StatusPedido.LABELS,
        "total": sum(contagem.values()),
    }


@app.get("/api/pedidos")
def listar_pedidos(
    status: Optional[str] = None,
    q: Optional[str] = None,
    tipo_tela: Optional[str] = None,
    cliente: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(0, ge=0),
):
    store = get_store()
    pedidos = store.listar_pedidos()

    if status:
        pedidos = [p for p in pedidos if p["status"] == status]
    if cliente:
        pedidos = [p for p in pedidos if p["codigo_cliente"] == cliente]
    if tipo_tela:
        pedidos = [p for p in pedidos if tipo_tela.lower() in p["tipo_tela"].lower()]
    if q:
        termo = q.lower()
        pedidos = [
            p for p in pedidos
            if termo in str(p["numero"])
            or termo in p["nome_cliente"].lower()
            or termo in p["codigo_cliente"].lower()
            or termo in p["tipo_tela"].lower()
        ]

    pedidos.sort(key=lambda p: p["numero"])
    total = len(pedidos)
    itens = [serializar_pedido(p) for p in pedidos]

    if page_size > 0:
        total_paginas = max(1, math.ceil(total / page_size))
        inicio = (page - 1) * page_size
        itens = itens[inicio:inicio + page_size]
    else:
        total_paginas = 1

    return {
        "itens": itens,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_paginas": total_paginas,
    }


@app.get("/api/pedidos/{numero}")
def obter_pedido(numero: int):
    pedido = get_store().buscar_pedido(numero)
    if not pedido:
        raise HTTPException(404, "Pedido não encontrado")
    return serializar_pedido(pedido)


@app.post("/api/pedidos", status_code=201)
def criar_pedido(dados: PedidoIn):
    store = get_store()
    nome = dados.nome_cliente
    if not nome:
        cliente = store.buscar_cliente(dados.codigo_cliente)
        nome = cliente["nome"] if cliente else dados.codigo_cliente
    if dados.status not in StatusPedido.TODOS:
        raise HTTPException(400, f"Status inválido: {dados.status}")
    try:
        pedido = store.inserir_pedido({
            "codigo_cliente": dados.codigo_cliente,
            "nome_cliente": nome,
            "tipo_tela": dados.tipo_tela,
            "quantidade": dados.quantidade,
            "data_pedido": _parse_data(dados.data_pedido) or datetime.utcnow(),
            "data_entrega": _parse_data(dados.data_entrega),
            "status": dados.status,
            "maquina": dados.maquina,
        })
    except ValueError as e:
        raise HTTPException(400, str(e))
    return serializar_pedido(pedido)


@app.put("/api/pedidos/{numero}")
def editar_pedido(numero: int, dados: PedidoIn):
    store = get_store()
    campos = {
        "codigo_cliente": dados.codigo_cliente,
        "tipo_tela": dados.tipo_tela,
        "quantidade": dados.quantidade,
        "status": dados.status,
        "maquina": dados.maquina,
    }
    if dados.nome_cliente:
        campos["nome_cliente"] = dados.nome_cliente
    if dados.data_pedido:
        campos["data_pedido"] = _parse_data(dados.data_pedido)
    if dados.data_entrega:
        campos["data_entrega"] = _parse_data(dados.data_entrega)
    pedido = store.atualizar_pedido(numero, campos)
    if not pedido:
        raise HTTPException(404, "Pedido não encontrado")
    return serializar_pedido(pedido)


@app.patch("/api/pedidos/{numero}/status")
def mudar_status(numero: int, dados: StatusIn):
    if dados.status not in StatusPedido.TODOS:
        raise HTTPException(400, f"Status inválido: {dados.status}")
    pedido = get_store().atualizar_status(numero, dados.status, dados.maquina)
    if not pedido:
        raise HTTPException(404, "Pedido não encontrado")
    return serializar_pedido(pedido)


@app.delete("/api/pedidos/{numero}", status_code=204)
def remover_pedido(numero: int):
    if not get_store().deletar_pedido(numero):
        raise HTTPException(404, "Pedido não encontrado")
    return None


@app.get("/api/clientes")
def listar_clientes():
    store = get_store()
    pedidos = store.listar_pedidos()
    contagem: dict[str, int] = {}
    for p in pedidos:
        contagem[p["codigo_cliente"]] = contagem.get(p["codigo_cliente"], 0) + 1
    resultado = []
    for c in store.listar_clientes():
        item = serializar_cliente(c)
        item["total_pedidos"] = contagem.get(c["codigo"], 0)
        resultado.append(item)
    return {"itens": resultado, "total": len(resultado)}


@app.get("/api/clientes/{codigo}")
def obter_cliente(codigo: str):
    store = get_store()
    cliente = store.buscar_cliente(codigo)
    if not cliente:
        raise HTTPException(404, "Cliente não encontrado")
    pedidos = [serializar_pedido(p) for p in store.listar_pedidos()
               if p["codigo_cliente"] == codigo]
    item = serializar_cliente(cliente)
    item["pedidos"] = sorted(pedidos, key=lambda p: p["numero"])
    return item


@app.get("/api/maquinas")
def listar_maquinas():
    itens = get_store().listar_maquinas()
    return {
        "itens": [
            {"nome": m["nome"], "status": m["status"], "pedido_atual": m.get("pedido_atual")}
            for m in itens
        ],
        "total": len(itens),
    }


# --------------------------------------------------------------- front-end
if os.path.isdir(FRONTEND_DIR):
    app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")
    if os.path.isdir(os.path.join(FRONTEND_DIR, "assets")):
        app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")),
                  name="assets")

    @app.get("/")
    def index():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
