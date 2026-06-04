/* Fallback offline — usado quando a API (/api) não está disponível,
   por exemplo ao abrir o index.html direto no navegador (file://).
   Espelha o seed do trb-database. */
window.TRB_SEED = {
  labels: {
    novo: "Novo pedido",
    producao: "Em produção",
    aguarda: "Aguarda entrega",
    entregue: "Entregue",
    atrasado: "Atrasado",
  },
  ordem: ["atrasado", "novo", "producao", "aguarda", "entregue"],
  clientes: [
    { codigo: "01010101", nome: "Bianchini", telefone: "51 99111-1111" },
    { codigo: "01025101", nome: "Marcondes", telefone: "51 99222-2222" },
    { codigo: "01010138", nome: "Rodrigues", telefone: "51 99333-3333" },
    { codigo: "01019101", nome: "Fonseca", telefone: "51 99444-4444" },
    { codigo: "01033201", nome: "Silveira", telefone: "51 99555-5555" },
    { codigo: "01044501", nome: "Pereira", telefone: "51 99666-6666" },
    { codigo: "01055601", nome: "Lima", telefone: "51 99777-7777" },
  ],
  maquinas: ["Máquina A", "Máquina B", "Máquina C", "Máquina D"],
  pedidos: [
    { numero: 12345, codigo_cliente: "01010101", nome_cliente: "Bianchini", tipo_tela: "Tela 5x3", quantidade: 1.0, data_pedido: "2026-01-05", data_entrega: "2026-01-09", status: "atrasado", maquina: null },
    { numero: 12346, codigo_cliente: "01025101", nome_cliente: "Marcondes", tipo_tela: "Tela 4x2", quantidade: 2.0, data_pedido: "2026-01-04", data_entrega: "2026-01-10", status: "entregue", maquina: null },
    { numero: 12347, codigo_cliente: "01010138", nome_cliente: "Rodrigues", tipo_tela: "Tela 6x4", quantidade: 1.0, data_pedido: "2026-01-09", data_entrega: "2026-01-11", status: "aguarda", maquina: null },
    { numero: 12348, codigo_cliente: "01019101", nome_cliente: "Fonseca", tipo_tela: "Tela 3x2", quantidade: 3.0, data_pedido: "2026-01-12", data_entrega: "2026-01-20", status: "novo", maquina: null },
    { numero: 12349, codigo_cliente: "01033201", nome_cliente: "Silveira", tipo_tela: "Tela 5x3", quantidade: 1.0, data_pedido: "2026-01-13", data_entrega: "2026-01-22", status: "producao", maquina: "Máquina B" },
    { numero: 12350, codigo_cliente: "01044501", nome_cliente: "Pereira", tipo_tela: "Tela 8x5", quantidade: 2.0, data_pedido: "2026-01-14", data_entrega: "2026-01-25", status: "producao", maquina: "Máquina C" },
    { numero: 12351, codigo_cliente: "01010101", nome_cliente: "Bianchini", tipo_tela: "Tela 4x3", quantidade: 1.0, data_pedido: "2026-01-15", data_entrega: "2026-01-28", status: "producao", maquina: "Máquina D" },
    { numero: 12352, codigo_cliente: "01055601", nome_cliente: "Lima", tipo_tela: "Tela 6x3", quantidade: 1.0, data_pedido: "2026-01-16", data_entrega: "2026-01-30", status: "producao", maquina: "Máquina A" },
  ],
};
