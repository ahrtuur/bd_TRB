"""Constantes e rótulos de domínio — espelham trb-database/models."""


class StatusPedido:
    NOVO = "novo"
    PRODUCAO = "producao"
    AGUARDA_ENTREGA = "aguarda"
    ENTREGUE = "entregue"
    ATRASADO = "atrasado"

    TODOS = {NOVO, PRODUCAO, AGUARDA_ENTREGA, ENTREGUE, ATRASADO}

    LABELS = {
        NOVO: "Novo pedido",
        PRODUCAO: "Em produção",
        AGUARDA_ENTREGA: "Aguarda entrega",
        ENTREGUE: "Entregue",
        ATRASADO: "Atrasado",
    }

    # Ordem das colunas no kanban / dos contadores no painel.
    ORDEM = [ATRASADO, NOVO, PRODUCAO, AGUARDA_ENTREGA, ENTREGUE]


class StatusMaquina:
    LIVRE = "livre"
    OCUPADA = "ocupada"

    TODOS = {LIVRE, OCUPADA}
