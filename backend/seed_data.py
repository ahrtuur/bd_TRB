"""Dados de exemplo — idênticos ao scripts/seed.py do trb-database."""
from datetime import datetime

from .models import StatusPedido


def d(dia: int, mes: int = 1, ano: int = 2026) -> datetime:
    return datetime(ano, mes, dia)


CLIENTES = [
    {"codigo": "01010101", "nome": "Bianchini", "telefone": "51 99111-1111"},
    {"codigo": "01025101", "nome": "Marcondes", "telefone": "51 99222-2222"},
    {"codigo": "01010138", "nome": "Rodrigues", "telefone": "51 99333-3333"},
    {"codigo": "01019101", "nome": "Fonseca", "telefone": "51 99444-4444"},
    {"codigo": "01033201", "nome": "Silveira", "telefone": "51 99555-5555"},
    {"codigo": "01044501", "nome": "Pereira", "telefone": "51 99666-6666"},
    {"codigo": "01055601", "nome": "Lima", "telefone": "51 99777-7777"},
]

MAQUINAS = ["Máquina A", "Máquina B", "Máquina C", "Máquina D"]

PEDIDOS = [
    {"numero": 12345, "codigo_cliente": "01010101", "nome_cliente": "Bianchini",
     "tipo_tela": "Tela 5x3", "quantidade": 1.0, "data_pedido": d(5), "data_entrega": d(9),
     "status": StatusPedido.ATRASADO, "maquina": None},
    {"numero": 12346, "codigo_cliente": "01025101", "nome_cliente": "Marcondes",
     "tipo_tela": "Tela 4x2", "quantidade": 2.0, "data_pedido": d(4), "data_entrega": d(10),
     "status": StatusPedido.ENTREGUE, "maquina": None},
    {"numero": 12347, "codigo_cliente": "01010138", "nome_cliente": "Rodrigues",
     "tipo_tela": "Tela 6x4", "quantidade": 1.0, "data_pedido": d(9), "data_entrega": d(11),
     "status": StatusPedido.AGUARDA_ENTREGA, "maquina": None},
    {"numero": 12348, "codigo_cliente": "01019101", "nome_cliente": "Fonseca",
     "tipo_tela": "Tela 3x2", "quantidade": 3.0, "data_pedido": d(12), "data_entrega": d(20),
     "status": StatusPedido.NOVO, "maquina": None},
    {"numero": 12349, "codigo_cliente": "01033201", "nome_cliente": "Silveira",
     "tipo_tela": "Tela 5x3", "quantidade": 1.0, "data_pedido": d(13), "data_entrega": d(22),
     "status": StatusPedido.PRODUCAO, "maquina": "Máquina B"},
    {"numero": 12350, "codigo_cliente": "01044501", "nome_cliente": "Pereira",
     "tipo_tela": "Tela 8x5", "quantidade": 2.0, "data_pedido": d(14), "data_entrega": d(25),
     "status": StatusPedido.PRODUCAO, "maquina": "Máquina C"},
    {"numero": 12351, "codigo_cliente": "01010101", "nome_cliente": "Bianchini",
     "tipo_tela": "Tela 4x3", "quantidade": 1.0, "data_pedido": d(15), "data_entrega": d(28),
     "status": StatusPedido.PRODUCAO, "maquina": "Máquina D"},
    {"numero": 12352, "codigo_cliente": "01055601", "nome_cliente": "Lima",
     "tipo_tela": "Tela 6x3", "quantidade": 1.0, "data_pedido": d(16), "data_entrega": d(30),
     "status": StatusPedido.PRODUCAO, "maquina": "Máquina A"},
]
