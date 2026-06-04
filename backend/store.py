"""Camada de armazenamento.

Por padrão usa um store EM MEMÓRIA, populado com o mesmo seed do trb-database,
para que o sistema rode em qualquer máquina sem precisar de MongoDB.

Para usar o MongoDB real, defina TRB_STORAGE=mongo e MONGO_URI no ambiente.
A interface é a mesma das funções dos repositories originais.
"""
import copy
import os
from datetime import datetime
from typing import Optional

from .models import StatusPedido, StatusMaquina
from . import seed_data


class InMemoryStore:
    def __init__(self):
        self.pedidos: list[dict] = []
        self.clientes: list[dict] = []
        self.maquinas: list[dict] = []
        self.popular()

    # ------------------------------------------------------------------ seed
    def popular(self):
        agora = datetime.utcnow()
        self.clientes = [
            {**c, "email": None, "endereco": None, "criado_em": agora, "atualizado_em": agora}
            for c in copy.deepcopy(seed_data.CLIENTES)
        ]
        self.maquinas = [
            {"nome": n, "status": StatusMaquina.LIVRE, "pedido_atual": None,
             "criado_em": agora, "atualizado_em": agora}
            for n in seed_data.MAQUINAS
        ]
        self.pedidos = []
        for p in copy.deepcopy(seed_data.PEDIDOS):
            self.pedidos.append({**p, "criado_em": agora, "atualizado_em": agora})
            if p["status"] == StatusPedido.PRODUCAO and p["maquina"]:
                self.alocar_maquina(p["maquina"], p["numero"])

    # --------------------------------------------------------------- pedidos
    def listar_pedidos(self) -> list[dict]:
        return [copy.deepcopy(p) for p in self.pedidos]

    def buscar_pedido(self, numero: int) -> Optional[dict]:
        for p in self.pedidos:
            if p["numero"] == numero:
                return copy.deepcopy(p)
        return None

    def contar_por_status(self) -> dict:
        resultado = {s: 0 for s in StatusPedido.TODOS}
        for p in self.pedidos:
            resultado[p["status"]] = resultado.get(p["status"], 0) + 1
        return resultado

    def proximo_numero(self) -> int:
        return (max((p["numero"] for p in self.pedidos), default=12344) + 1)

    def inserir_pedido(self, dados: dict) -> dict:
        agora = datetime.utcnow()
        pedido = {
            "numero": dados.get("numero") or self.proximo_numero(),
            "codigo_cliente": dados["codigo_cliente"],
            "nome_cliente": dados["nome_cliente"],
            "tipo_tela": dados["tipo_tela"],
            "quantidade": float(dados.get("quantidade", 1)),
            "data_pedido": dados.get("data_pedido"),
            "data_entrega": dados.get("data_entrega"),
            "status": dados.get("status", StatusPedido.NOVO),
            "maquina": dados.get("maquina"),
            "criado_em": agora,
            "atualizado_em": agora,
        }
        if any(p["numero"] == pedido["numero"] for p in self.pedidos):
            raise ValueError(f"Já existe pedido com número {pedido['numero']}")
        self.pedidos.append(pedido)
        if pedido["status"] == StatusPedido.PRODUCAO and pedido["maquina"]:
            self.alocar_maquina(pedido["maquina"], pedido["numero"])
        return copy.deepcopy(pedido)

    def atualizar_pedido(self, numero: int, campos: dict) -> Optional[dict]:
        for p in self.pedidos:
            if p["numero"] == numero:
                for proibido in ("numero", "criado_em"):
                    campos.pop(proibido, None)
                p.update(campos)
                p["atualizado_em"] = datetime.utcnow()
                return copy.deepcopy(p)
        return None

    def atualizar_status(self, numero: int, novo_status: str,
                         maquina: Optional[str] = None) -> Optional[dict]:
        for p in self.pedidos:
            if p["numero"] == numero:
                # libera a máquina anterior, se houver
                if p.get("maquina"):
                    self.liberar_maquina(p["maquina"])
                p["status"] = novo_status
                if novo_status == StatusPedido.PRODUCAO and maquina:
                    p["maquina"] = maquina
                    self.alocar_maquina(maquina, numero)
                else:
                    p["maquina"] = None
                p["atualizado_em"] = datetime.utcnow()
                return copy.deepcopy(p)
        return None

    def deletar_pedido(self, numero: int) -> bool:
        for i, p in enumerate(self.pedidos):
            if p["numero"] == numero:
                if p.get("maquina"):
                    self.liberar_maquina(p["maquina"])
                del self.pedidos[i]
                return True
        return False

    # -------------------------------------------------------------- clientes
    def listar_clientes(self) -> list[dict]:
        return [copy.deepcopy(c) for c in sorted(self.clientes, key=lambda c: c["nome"])]

    def buscar_cliente(self, codigo: str) -> Optional[dict]:
        for c in self.clientes:
            if c["codigo"] == codigo:
                return copy.deepcopy(c)
        return None

    # -------------------------------------------------------------- maquinas
    def listar_maquinas(self) -> list[dict]:
        return [copy.deepcopy(m) for m in sorted(self.maquinas, key=lambda m: m["nome"])]

    def alocar_maquina(self, nome: str, numero_pedido: int) -> bool:
        for m in self.maquinas:
            if m["nome"] == nome:
                m["status"] = StatusMaquina.OCUPADA
                m["pedido_atual"] = numero_pedido
                m["atualizado_em"] = datetime.utcnow()
                return True
        return False

    def liberar_maquina(self, nome: str) -> bool:
        for m in self.maquinas:
            if m["nome"] == nome:
                m["status"] = StatusMaquina.LIVRE
                m["pedido_atual"] = None
                m["atualizado_em"] = datetime.utcnow()
                return True
        return False


# Singleton simples. Para MongoDB, implementar um MongoStore com a mesma
# interface usando os repositories de trb-database e selecioná-lo aqui.
_store: Optional[InMemoryStore] = None


def get_store() -> InMemoryStore:
    global _store
    if _store is None:
        backend = os.getenv("TRB_STORAGE", "memory").lower()
        if backend == "mongo":
            raise NotImplementedError(
                "Backend MongoDB: conecte os repositories de trb-database aqui. "
                "Use TRB_STORAGE=memory (padrão) para rodar sem banco."
            )
        _store = InMemoryStore()
    return _store
