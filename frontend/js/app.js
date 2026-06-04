/* App TRB — Painel de Pedidos (SPA vanilla) */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const TIPOS = ["Tela 3x2", "Tela 4x2", "Tela 4x3", "Tela 5x3", "Tela 6x3", "Tela 6x4", "Tela 8x5"];

  const state = {
    view: "pedidos",
    mode: "tabela",
    page: 1,
    pageSize: 4, // o PDF mostra "1 de 2" com 4 linhas por página
    filtros: { q: "", status: null, tipo_tela: "", qtd: null, inicio: "", entrega: "" },
    filtroTipos: new Set(),
  };

  // ------------------------------------------------------------ helpers
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtData = (iso) => {
    if (!iso) return "—";
    const [a, m, d] = iso.split("-");
    return `${d}/${m}/${a}`;
  };
  const fmtQtd = (q) => Number(q).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const badge = (status, label) =>
    `<span class="badge badge-${status}">${esc(label || API.labels[status] || status)}</span>`;

  function toast(msg, tipo = "sucesso") {
    const t = document.createElement("div");
    t.className = "toast " + tipo;
    t.textContent = msg;
    $("#toasts").appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 250); }, 2600);
  }

  // ----------------------------------------------------------- contadores
  async function renderStats() {
    const { por_status, ordem, labels } = await API.stats();
    $("#stats").innerHTML = ordem.map((s) => `
      <button class="stat ${state.filtros.status === s ? "active" : ""}" data-status="${s}">
        <span class="num">${String(por_status[s] || 0).padStart(2, "0")}</span>
        <span class="lbl">${esc(labels[s])}</span>
      </button>`).join("");
    $$("#stats .stat").forEach((b) => b.addEventListener("click", () => {
      state.filtros.status = state.filtros.status === b.dataset.status ? null : b.dataset.status;
      state.page = 1;
      renderStats();
      renderPedidos();
    }));
  }

  // ------------------------------------------------------------- pedidos
  function buildParams(extra = {}) {
    const f = state.filtros;
    return {
      q: f.q || undefined,
      status: f.status || undefined,
      tipo_tela: f.tipo_tela || undefined,
      ...extra,
    };
  }

  function aplicaFiltrosLocais(itens) {
    const f = state.filtros;
    return itens.filter((p) => {
      if (f.qtd != null && f.qtd !== "" && Number(p.quantidade) < Number(f.qtd)) return false;
      if (f.inicio && p.data_pedido && p.data_pedido < f.inicio) return false;
      if (f.entrega && p.data_entrega && p.data_entrega > f.entrega) return false;
      return true;
    });
  }

  async function renderPedidos() {
    $("#toolbar").classList.remove("hidden");
    $("#view-title").textContent = "Painel de Pedidos";

    if (state.mode === "kanban") return renderKanban();

    const todos = aplicaFiltrosLocais((await API.pedidos(buildParams())).itens);
    const total = todos.length;
    const totalPaginas = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPaginas) state.page = totalPaginas;
    const ini = (state.page - 1) * state.pageSize;
    const itens = todos.slice(ini, ini + state.pageSize);

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
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Nº do pedido</th><th>Código do cliente</th><th>Tipo de tela</th>
            <th>Data do pedido</th><th>Data da entrega</th><th>Status</th>
          </tr></thead>
          <tbody>${linhas}</tbody>
        </table>
        <div class="pagination">
          <button id="pg-prev" ${state.page <= 1 ? "disabled" : ""}>Voltar</button>
          <span>${state.page} de ${totalPaginas}</span>
          <button id="pg-next" ${state.page >= totalPaginas ? "disabled" : ""}>Próximo</button>
        </div>
      </div>`;

    $$("#content tbody tr[data-numero]").forEach((tr) =>
      tr.addEventListener("click", () => abrirDetalhe(Number(tr.dataset.numero))));
    $("#pg-prev")?.addEventListener("click", () => { state.page--; renderPedidos(); });
    $("#pg-next")?.addEventListener("click", () => { state.page++; renderPedidos(); });
  }

  async function renderKanban() {
    const itens = aplicaFiltrosLocais((await API.pedidos(buildParams())).itens);
    const cols = API.ordem;
    $("#content").innerHTML = `<div class="kanban">${cols.map((s) => {
      const doStatus = itens.filter((p) => p.status === s);
      return `<div class="kcol" data-status="${s}">
        <div class="kcol-head"><span>${esc(API.labels[s])}</span><span class="count">${doStatus.length}</span></div>
        ${doStatus.map(cardKanban).join("") || '<div class="empty" style="padding:18px;font-size:12px">—</div>'}
      </div>`;
    }).join("")}</div>`;
    $$("#content .kcard").forEach((c) =>
      c.addEventListener("click", () => abrirDetalhe(Number(c.dataset.numero))));
  }

  const cardKanban = (p) => `
    <div class="kcard" data-status="${p.status}" data-numero="${p.numero}">
      <div class="kp">PEDIDO</div>
      <div class="kn">${p.numero}</div>
      <div class="kc">${esc(p.nome_cliente)}</div>
      <div class="kmeta"><span>${esc(p.tipo_tela)}</span><span>${fmtData(p.data_entrega)}</span></div>
    </div>`;

  // ------------------------------------------------------------ produção
  async function renderProducao() {
    $("#toolbar").classList.add("hidden");
    $("#view-title").textContent = "Produção";
    const [{ itens: maquinas }, prod] = await Promise.all([
      API.maquinas(),
      API.pedidos({ status: "producao" }),
    ]);
    const novos = (await API.pedidos({ status: "novo" })).itens;
    const fila = [...novos, ...prod.itens.filter((p) => !p.maquina)];

    $("#content").innerHTML = `
      <div class="prod-grid">
        <div>
          <p class="section-title">Em produção</p>
          <div class="kanban" style="grid-auto-columns:minmax(200px,1fr)">
            <div class="kcol" data-status="producao">
              <div class="kcol-head"><span>Em produção</span><span class="count">${prod.itens.length}</span></div>
              ${prod.itens.map(cardKanban).join("") || '<div class="empty">—</div>'}
            </div>
          </div>
        </div>
        <div>
          <p class="section-title">Máquinas</p>
          <div class="maquinas">
            ${maquinas.map((m) => `
              <div class="maquina ${m.status}">
                <h4>${esc(m.nome)}</h4>
                <div class="mst">${m.status === "ocupada" ? "Ocupada" : "Livre"}</div>
                <div class="mp">${m.pedido_atual ? "Pedido #" + m.pedido_atual : "Sem pedido"}</div>
              </div>`).join("")}
          </div>
          <p class="section-title">Fila</p>
          <div class="fila">
            <div class="fila-head">Aguardando produção</div>
            ${fila.map((p) => `
              <div class="fila-item" data-numero="${p.numero}">
                <span><strong>${p.numero}</strong> · ${esc(p.codigo_cliente)}</span>
                <span>${esc(p.tipo_tela)}</span>
              </div>`).join("") || '<div class="fila-item">Fila vazia</div>'}
          </div>
        </div>
      </div>`;
    $$("#content [data-numero]").forEach((el) =>
      el.addEventListener("click", () => abrirDetalhe(Number(el.dataset.numero))));
  }

  // ------------------------------------------------------------ entregas
  async function renderEntregas() {
    $("#toolbar").classList.add("hidden");
    $("#view-title").textContent = "Entregas";
    const [aguarda, entregue] = await Promise.all([
      API.pedidos({ status: "aguarda" }),
      API.pedidos({ status: "entregue" }),
    ]);
    const bloco = (titulo, itens) => `
      <p class="section-title">${titulo}</p>
      <div class="kanban" style="grid-auto-flow:row;grid-auto-columns:unset;grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
        ${itens.map(cardKanban).join("") || '<div class="empty">Nenhum pedido.</div>'}
      </div>`;
    $("#content").innerHTML =
      bloco("Aguarda entrega", aguarda.itens) + bloco("Entregue", entregue.itens);
    $$("#content .kcard").forEach((c) =>
      c.addEventListener("click", () => abrirDetalhe(Number(c.dataset.numero))));
  }

  // ------------------------------------------------------------ clientes
  async function renderClientes() {
    $("#toolbar").classList.add("hidden");
    $("#view-title").textContent = "Clientes";
    const { itens } = await API.clientes();
    $("#content").innerHTML = `<div class="client-grid">${itens.map((c) => `
      <div class="client-card" data-codigo="${esc(c.codigo)}">
        <div class="client-avatar">${esc(c.nome.slice(0, 2).toUpperCase())}</div>
        <div class="cn">${esc(c.nome)}</div>
        <div class="cc">${esc(c.codigo)}</div>
        <div class="cp">${c.total_pedidos} pedido${c.total_pedidos === 1 ? "" : "s"}</div>
      </div>`).join("")}</div>`;
    $$("#content .client-card").forEach((c) =>
      c.addEventListener("click", () => abrirCliente(c.dataset.codigo)));
  }

  async function abrirCliente(codigo) {
    const c = await API.cliente(codigo);
    const linhas = c.pedidos.map((p) => `
      <div class="detail-row">
        <span class="k">#${p.numero} · ${esc(p.tipo_tela)}</span>
        <span class="v">${badge(p.status, p.status_label)}</span>
      </div>`).join("") || '<p class="empty">Sem pedidos.</p>';
    $("#det-titulo").textContent = c.nome;
    $("#det-body").innerHTML = `
      <div class="detail-head">
        <div><div class="dn">CÓDIGO</div><div class="dnum" style="font-size:18px">${esc(c.codigo)}</div></div>
      </div>
      <div class="detail-list">
        <div class="detail-row"><span class="k">Telefone</span><span class="v">${esc(c.telefone || "—")}</span></div>
        <div class="detail-row"><span class="k">E-mail</span><span class="v">${esc(c.email || "—")}</span></div>
      </div>
      <p class="section-title" style="margin-left:0">Pedidos</p>
      <div class="detail-list">${linhas}</div>`;
    $("#det-editar").classList.add("hidden");
    abrirModal("#modal-detalhe");
  }

  // ------------------------------------------------------------- detalhe
  let pedidoAtual = null;
  async function abrirDetalhe(numero) {
    const p = await API.pedido(numero);
    pedidoAtual = p;
    $("#det-titulo").textContent = "Pedido";
    $("#det-editar").classList.remove("hidden");
    $("#det-body").innerHTML = `
      <div class="detail-head">
        <div><div class="dn">Nº PEDIDO</div><div class="dnum">${p.numero}</div></div>
        ${badge(p.status, p.status_label)}
      </div>
      <div class="detail-list">
        <div class="detail-row"><span class="k">Código do cliente</span><span class="v">${esc(p.codigo_cliente)}</span></div>
        <div class="detail-row"><span class="k">Nome do cliente</span><span class="v">${esc(p.nome_cliente)}</span></div>
        <div class="detail-row"><span class="k">Tipo de tela</span><span class="v">${esc(p.tipo_tela)}</span></div>
        <div class="detail-row"><span class="k">Quantidade</span><span class="v">${fmtQtd(p.quantidade)}</span></div>
        <div class="detail-row"><span class="k">Data do pedido</span><span class="v">${fmtData(p.data_pedido)}</span></div>
        <div class="detail-row"><span class="k">Data da entrega</span><span class="v">${fmtData(p.data_entrega)}</span></div>
        <div class="detail-row"><span class="k">Status</span><span class="v">${esc(p.status_label)}</span></div>
        ${p.maquina ? `<div class="detail-row"><span class="k">Máquina</span><span class="v">${esc(p.maquina)}</span></div>` : ""}
      </div>`;
    abrirModal("#modal-detalhe");
  }

  // ------------------------------------------------------------- form
  async function abrirForm(pedido = null) {
    fecharModal("#modal-detalhe");
    const statuses = API.ordem;
    $("#f-status").innerHTML = statuses.map((s) =>
      `<option value="${s}">${esc(API.labels[s])}</option>`).join("");
    const { itens: maquinas } = await API.maquinas();
    $("#f-maquina").innerHTML = '<option value="">—</option>' +
      maquinas.map((m) => `<option value="${esc(m.nome)}">${esc(m.nome)}${m.status === "ocupada" ? " (ocupada)" : ""}</option>`).join("");
    const { itens: clientes } = await API.clientes();
    $("#clientes-list").innerHTML = clientes.map((c) =>
      `<option value="${esc(c.codigo)}">${esc(c.nome)}</option>`).join("");

    if (pedido) {
      $("#form-titulo").textContent = "Editar pedido #" + pedido.numero;
      $("#f-numero").value = pedido.numero;
      $("#f-codigo").value = pedido.codigo_cliente;
      $("#f-nome").value = pedido.nome_cliente;
      $("#f-tipo").value = pedido.tipo_tela;
      $("#f-qtd").value = pedido.quantidade;
      $("#f-data-pedido").value = pedido.data_pedido || "";
      $("#f-data-entrega").value = pedido.data_entrega || "";
      $("#f-status").value = pedido.status;
      $("#f-maquina").value = pedido.maquina || "";
    } else {
      $("#form-titulo").textContent = "Novo pedido";
      $("#pedido-form").reset();
      $("#f-numero").value = "";
      $("#f-qtd").value = "1";
      $("#f-data-pedido").value = new Date().toISOString().slice(0, 10);
      $("#f-status").value = "novo";
    }
    toggleMaquina();
    abrirModal("#modal-form");
  }

  function toggleMaquina() {
    $("#f-maquina-wrap").style.display = $("#f-status").value === "producao" ? "" : "none";
  }

  async function salvarForm() {
    const codigo = $("#f-codigo").value.trim();
    const tipo = $("#f-tipo").value.trim();
    const qtd = parseFloat($("#f-qtd").value);
    let ok = true;
    [["#f-codigo", codigo], ["#f-tipo", tipo]].forEach(([sel, val]) => {
      $(sel).classList.toggle("error", !val); if (!val) ok = false;
    });
    if (!(qtd > 0)) { $("#f-qtd").classList.add("error"); ok = false; } else $("#f-qtd").classList.remove("error");
    if (!ok) return toast("Preencha os campos obrigatórios.", "perigo");

    const dados = {
      codigo_cliente: codigo,
      nome_cliente: $("#f-nome").value.trim() || undefined,
      tipo_tela: tipo,
      quantidade: qtd,
      data_pedido: $("#f-data-pedido").value || undefined,
      data_entrega: $("#f-data-entrega").value || undefined,
      status: $("#f-status").value,
      maquina: $("#f-status").value === "producao" ? ($("#f-maquina").value || null) : null,
    };
    try {
      const numero = $("#f-numero").value;
      if (numero) {
        await API.editarPedido(Number(numero), dados);
        toast("Pedido #" + numero + " atualizado!", "sucesso");
      } else {
        const p = await API.criarPedido(dados);
        toast("Pedido #" + p.numero + " criado!", "sucesso");
      }
      fecharModal("#modal-form");
      refresh();
    } catch (e) {
      toast(e.message || "Erro ao salvar.", "perigo");
    }
  }

  // ------------------------------------------------------------- filtros
  function montarFiltros() {
    $("#filtro-tipos").innerHTML = TIPOS.map((t) =>
      `<button type="button" class="chip ${state.filtroTipos.has(t) ? "active" : ""}" data-tipo="${esc(t)}">${esc(t)}</button>`).join("");
    $$("#filtro-tipos .chip").forEach((c) => c.addEventListener("click", () => {
      const t = c.dataset.tipo;
      state.filtroTipos.has(t) ? state.filtroTipos.delete(t) : state.filtroTipos.add(t);
      c.classList.toggle("active");
    }));
    $("#filtro-qtd").value = state.filtros.qtd || "";
    $("#filtro-inicio").value = state.filtros.inicio || "";
    $("#filtro-entrega").value = state.filtros.entrega || "";
  }

  function aplicarFiltros() {
    state.filtros.tipo_tela = state.filtroTipos.size === 1 ? [...state.filtroTipos][0] : "";
    state.filtros.qtd = $("#filtro-qtd").value || null;
    state.filtros.inicio = $("#filtro-inicio").value || "";
    state.filtros.entrega = $("#filtro-entrega").value || "";
    state.page = 1;
    fecharModal("#modal-filtros");
    toast("Filtros aplicados.", "aviso");
    renderPedidos();
  }

  function limparFiltros() {
    state.filtroTipos.clear();
    state.filtros.tipo_tela = ""; state.filtros.qtd = null;
    state.filtros.inicio = ""; state.filtros.entrega = "";
    montarFiltros();
  }

  // -------------------------------------------------------------- modais
  function abrirModal(sel) { $(sel).classList.remove("hidden"); }
  function fecharModal(sel) { $(sel).classList.add("hidden"); }

  // ------------------------------------------------------------- router
  function refresh() {
    renderStats();
    ({ pedidos: renderPedidos, producao: renderProducao,
       entregas: renderEntregas, clientes: renderClientes }[state.view])();
  }

  function irPara(view) {
    state.view = view;
    state.page = 1;
    $$(".bottomnav button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    $("#stats").style.display = view === "pedidos" ? "" : "none";
    refresh();
  }

  // --------------------------------------------------------------- init
  function bind() {
    // login
    $("#login-btn").addEventListener("click", () => {
      $("#login").classList.add("hidden");
      $("#app").classList.remove("hidden");
      irPara("pedidos");
    });
    $("#logout-btn").addEventListener("click", () => {
      $("#app").classList.add("hidden");
      $("#login").classList.remove("hidden");
    });

    // nav
    $$(".bottomnav button").forEach((b) =>
      b.addEventListener("click", () => irPara(b.dataset.view)));

    // toolbar
    let tmr;
    $("#search").addEventListener("input", (e) => {
      clearTimeout(tmr);
      tmr = setTimeout(() => { state.filtros.q = e.target.value.trim(); state.page = 1; renderPedidos(); }, 220);
    });
    $$("#view-toggle button").forEach((b) => b.addEventListener("click", () => {
      $$("#view-toggle button").forEach((x) => x.classList.toggle("active", x === b));
      state.mode = b.dataset.mode; renderPedidos();
    }));
    $("#novo-pedido").addEventListener("click", () => abrirForm());
    $("#open-filters").addEventListener("click", () => { montarFiltros(); abrirModal("#modal-filtros"); });

    // modais — fechar
    $$("[data-close]").forEach((el) => el.addEventListener("click", () =>
      el.closest(".modal").classList.add("hidden")));

    // detalhe / form
    $("#det-editar").addEventListener("click", () => pedidoAtual && abrirForm(pedidoAtual));
    $("#form-salvar").addEventListener("click", salvarForm);
    $("#f-status").addEventListener("change", toggleMaquina);
    $("#f-codigo").addEventListener("change", async () => {
      if ($("#f-nome").value) return;
      try {
        const { itens } = await API.clientes();
        const c = itens.find((x) => x.codigo === $("#f-codigo").value.trim());
        if (c) $("#f-nome").value = c.nome;
      } catch (_) {}
    });

    // filtros
    $("#filtro-aplicar").addEventListener("click", aplicarFiltros);
    $("#filtro-limpar").addEventListener("click", limparFiltros);
  }

  async function start() {
    bind();
    if (!(await API.isOnline()))
      console.info("TRB: API indisponível — rodando em modo offline (seed local).");
  }

  document.addEventListener("DOMContentLoaded", start);
})();
