/* Camada de acesso a dados do front.
   Tenta falar com a API REST (/api). Se não houver backend (ex.: abrir o
   index.html via file://), cai para um modo OFFLINE que usa o seed de data.js,
   mantendo a mesma interface. */
const API = (() => {
  const BASE = "/api";
  let online = null; // null = desconhecido; true/false após o primeiro teste

  async function tryFetch(path, opts) {
    const res = await fetch(BASE + path, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    if (!res.ok) {
      let msg = "Erro " + res.status;
      try { msg = (await res.json()).detail || msg; } catch (_) {}
      throw new Error(msg);
    }
    return res.status === 204 ? null : res.json();
  }

  async function isOnline() {
    if (online !== null) return online;
    try {
      await tryFetch("/health");
      online = true;
    } catch (_) {
      online = false;
    }
    return online;
  }

  // ----------------------------------------------------------- OFFLINE
  const off = (() => {
    const data = JSON.parse(JSON.stringify(window.TRB_SEED));
    const LABELS = data.labels;

    function maquinasState() {
      const map = {};
      data.maquinas.forEach((n) => (map[n] = { nome: n, status: "livre", pedido_atual: null }));
      data.pedidos.forEach((p) => {
        if (p.status === "producao" && p.maquina && map[p.maquina]) {
          map[p.maquina] = { nome: p.maquina, status: "ocupada", pedido_atual: p.numero };
        }
      });
      return Object.values(map).sort((a, b) => a.nome.localeCompare(b.nome));
    }
    function decorate(p) {
      return { ...p, status_label: LABELS[p.status] || p.status };
    }
    return {
      labels: LABELS,
      ordem: data.ordem,
      async stats() {
        const por = {}; data.ordem.forEach((s) => (por[s] = 0));
        data.pedidos.forEach((p) => (por[p.status] = (por[p.status] || 0) + 1));
        return { por_status: por, ordem: data.ordem, labels: LABELS,
          total: data.pedidos.length };
      },
      async pedidos(params = {}) {
        let lista = data.pedidos.map(decorate);
        if (params.status) lista = lista.filter((p) => p.status === params.status);
        if (params.cliente) lista = lista.filter((p) => p.codigo_cliente === params.cliente);
        if (params.tipo_tela)
          lista = lista.filter((p) => p.tipo_tela.toLowerCase().includes(params.tipo_tela.toLowerCase()));
        if (params.q) {
          const t = params.q.toLowerCase();
          lista = lista.filter((p) =>
            String(p.numero).includes(t) || p.nome_cliente.toLowerCase().includes(t) ||
            p.codigo_cliente.toLowerCase().includes(t) || p.tipo_tela.toLowerCase().includes(t));
        }
        lista.sort((a, b) => a.numero - b.numero);
        const total = lista.length;
        const ps = params.page_size || 0;
        let itens = lista, total_paginas = 1;
        if (ps > 0) {
          total_paginas = Math.max(1, Math.ceil(total / ps));
          const ini = ((params.page || 1) - 1) * ps;
          itens = lista.slice(ini, ini + ps);
        }
        return { itens, total, page: params.page || 1, page_size: ps, total_paginas };
      },
      async pedido(numero) {
        const p = data.pedidos.find((x) => x.numero === Number(numero));
        if (!p) throw new Error("Pedido não encontrado");
        return decorate(p);
      },
      async criarPedido(d) {
        const numero = Math.max(12344, ...data.pedidos.map((p) => p.numero)) + 1;
        const cli = data.clientes.find((c) => c.codigo === d.codigo_cliente);
        const p = { numero, maquina: null, ...d,
          nome_cliente: d.nome_cliente || (cli ? cli.nome : d.codigo_cliente),
          quantidade: Number(d.quantidade) || 1 };
        data.pedidos.push(p);
        return decorate(p);
      },
      async editarPedido(numero, d) {
        const p = data.pedidos.find((x) => x.numero === Number(numero));
        if (!p) throw new Error("Pedido não encontrado");
        Object.assign(p, d, { numero: p.numero, quantidade: Number(d.quantidade) || p.quantidade });
        return decorate(p);
      },
      async mudarStatus(numero, status, maquina) {
        const p = data.pedidos.find((x) => x.numero === Number(numero));
        if (!p) throw new Error("Pedido não encontrado");
        p.status = status;
        p.maquina = status === "producao" ? (maquina || null) : null;
        return decorate(p);
      },
      async deletarPedido(numero) {
        const i = data.pedidos.findIndex((x) => x.numero === Number(numero));
        if (i >= 0) data.pedidos.splice(i, 1);
        return null;
      },
      async clientes() {
        const cont = {};
        data.pedidos.forEach((p) => (cont[p.codigo_cliente] = (cont[p.codigo_cliente] || 0) + 1));
        const itens = data.clientes
          .map((c) => ({ ...c, total_pedidos: cont[c.codigo] || 0 }))
          .sort((a, b) => a.nome.localeCompare(b.nome));
        return { itens, total: itens.length };
      },
      async cliente(codigo) {
        const c = data.clientes.find((x) => x.codigo === codigo);
        if (!c) throw new Error("Cliente não encontrado");
        const pedidos = data.pedidos.filter((p) => p.codigo_cliente === codigo)
          .map(decorate).sort((a, b) => a.numero - b.numero);
        return { ...c, pedidos };
      },
      async maquinas() {
        const itens = maquinasState();
        return { itens, total: itens.length };
      },
    };
  })();

  // ----------------------------------------------------------- ONLINE
  const on = {
    labels: window.TRB_SEED.labels,
    ordem: window.TRB_SEED.ordem,
    stats: () => tryFetch("/pedidos/stats"),
    pedidos: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") qs.set(k, v); });
      return tryFetch("/pedidos?" + qs.toString());
    },
    pedido: (n) => tryFetch("/pedidos/" + n),
    criarPedido: (d) => tryFetch("/pedidos", { method: "POST", body: JSON.stringify(d) }),
    editarPedido: (n, d) => tryFetch("/pedidos/" + n, { method: "PUT", body: JSON.stringify(d) }),
    mudarStatus: (n, status, maquina) =>
      tryFetch("/pedidos/" + n + "/status", { method: "PATCH", body: JSON.stringify({ status, maquina }) }),
    deletarPedido: (n) => tryFetch("/pedidos/" + n, { method: "DELETE" }),
    clientes: () => tryFetch("/clientes"),
    cliente: (c) => tryFetch("/clientes/" + c),
    maquinas: () => tryFetch("/maquinas"),
  };

  // Proxy que escolhe online/offline na primeira chamada.
  async function call(method, ...args) {
    const impl = (await isOnline()) ? on : off;
    return impl[method](...args);
  }

  return {
    labels: window.TRB_SEED.labels,
    ordem: window.TRB_SEED.ordem,
    isOnline,
    stats: (...a) => call("stats", ...a),
    pedidos: (...a) => call("pedidos", ...a),
    pedido: (...a) => call("pedido", ...a),
    criarPedido: (...a) => call("criarPedido", ...a),
    editarPedido: (...a) => call("editarPedido", ...a),
    mudarStatus: (...a) => call("mudarStatus", ...a),
    deletarPedido: (...a) => call("deletarPedido", ...a),
    clientes: (...a) => call("clientes", ...a),
    cliente: (...a) => call("cliente", ...a),
    maquinas: (...a) => call("maquinas", ...a),
  };
})();
