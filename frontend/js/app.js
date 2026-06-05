/* App TRB — Painel de Pedidos (SPA vanilla, tema Telas Rio Branco) */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const TIPOS = ["Tela 3x2", "Tela 4x2", "Tela 4x3", "Tela 5x3", "Tela 6x3", "Tela 6x4", "Tela 8x5"];
  const AVATAR_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5 0-9 2.7-9 6v2h18v-2c0-3.3-4-6-9-6z"/></svg>`;

  // rótulos curtos dos contadores (como no protótipo)
  const CURTO = { atrasado: "Atrasado", novo: "Novo", producao: "Em produção",
                  aguarda: "Aguarda entrega", entregue: "Entregue" };

  const state = {
    view: "painel",
    page: 1,
    pageSize: 4,
    selecionado: null,
    filtros: { q: "", status: null, tipo_tela: "", qtd: null, inicio: "", entrega: "" },
    filtroTipos: new Set(),
  };

  // ------------------------------------------------------------ helpers
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtData = (iso) => { if (!iso) return "—"; const [a, m, d] = iso.split("-"); return `${d}/${m}/${a}`; };
  const fmtQtd = (q) => Number(q).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const badge = (s, label) => `<span class="badge badge-${s}">${esc(label || API.labels[s])}</span>`;

  function toast(msg, tipo = "sucesso") {
    const t = document.createElement("div");
    t.className = "toast " + tipo;
    const span = document.createElement("span"); span.textContent = msg;
    const x = document.createElement("button");
    x.className = "toast-close"; x.innerHTML = "&times;"; x.setAttribute("aria-label", "Fechar");
    const close = () => { t.style.opacity = "0"; setTimeout(() => t.remove(), 250); };
    x.addEventListener("click", close);
    t.append(span, x);
    $("#toasts").appendChild(t);
    setTimeout(close, 2600);
  }

  function aplicaFiltrosLocais(itens) {
    const f = state.filtros;
    return itens.filter((p) => {
      if (state.filtroTipos.size && !state.filtroTipos.has(p.tipo_tela)) return false;
      if (f.qtd != null && f.qtd !== "" && Number(p.quantidade) < Number(f.qtd)) return false;
      if (f.inicio && p.data_pedido && p.data_pedido < f.inicio) return false;
      if (f.entrega && p.data_entrega && p.data_entrega > f.entrega) return false;
      return true;
    });
  }
  const buildParams = () => ({
    q: state.filtros.q || undefined, status: state.filtros.status || undefined,
    tipo_tela: state.filtros.tipo_tela || undefined,
  });

  // ----------------------------------------------------------- contadores
  async function statsHTML() {
    const { por_status, ordem } = await API.stats();
    return `<div class="stats">${ordem.map((s) => `
      <button class="stat ${state.filtros.status === s ? "active" : ""}" data-status="${s}">
        <div><span class="num">${String(por_status[s] || 0).padStart(2, "0")}</span>
        <span class="lbl">${esc(CURTO[s])}</span></div>
        <span class="bar"></span>
      </button>`).join("")}</div>`;
  }
  function bindStats() {
    $$(".stat").forEach((b) => b.addEventListener("click", () => {
      state.filtros.status = state.filtros.status === b.dataset.status ? null : b.dataset.status;
      state.page = 1; render();
    }));
  }

  const toolbarHTML = () => `
    <div class="toolbar">
      <div class="search">
        <svg class="ico" viewBox="0 0 24 24"><path d="M21 21l-4.3-4.3M11 19a8 8 0 110-16 8 8 0 010 16z"/></svg>
        <input id="search" type="search" placeholder="Buscar pedido..." value="${esc(state.filtros.q)}">
      </div>
      <button class="btn btn--green" id="novo-pedido">+ Novo pedido</button>
      <button class="btn btn--outline" id="open-filters">
        <svg class="ico" viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4"/></svg> Filtros</button>
    </div>`;

  function bindToolbar() {
    let tmr;
    $("#search")?.addEventListener("input", (e) => {
      clearTimeout(tmr);
      tmr = setTimeout(() => { state.filtros.q = e.target.value.trim(); state.page = 1; render(); }, 220);
    });
    $("#novo-pedido")?.addEventListener("click", () => abrirForm());
    $("#open-filters")?.addEventListener("click", () => { montarFiltros(); abrir("#modal-filtros"); });
  }

  // ------------------------------------------------------- PAINEL (tabela)
  async function viewPainel() {
    const todos = aplicaFiltrosLocais((await API.pedidos(buildParams())).itens);
    const total = todos.length;
    const totalPg = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPg) state.page = totalPg;
    const itens = todos.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);

    const linhas = itens.map((p) => `
      <tr data-numero="${p.numero}">
        <td class="num-cell">${p.numero}</td>
        <td>${esc(p.codigo_cliente)}</td>
        <td>${esc(p.tipo_tela)}</td>
        <td>${fmtData(p.data_pedido)}</td>
        <td>${fmtData(p.data_entrega)}</td>
        <td>${badge(p.status, p.status_label)}</td>
      </tr>`).join("") || `<tr><td colspan="6" class="empty">Nenhum pedido encontrado.</td></tr>`;

    $("#content").innerHTML = `
      <h1 class="page-title">Painel de Pedidos</h1>
      ${await statsHTML()}
      ${toolbarHTML()}
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Nº do pedido</th><th>Código do cliente</th><th>Tipo de tela</th>
            <th>Data do pedido</th><th>Data da entrega</th><th>Status</th>
          </tr></thead>
          <tbody>${linhas}</tbody>
        </table>
        <div class="table-foot">
          <div class="pagination">
            <span class="page-num">${state.page} de ${totalPg}</span>
            <button id="pg-next" ${state.page >= totalPg ? "disabled" : ""}>próximo ►</button>
          </div>
          <button class="btn btn--green btn-voltar" id="pg-prev" ${state.page <= 1 ? "disabled" : ""}>Voltar</button>
        </div>
      </div>`;
    bindStats(); bindToolbar();
    $$("#content tbody tr[data-numero]").forEach((tr) =>
      tr.addEventListener("click", () => abrirDetalhe(Number(tr.dataset.numero))));
    $("#pg-next")?.addEventListener("click", () => { state.page++; render(); });
    $("#pg-prev")?.addEventListener("click", () => { if (state.page > 1) { state.page--; render(); } });
  }

  // ------------------------------------------------------- PEDIDOS (kanban)
  const cardKanban = (p) => `
    <div class="kcard ${state.selecionado === p.numero ? "sel" : ""}" data-status="${p.status}" data-numero="${p.numero}">
      <span class="kstatus">${esc(API.labels[p.status])}</span>
      <span class="flag"></span>
      <div class="kp">PEDIDO ${p.numero}</div>
      <div class="kc">Nome do Cliente</div>
      <div class="kn">${esc(p.nome_cliente)}</div>
      <span class="kplay"></span>
    </div>`;

  async function viewPedidos() {
    const itens = aplicaFiltrosLocais((await API.pedidos(buildParams())).itens);
    if (!state.selecionado && itens.length) state.selecionado = itens[0].numero;
    const cols = API.ordem.map((s) => {
      const doe = itens.filter((p) => p.status === s);
      return `<div class="kcol" data-status="${s}">
        <div class="kcol-head"><span>${esc(API.labels[s])}</span><span class="count">${doe.length}</span></div>
        ${doe.map(cardKanban).join("") || '<div class="empty" style="padding:14px;font-size:12px">—</div>'}
      </div>`;
    }).join("");
    const sel = itens.find((p) => p.numero === state.selecionado);

    $("#content").innerHTML = `
      <h1 class="page-title">Pedidos</h1>
      ${await statsHTML()}
      ${toolbarHTML()}
      <div class="kanban-wrap with-panel">
        <div class="kanban">${cols}</div>
        <aside class="detail-panel" id="painel-detalhe">${sel ? detalheDark(sel) : '<div class="dp-empty">Selecione um pedido</div>'}</aside>
      </div>`;
    bindStats(); bindToolbar();
    $$("#content .kcard").forEach((c) => c.addEventListener("click", () => {
      state.selecionado = Number(c.dataset.numero);
      $$("#content .kcard").forEach((x) => x.classList.toggle("sel", x === c));
      API.pedido(state.selecionado).then((p) => { $("#painel-detalhe").innerHTML = detalheDark(p); bindDark(p); });
    }));
    if (sel) bindDark(sel);
  }

  function detalheDark(p) {
    return `
      <div class="dp-head"><span class="dp-num">Nº PEDIDO ${p.numero}</span>
        <span class="dp-flag" style="background:var(--st-${p.status})"></span></div>
      <div class="dp-body">
        <div class="dp-row"><span class="k">Código do cliente</span><span class="v">${esc(p.codigo_cliente)}</span></div>
        <div class="dp-row"><span class="k">Nome do cliente</span><span class="v">${esc(p.nome_cliente)}</span></div>
        <div class="dp-row"><span class="k">Tipo de tela</span><span class="v">${esc(p.tipo_tela)}</span></div>
        <div class="dp-row"><span class="k">Quantidade</span><span class="v">${fmtQtd(p.quantidade)}</span></div>
        <div class="dp-row"><span class="k">Data do pedido</span><span class="v">${fmtData(p.data_pedido)}</span></div>
        <div class="dp-row"><span class="k">Data da entrega</span><span class="v">${fmtData(p.data_entrega)}</span></div>
        <div class="dp-row"><span class="k">Status</span>
          <span class="dp-status badge-${p.status}">${esc(p.status_label)}</span></div>
        ${p.maquina ? `<div class="dp-row"><span class="k">Máquina</span><span class="v">${esc(p.maquina)}</span></div>` : ""}
        <div class="dp-actions"><button class="btn btn--green" data-editar="${p.numero}">Editar pedido</button></div>
      </div>`;
  }
  function bindDark(p) {
    $(`[data-editar="${p.numero}"]`)?.addEventListener("click", () => abrirForm(p));
  }

  // detalhe em modal (vindo da tabela)
  function abrirDetalhe(numero) {
    API.pedido(numero).then((p) => {
      let m = $("#modal-detalhe");
      if (!m) {
        m = document.createElement("div"); m.id = "modal-detalhe"; m.className = "modal";
        m.innerHTML = `<div class="modal-backdrop" data-close></div>
          <div class="modal-card detail-panel" id="modal-det-card" style="max-width:380px"></div>`;
        document.body.appendChild(m);
        m.querySelector("[data-close]").addEventListener("click", () => m.classList.add("hidden"));
      }
      $("#modal-det-card").innerHTML = detalheDark(p);
      bindDark(p);
      m.classList.remove("hidden");
    });
  }

  // ------------------------------------------------------------ produção
  async function viewProducao() {
    const [prod, novos] = await Promise.all([
      API.pedidos({ status: "producao" }), API.pedidos({ status: "novo" }),
    ]);
    const fila = [...prod.itens, ...novos.itens].sort((a, b) => a.numero - b.numero);
    let sel = fila.find((p) => p.numero === state.selecionado);
    if (!sel && prod.itens.length) { state.selecionado = prod.itens[0].numero; sel = prod.itens[0]; }

    $("#content").innerHTML = `
      <h1 class="page-title">Produção</h1>
      <div class="prod-grid">
        <div>
          <p class="section-title" style="margin-top:0">Em produção</p>
          <div class="prod-cards">
            ${prod.itens.map(cardKanban).join("") || '<div class="empty">Nenhum pedido em produção.</div>'}
          </div>
          <p class="section-title">Fila</p>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Nº</th><th>Código</th><th>Tipo de tela</th><th>Máquina</th></tr></thead>
              <tbody>${fila.map((p) => `
                <tr data-numero="${p.numero}">
                  <td class="num-cell">${p.numero}</td>
                  <td>${esc(p.codigo_cliente)}</td>
                  <td>${esc(p.tipo_tela)}</td>
                  <td>${esc(p.maquina || "—")}</td>
                </tr>`).join("") || '<tr><td colspan="4" class="empty">Fila vazia.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
        <aside class="detail-panel" id="painel-detalhe">${sel ? detalheDark(sel) : '<div class="dp-empty">Selecione um pedido</div>'}</aside>
      </div>`;

    const selecionar = (numero) => {
      state.selecionado = numero;
      $$("#content .kcard").forEach((x) => x.classList.toggle("sel", Number(x.dataset.numero) === numero));
      API.pedido(numero).then((p) => { $("#painel-detalhe").innerHTML = detalheDark(p); bindDark(p); });
    };
    $$("#content .kcard").forEach((c) => c.addEventListener("click", () => selecionar(Number(c.dataset.numero))));
    $$("#content tbody tr[data-numero]").forEach((tr) => tr.addEventListener("click", () => selecionar(Number(tr.dataset.numero))));
    if (sel) bindDark(sel);
  }

  // ------------------------------------------------------------ entregas
  async function viewEntregas() {
    const [aguarda, entregue] = await Promise.all([
      API.pedidos({ status: "aguarda" }), API.pedidos({ status: "entregue" })]);
    const bloco = (t, itens) => `<p class="section-title">${t}</p>
      <div class="kanban" style="grid-auto-flow:row;grid-auto-columns:unset;grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
        ${itens.map(cardKanban).join("") || '<div class="empty">Nenhum pedido.</div>'}</div>`;
    $("#content").innerHTML = `<h1 class="page-title">Entregas</h1>`
      + bloco("Aguarda entrega", aguarda.itens) + bloco("Entregue", entregue.itens);
    $$("#content .kcard").forEach((c) => c.addEventListener("click", () => abrirDetalhe(Number(c.dataset.numero))));
  }

  // ------------------------------------------------------------ clientes
  async function viewClientes() {
    const { itens } = await API.clientes();
    $("#content").innerHTML = `<h1 class="page-title">Clientes</h1>
      <div class="client-grid">${itens.map((c) => `
        <div class="client-card" data-codigo="${esc(c.codigo)}">
          <div class="client-avatar">${AVATAR_SVG}</div>
          <div class="cc">${esc(c.codigo)}</div>
          <div class="cn">${esc(c.nome)}</div></div>`).join("")}</div>`;
    $$("#content .client-card").forEach((c) => c.addEventListener("click", () => abrirCliente(c.dataset.codigo)));
  }
  function abrirCliente(codigo) {
    API.cliente(codigo).then((c) => {
      let m = $("#modal-detalhe");
      if (!m) {
        m = document.createElement("div"); m.id = "modal-detalhe"; m.className = "modal";
        m.innerHTML = `<div class="modal-backdrop" data-close></div><div class="modal-card detail-panel" id="modal-det-card" style="max-width:380px"></div>`;
        document.body.appendChild(m);
        m.querySelector("[data-close]").addEventListener("click", () => m.classList.add("hidden"));
      }
      const ped = c.pedidos.map((p) => `<div class="dp-row"><span class="k">#${p.numero} · ${esc(p.tipo_tela)}</span>
        <span class="dp-status badge-${p.status}">${esc(p.status_label)}</span></div>`).join("") || '<div class="dp-empty">Sem pedidos.</div>';
      $("#modal-det-card").innerHTML = `
        <div class="dp-head dp-head--client">
          <span class="client-avatar client-avatar--sm">${AVATAR_SVG}</span>
          <span class="dp-client-id"><span class="dp-num">${esc(c.codigo)}</span><span class="dp-client-name">${esc(c.nome)}</span></span>
        </div>
        <div class="dp-body">
          <div class="dp-row"><span class="k">Telefone</span><span class="v">${esc(c.telefone || "—")}</span></div>
          <p class="section-title" style="margin:14px 0 8px">Pedidos</p>${ped}
        </div>`;
      m.classList.remove("hidden");
    });
  }

  // ------------------------------------------------------ relatórios/config
  async function viewRelatorios() {
    const { por_status, total } = await API.stats();
    const { itens: maquinas } = await API.maquinas();
    const ocup = maquinas.filter((m) => m.status === "ocupada").length;
    $("#content").innerHTML = `<h1 class="page-title">Relatórios</h1>
      <div class="cards-row">
        <div class="info-card"><div class="big">${total}</div><div class="cap">Pedidos no total</div></div>
        ${API.ordem.map((s) => `<div class="info-card"><div class="big" style="color:var(--st-${s})">${por_status[s] || 0}</div><div class="cap">${esc(CURTO[s])}</div></div>`).join("")}
        <div class="info-card"><div class="big">${ocup}/${maquinas.length}</div><div class="cap">Máquinas ocupadas</div></div>
      </div>`;
  }
  function viewConfig() {
    $("#content").innerHTML = `<h1 class="page-title">Configurações</h1>
      <div class="info-card" style="max-width:460px">
        <p class="field-label">Itens por página (Painel)</p>
        <select class="field" id="cfg-pagesize" style="width:120px;padding:9px">
          ${[4, 6, 8, 10].map((n) => `<option ${n === state.pageSize ? "selected" : ""}>${n}</option>`).join("")}
        </select>
        <p class="cap" style="color:var(--ink-soft);margin-top:14px;font-size:13px">
          Front-end Telas Rio Branco · dados servidos pela API sobre o seed do trb-database.</p>
      </div>`;
    $("#cfg-pagesize").addEventListener("change", (e) => {
      state.pageSize = Number(e.target.value); toast("Preferência salva.", "aviso");
    });
  }

  // ------------------------------------------------------------- form
  async function abrirForm(pedido = null) {
    $("#modal-detalhe")?.classList.add("hidden");
    $("#f-status").innerHTML = API.ordem.map((s) => `<option value="${s}">${esc(API.labels[s])}</option>`).join("");
    const { itens: maquinas } = await API.maquinas();
    $("#f-maquina").innerHTML = '<option value="">—</option>' +
      maquinas.map((m) => `<option value="${esc(m.nome)}">${esc(m.nome)}${m.status === "ocupada" ? " (ocupada)" : ""}</option>`).join("");
    const { itens: clientes } = await API.clientes();
    $("#clientes-list").innerHTML = clientes.map((c) => `<option value="${esc(c.codigo)}">${esc(c.nome)}</option>`).join("");

    if (pedido) {
      $("#form-titulo").textContent = "Editar pedido #" + pedido.numero;
      $("#f-numero").value = pedido.numero; $("#f-codigo").value = pedido.codigo_cliente;
      $("#f-nome").value = pedido.nome_cliente; $("#f-tipo").value = pedido.tipo_tela;
      $("#f-qtd").value = pedido.quantidade; $("#f-data-pedido").value = pedido.data_pedido || "";
      $("#f-data-entrega").value = pedido.data_entrega || ""; $("#f-status").value = pedido.status;
      $("#f-maquina").value = pedido.maquina || "";
    } else {
      $("#form-titulo").textContent = "Novo pedido"; $("#pedido-form").reset();
      $("#f-numero").value = ""; $("#f-qtd").value = "1";
      $("#f-data-pedido").value = new Date().toISOString().slice(0, 10); $("#f-status").value = "novo";
    }
    toggleMaquina(); abrir("#modal-form");
  }
  const toggleMaquina = () => { $("#f-maquina-wrap").style.display = $("#f-status").value === "producao" ? "" : "none"; };

  async function salvarForm() {
    const codigo = $("#f-codigo").value.trim(), tipo = $("#f-tipo").value.trim(), qtd = parseFloat($("#f-qtd").value);
    let ok = true;
    [["#f-codigo", codigo], ["#f-tipo", tipo]].forEach(([s, v]) => { $(s).classList.toggle("error", !v); if (!v) ok = false; });
    if (!(qtd > 0)) { $("#f-qtd").classList.add("error"); ok = false; } else $("#f-qtd").classList.remove("error");
    if (!ok) return toast("Preencha os campos obrigatórios.", "perigo");
    const dados = {
      codigo_cliente: codigo, nome_cliente: $("#f-nome").value.trim() || undefined, tipo_tela: tipo,
      quantidade: qtd, data_pedido: $("#f-data-pedido").value || undefined,
      data_entrega: $("#f-data-entrega").value || undefined, status: $("#f-status").value,
      maquina: $("#f-status").value === "producao" ? ($("#f-maquina").value || null) : null,
    };
    try {
      const numero = $("#f-numero").value;
      if (numero) { await API.editarPedido(Number(numero), dados); toast("Pedido #" + numero + " atualizado!"); }
      else { const p = await API.criarPedido(dados); toast("Pedido #" + p.numero + " criado!"); state.selecionado = p.numero; }
      fechar("#modal-form"); render();
    } catch (e) { toast(e.message || "Erro ao salvar.", "perigo"); }
  }

  // ------------------------------------------------------------- filtros
  function montarFiltros() {
    $("#filtro-tipos").innerHTML = TIPOS.map((t) =>
      `<label class="check"><input type="checkbox" value="${esc(t)}" ${state.filtroTipos.has(t) ? "checked" : ""}><span>${esc(t)}</span></label>`).join("");
    $$("#filtro-tipos input").forEach((c) => c.addEventListener("change", () => {
      c.checked ? state.filtroTipos.add(c.value) : state.filtroTipos.delete(c.value);
    }));
    $("#filtro-qtd").value = state.filtros.qtd || "";
    $("#filtro-inicio").value = state.filtros.inicio || "";
    $("#filtro-entrega").value = state.filtros.entrega || "";
  }
  function aplicarFiltros() {
    state.filtros.tipo_tela = "";
    state.filtros.qtd = $("#filtro-qtd").value || null;
    state.filtros.inicio = $("#filtro-inicio").value || "";
    state.filtros.entrega = $("#filtro-entrega").value || "";
    state.page = 1; fechar("#modal-filtros"); toast("Filtros aplicados.", "aviso"); render();
  }
  function limparFiltros() {
    state.filtroTipos.clear(); state.filtros.tipo_tela = ""; state.filtros.qtd = null;
    state.filtros.inicio = ""; state.filtros.entrega = ""; montarFiltros();
  }

  // -------------------------------------------------------------- modais
  const abrir = (s) => $(s).classList.remove("hidden");
  const fechar = (s) => $(s).classList.add("hidden");

  // ------------------------------------------------------------- router
  const VIEWS = { painel: viewPainel, pedidos: viewPedidos, producao: viewProducao,
                  entregas: viewEntregas, clientes: viewClientes, relatorios: viewRelatorios, config: viewConfig };
  function render() { VIEWS[state.view](); }
  function irPara(view) {
    state.view = view; state.page = 1;
    $$(".nav-item[data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    fecharSidebar(); render();
  }

  // ----------------------------------------------------------- sidebar mobile
  const fecharSidebar = () => { $("#sidebar").classList.remove("open"); $("#sidebar-backdrop").classList.remove("show"); };

  // --------------------------------------------------------------- init
  function bind() {
    $("#login-btn").addEventListener("click", () => {
      $("#login").classList.add("hidden"); $("#app").classList.remove("hidden"); irPara("painel");
    });
    $("#logout-btn").addEventListener("click", () => {
      $("#app").classList.add("hidden"); $("#login").classList.remove("hidden");
    });
    $$(".nav-item[data-view]").forEach((b) => b.addEventListener("click", () => irPara(b.dataset.view)));
    $("#hamburger").addEventListener("click", () => {
      $("#sidebar").classList.toggle("open"); $("#sidebar-backdrop").classList.toggle("show");
    });
    $("#sidebar-backdrop").addEventListener("click", fecharSidebar);

    $$("[data-close]").forEach((el) => el.addEventListener("click", () => el.closest(".modal").classList.add("hidden")));
    $("#form-salvar").addEventListener("click", salvarForm);
    $("#f-status").addEventListener("change", toggleMaquina);
    $("#f-codigo").addEventListener("change", async () => {
      if ($("#f-nome").value) return;
      try { const { itens } = await API.clientes(); const c = itens.find((x) => x.codigo === $("#f-codigo").value.trim()); if (c) $("#f-nome").value = c.nome; } catch (_) {}
    });
    $("#filtro-aplicar").addEventListener("click", aplicarFiltros);
    $("#filtro-limpar").addEventListener("click", limparFiltros);
  }

  async function start() {
    bind();
    if (!(await API.isOnline())) console.info("TRB: API indisponível — modo offline (seed local).");
  }
  document.addEventListener("DOMContentLoaded", start);
})();
