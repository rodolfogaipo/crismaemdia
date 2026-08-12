/* ============================================================
   CRISMA EM DIA — aplicativo (100% offline)
   ============================================================ */
(function(){
  DB.load();

  const state = {
    view: "inicio",
    encontroId: null,
    encontroTab: "roteiro",
    roteiroMode: "leitura",
    crismandoOrd: "nome",
    notaEditId: null,
    chamadaEncontroId: null
  };

  const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  const DIAS_SEMANA = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
  const TIPOS_BLOCO = {titulo:"Título", subtitulo:"Subtítulo", topico:"Tópico", destaque:"Destaque", texto:"Texto"};

  // ---------------- helpers ----------------
  function $(sel){ return document.querySelector(sel); }
  function $all(sel){ return document.querySelectorAll(sel); }
  function esc(s){ return (s||"").toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function nl2br(s){ return esc(s).replace(/\n/g,"<br>"); }

  function fmtDataCurta(iso){
    if(!iso) return {dia:"--", mes:"--"};
    const [y,m,d] = iso.split("-").map(Number);
    return { dia: String(d).padStart(2,"0"), mes: MESES[m-1] };
  }
  function fmtDataLonga(iso){
    if(!iso) return "";
    const [y,m,d] = iso.split("-").map(Number);
    const dt = new Date(y, m-1, d);
    return `${DIAS_SEMANA[dt.getDay()]}, ${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${y}`;
  }
  function fmtDataBR(iso){
    if(!iso) return "";
    const [y,m,d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }
  function diasAte(iso){
    const hoje = new Date(todayISO()+"T00:00:00");
    const alvo = new Date(iso+"T00:00:00");
    return Math.round((alvo-hoje)/86400000);
  }
  function iniciais(nome){
    const p = nome.trim().split(/\s+/);
    return ((p[0]?.[0]||"") + (p[1]?.[0]||"")).toUpperCase() || "?";
  }
  function toast(msg){
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._tm);
    toast._tm = setTimeout(()=>t.classList.remove("show"), 2200);
  }
  function highlight(text, q){
    if(!q) return esc(text);
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if(idx<0) return esc(text);
    return esc(text.slice(0,idx)) + "<mark>" + esc(text.slice(idx,idx+q.length)) + "</mark>" + esc(text.slice(idx+q.length));
  }

  // ---------------- sheet / modal ----------------
  function openSheet(html){
    $("#sheet").innerHTML = `<div class="sheet-handle"></div>` + html;
    $("#overlay").classList.add("show");
  }
  function closeSheet(){
    $("#overlay").classList.remove("show");
    setTimeout(()=>{ $("#sheet").innerHTML = ""; }, 150);
    if(state.chamadaEncontroId){
      state.chamadaEncontroId = null;
      if(state.view==="crismandos") renderCrismandos();
      if(state.view==="inicio") renderInicio();
      if(state.view==="encontros") renderEncontros();
    }
  }

  // ---------------- topbar / nav ----------------
  const MAIN_VIEWS = ["inicio","encontros","crismandos","dinamicas","mais"];

  function setTopbar({title, sub, showBack, backTo, showAction, onAction}={}){
    const isMain = !title;
    $("#brandBlock").style.display = isMain ? "flex" : "none";
    $("#titleBlock").style.display = isMain ? "none" : "flex";
    $("#backBtn").style.display = showBack ? "flex" : "none";
    $("#topActionBtn").style.display = showAction ? "flex" : "none";
    if(!isMain){
      $("#titleBlockT").textContent = title;
      $("#titleBlockS").textContent = sub || "";
    }
    $("#backBtn").onclick = ()=> switchView(backTo || "mais");
    $("#topActionBtn").onclick = onAction || null;
  }

  function switchView(view, opts={}){
    state.view = view;
    Object.assign(state, opts);
    $all(".view").forEach(v=>v.classList.remove("active"));
    $("#view-"+view).classList.add("active");
    $all(".nav-item").forEach(n=>n.classList.toggle("active", n.dataset.view===view));
    $("#fabBtn").style.display = ["encontros","crismandos","dinamicas"].includes(view) ? "flex" : "none";
    window.scrollTo(0,0);

    if(view==="inicio") { setTopbar(); renderInicio(); }
    else if(view==="encontros"){ setTopbar(); renderEncontros(); }
    else if(view==="crismandos"){ setTopbar(); renderCrismandos(); }
    else if(view==="dinamicas"){ setTopbar(); renderDinamicas(); }
    else if(view==="mais"){ setTopbar(); }
    else if(view==="encontro-detalhe"){
      const e = DB.getEncontro(state.encontroId);
      setTopbar({
        title: e ? (e.tema || "Encontro") : "Encontro",
        sub: e ? (e.temaDoMes ? `${e.temaDoMes} · ${fmtDataBR(e.data)}` : fmtDataBR(e.data)) : "",
        showBack:true, backTo:"encontros",
        showAction:true, onAction: ()=>openMenuEncontro(state.encontroId)
      });
      renderEncontroDetalhe();
    }
    else if(view==="cronograma"){ setTopbar({title:"Cronograma da Crisma", showBack:true, backTo:"mais"}); renderCronograma(); }
    else if(view==="busca-temas"){ setTopbar({title:"Buscar temas", showBack:true, backTo:"mais"}); renderBuscaTemas(); }
    else if(view==="anotacoes-gerais"){ setTopbar({title:"Anotações gerais", showBack:true, backTo:"mais"}); renderAnotacoesGerais(); }
    else if(view==="relatorios"){ setTopbar({title:"Relatório de frequência", showBack:true, backTo:"mais"}); renderRelatorios(); }
    else if(view==="config"){ setTopbar({title:"Configurações", showBack:true, backTo:"mais"}); renderConfig(); }
    else if(view==="backup"){ setTopbar({title:"Backup dos dados", showBack:true, backTo:"mais"}); renderBackup(); }
  }

  // ================================================================
  // INÍCIO
  // ================================================================
  function renderInicio(){
    const cfg = DB.data.config;
    $("#homeGroupName").textContent = cfg.grupoNome || "Turma da Crisma";
    $("#homeSubtitle").textContent = cfg.paroquia ? `${cfg.paroquia}` : "Que o Espírito Santo guie cada encontro.";
    $("#statCrismandos").textContent = DB.data.crismandos.length;
    $("#statEncontros").textContent = DB.data.encontros.length;
    $("#statFrequencia").textContent = DB.frequenciaGeralMedia()+"%";

    // avisos
    const hoje = todayISO();
    const limite = cfg.diasAviso || 7;
    const proximos = DB.data.encontros
      .filter(e=> e.data >= hoje && diasAte(e.data) <= limite)
      .sort((a,b)=> a.data > b.data ? 1 : -1);
    const box = $("#avisosBox");
    if(proximos.length){
      box.innerHTML = `<div class="section-title"><span>Avisos</span><span class="line"></span></div>` +
        proximos.map(e=>{
          const dd = diasAte(e.data);
          const txt = dd===0 ? "É hoje!" : dd===1 ? "É amanhã" : `Em ${dd} dias`;
          return `<div class="aviso" data-goto-encontro="${e.id}">
            <span class="ic">🔔</span>
            <div>
              ${e.temaDoMes ? `<div class="small" style="color:#8a6a1c;font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.03em;">${esc(e.temaDoMes)}</div>` : ""}
              <div class="t1">${esc(e.tema || "Encontro sem tema definido")}</div>
              <div class="t2">${fmtDataLonga(e.data)}</div>
              <div class="countdown">${txt}</div>
            </div>
          </div>`;
        }).join("");
    } else {
      box.innerHTML = "";
    }

    // próximo encontro
    const prox = DB.proximoEncontro();
    const pbox = $("#proximoEncontroBox");
    if(prox){
      pbox.innerHTML = `<div class="item-row" data-goto-encontro="${prox.id}">
        <div class="avatar">📅</div>
        <div class="main">
          ${prox.temaDoMes ? `<div class="small" style="color:var(--gold-600);font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.03em;">${esc(prox.temaDoMes)}</div>` : ""}
          <div class="t1">${esc(prox.tema || "Encontro sem tema definido")}</div>
          <div class="t2">${fmtDataLonga(prox.data)}</div>
        </div>
        <div class="chev">›</div>
      </div>`;
    } else {
      pbox.innerHTML = `<div class="empty-state card">
        <span class="ic">📭</span>
        <h4>Nenhum encontro agendado</h4>
        <p>Toque em "+ Encontro" para planejar o próximo.</p>
      </div>`;
    }
  }

  // ================================================================
  // ENCONTROS (lista)
  // ================================================================
  function renderEncontros(){
    const q = ($("#buscaEncontros").value||"").toLowerCase().trim();
    const hoje = todayISO();
    let list = DB.data.encontros;
    if(q){
      list = list.filter(e => (e.tema||"").toLowerCase().includes(q) || fmtDataBR(e.data).includes(q));
    }
    const futuros = list.filter(e=>e.data>=hoje).sort((a,b)=> a.data>b.data?1:-1);
    const passados = list.filter(e=>e.data<hoje).sort((a,b)=> a.data<b.data?1:-1);

    function card(e, isFuturo){
      const dd = fmtDataCurta(e.data);
      let sub = "";
      if(isFuturo){
        const dias = diasAte(e.data);
        sub = dias===0?"Hoje": dias===1?"Amanhã": `Em ${dias} dias`;
      } else {
        const crismandos = DB.data.crismandos;
        let p=0,f=0;
        crismandos.forEach(c=>{ const st=e.presencas?.[c.id]; if(st==="presente")p++; else if(st==="falta")f++; });
        sub = (p+f)>0 ? `${p} presentes · ${f} faltas` : "Presença não registrada";
      }
      return `<div class="item-row" data-goto-encontro="${e.id}">
        <div class="avatar" style="flex-direction:column; line-height:1.1; ${isFuturo?'':'background:var(--cream-100);color:var(--ink-soft);'}">
          <span style="font-size:14px;font-weight:800;">${dd.dia}</span><span style="font-size:9px;text-transform:uppercase;">${dd.mes}</span>
        </div>
        <div class="main">
          ${e.temaDoMes ? `<div class="small" style="color:var(--gold-600);font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.03em;">${esc(e.temaDoMes)}</div>` : ""}
          <div class="t1">${esc(e.tema || "Encontro sem tema definido")}</div>
          <div class="t2">${sub}</div>
        </div>
        <div class="chev">›</div>
      </div>`;
    }

    let html = "";
    if(futuros.length){
      html += `<div class="section-title"><span>Próximos</span><span class="line"></span></div>`;
      html += futuros.map(e=>card(e,true)).join("");
    }
    if(passados.length){
      html += `<div class="section-title"><span>Realizados</span><span class="line"></span></div>`;
      html += passados.map(e=>card(e,false)).join("");
    }
    if(!futuros.length && !passados.length){
      html = `<div class="empty-state"><span class="ic">📅</span><h4>Nenhum encontro encontrado</h4><p>Toque no botão + para cadastrar o primeiro encontro.</p></div>`;
    }
    $("#encontrosLista").innerHTML = html;
  }

  function sheetEncontroForm(existing){
    const isEdit = !!existing;
    const temaMesSugerido = existing ? existing.temaDoMes : DB.ultimoTemaDoMes();
    const cronogramaOpcoes = [];
    DB.data.cronograma.forEach(m=>{
      m.semanas.forEach(s=>{
        cronogramaOpcoes.push({mes:m.mes, temaDoMes:m.temaDoMes, numero:s.numero, tema:s.tema});
      });
    });
    openSheet(`
      <div class="sheet-head"><h3>${isEdit?"Editar":"Novo"} encontro</h3><button class="x" data-close-sheet>✕</button></div>
      <form id="formEncontro">
        <div class="field"><label>Data do encontro</label><input type="date" name="data" required value="${existing?existing.data:todayISO()}"></div>
        ${cronogramaOpcoes.length ? `
        <div class="field">
          <label>Puxar do cronograma (opcional)</label>
          <div class="chip-group">
            ${cronogramaOpcoes.map(o=>`<button type="button" class="chip" data-action="usar-tema-cronograma" data-temames="${encodeURIComponent(o.temaDoMes||"")}" data-tema="${encodeURIComponent(o.tema||"")}">${esc(o.mes)} · ${o.numero}ª sem.</button>`).join("")}
          </div>
        </div>` : ""}
        <div class="field">
          <label>Tema do mês (opcional)</label>
          <input type="text" name="temaDoMes" placeholder="Ex.: Mês das Vocações" value="${esc(temaMesSugerido||"")}">
          <div class="hint">O tema que a Igreja celebra no mês — costuma se repetir nos encontros do período.</div>
        </div>
        <div class="field"><label>Título do encontro (tema da semana)</label><input type="text" name="tema" placeholder="Ex.: Dons do Espírito Santo" value="${existing?esc(existing.tema):""}"></div>
        <div class="field"><label>Local (opcional)</label><input type="text" name="local" placeholder="Ex.: Salão paroquial" value="${existing?esc(existing.local||""):""}"></div>
        <div class="sheet-actions">
          <button type="button" class="btn btn-ghost" data-close-sheet>Cancelar</button>
          <button type="submit" class="btn btn-primary">${isEdit?"Salvar":"Criar encontro"}</button>
        </div>
      </form>
    `);
    $("#formEncontro").onsubmit = (ev)=>{
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const obj = { data: fd.get("data"), tema: fd.get("tema"), temaDoMes: fd.get("temaDoMes"), local: fd.get("local") };
      if(isEdit){
        DB.updateEncontro(existing.id, obj);
        toast("Encontro atualizado");
      } else {
        const e = DB.addEncontro(obj);
        toast("Encontro criado");
        closeSheet();
        switchView("encontro-detalhe", {encontroId:e.id, encontroTab:"roteiro"});
        return;
      }
      closeSheet();
      if(state.view==="encontro-detalhe") switchView("encontro-detalhe", {encontroId:existing.id});
      else renderEncontros();
    };
  }

  function sheetCopiarRoteiro(){
    const atual = DB.getEncontro(state.encontroId);
    const opcoes = DB.data.encontros.filter(e=>e.id!==atual.id && e.roteiro.length>0)
      .sort((a,b)=> a.data<b.data?1:-1);
    if(!opcoes.length){ toast("Nenhum outro encontro tem roteiro cadastrado ainda"); return; }
    openSheet(`
      <div class="sheet-head"><h3>Copiar roteiro de...</h3><button class="x" data-close-sheet>✕</button></div>
      <p class="small muted mb-12">Útil para reaproveitar o mesmo roteiro em outra turma ou data.</p>
      ${opcoes.map(e=>`<div class="item-row" data-action="confirmar-copiar-roteiro" data-id="${e.id}">
        <div class="avatar">📖</div>
        <div class="main"><div class="t1">${esc(e.tema||"Encontro sem tema")}</div><div class="t2">${fmtDataBR(e.data)} · ${e.roteiro.length} blocos</div></div>
        <div class="chev">›</div>
      </div>`).join("")}
    `);
  }

  function openMenuEncontro(id){
    const e = DB.getEncontro(id);
    if(!e) return;
    openSheet(`
      <div class="sheet-head"><h3>Encontro</h3><button class="x" data-close-sheet>✕</button></div>
      <button class="btn btn-ghost btn-block mb-8" data-action="editar-encontro" data-id="${id}">✎ Editar dados do encontro</button>
      <button class="btn btn-danger btn-block" data-action="excluir-encontro" data-id="${id}">🗑 Excluir encontro</button>
    `);
  }

  // ================================================================
  // ENCONTRO — detalhe (tabs: roteiro, presença, dinâmicas, anotações, exportar)
  // ================================================================
  function renderEncontroDetalhe(){
    const e = DB.getEncontro(state.encontroId);
    const content = $("#encontroTabContent");
    if(!e){ content.innerHTML = `<div class="empty-state"><span class="ic">⚠️</span><h4>Encontro não encontrado</h4></div>`; return; }

    $all("#encontroTabs .tab-btn").forEach(b=>b.classList.toggle("active", b.dataset.tab===state.encontroTab));

    if(state.encontroTab==="roteiro") content.innerHTML = tabRoteiro(e);
    else if(state.encontroTab==="presenca") content.innerHTML = tabPresenca(e);
    else if(state.encontroTab==="dinamicas") content.innerHTML = tabDinamicasEncontro(e);
    else if(state.encontroTab==="anotacoes") content.innerHTML = tabAnotacoesEncontro(e);
    else if(state.encontroTab==="exportar") content.innerHTML = tabExportar(e);

    if(state.encontroTab==="anotacoes"){
      const ta = $("#anotacaoEncontroTexto");
      let tm;
      ta.oninput = ()=>{
        clearTimeout(tm);
        tm = setTimeout(()=>{ DB.updateEncontro(e.id, {anotacoes: ta.value}); toast("Anotação salva"); }, 700);
      };
    }
  }

  function tabRoteiro(e){
    const modeBtns = `
      <div class="row gap-8 mb-12">
        <button class="btn btn-sm ${state.roteiroMode==='leitura'?'btn-navy':'btn-ghost'}" data-action="modo-roteiro" data-mode="leitura" style="flex:1;">📖 Leitura</button>
        <button class="btn btn-sm ${state.roteiroMode==='editar'?'btn-navy':'btn-ghost'}" data-action="modo-roteiro" data-mode="editar" style="flex:1;">✎ Editar</button>
      </div>`;
    const eyebrow = e.temaDoMes ? `<div class="eyebrow mb-12">🕊 ${esc(e.temaDoMes)}</div>` : "";

    if(state.roteiroMode==="leitura"){
      if(!e.roteiro.length){
        return modeBtns + eyebrow + `<div class="empty-state"><span class="ic">📖</span><h4>Roteiro vazio</h4><p>Toque em "Editar" para montar o roteiro deste encontro.</p></div>`;
      }
      const blocks = e.roteiro.map(b=>{
        const c = nl2br(b.conteudo);
        if(b.tipo==="titulo") return `<div class="lr-titulo">${c}</div>`;
        if(b.tipo==="subtitulo") return `<div class="lr-subtitulo">${c}</div>`;
        if(b.tipo==="topico") return `<div class="lr-topico">${c}</div>`;
        if(b.tipo==="destaque") return `<div class="lr-destaque">✦ ${c}</div>`;
        return `<div class="lr-texto">${c}</div>`;
      }).join("");
      return modeBtns + eyebrow + `<div class="leitura">${blocks}</div>`;
    }

    // modo editar
    let html = modeBtns + eyebrow;
    html += `<button class="btn btn-ghost btn-sm btn-block mb-12" data-action="copiar-roteiro">📋 Copiar roteiro de outro encontro</button>`;
    if(!e.roteiro.length){
      html += `<div class="empty-state" style="padding:24px 10px;"><span class="ic">📝</span><p>Nenhum bloco ainda. Adicione o primeiro abaixo.</p></div>`;
    } else {
      html += e.roteiro.map((b,i)=>`
        <div class="roteiro-block">
          <div class="rb-head">
            <span class="rb-type">${TIPOS_BLOCO[b.tipo]}</span>
            <div class="rb-actions">
              <button data-action="mover-bloco" data-id="${b.id}" data-dir="-1" ${i===0?'disabled':''}>↑</button>
              <button data-action="mover-bloco" data-id="${b.id}" data-dir="1" ${i===e.roteiro.length-1?'disabled':''}>↓</button>
              <button class="danger" data-action="excluir-bloco" data-id="${b.id}">🗑</button>
            </div>
          </div>
          <textarea data-bloco-id="${b.id}" rows="2" placeholder="Conteúdo...">${esc(b.conteudo)}</textarea>
        </div>
      `).join("");
    }
    html += `
      <div class="card" style="margin-top:6px;">
        <label style="font-size:12px;font-weight:700;color:var(--navy-800);display:block;margin-bottom:8px;">Adicionar bloco</label>
        <div class="row gap-8">
          <select id="novoBlocoTipo" style="flex:1;">
            <option value="titulo">Título</option>
            <option value="subtitulo">Subtítulo</option>
            <option value="topico">Tópico</option>
            <option value="destaque">Destaque</option>
            <option value="texto">Texto</option>
          </select>
          <button class="btn btn-primary btn-sm" data-action="add-bloco">+ Adicionar</button>
        </div>
      </div>`;
    return html;
  }

  function tabPresenca(e){
    const crismandos = [...DB.data.crismandos].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    if(!crismandos.length){
      return `<div class="empty-state"><span class="ic">👥</span><h4>Nenhum crismando cadastrado</h4><p>Cadastre os crismandos na aba "Crismandos" para registrar presença.</p></div>`;
    }
    let p=0,f=0;
    const rows = crismandos.map(c=>{
      const st = e.presencas?.[c.id] || null;
      if(st==="presente") p++; if(st==="falta") f++;
      return `<div class="presenca-row">
        <div class="nm">${esc(c.nome)}</div>
        <div class="toggle-presenca">
          <button class="${st==='presente'?'on-p':''}" data-action="marcar-presenca" data-id="${c.id}" data-status="presente">Presente</button>
          <button class="${st==='falta'?'on-f':''}" data-action="marcar-presenca" data-id="${c.id}" data-status="falta">Falta</button>
        </div>
      </div>`;
    }).join("");
    return `
      <div class="presenca-summary">
        <div class="ps"><b>${crismandos.length}</b><span>Total</span></div>
        <div class="ps"><b style="color:var(--ok-600)">${p}</b><span>Presentes</span></div>
        <div class="ps"><b style="color:var(--red-600)">${f}</b><span>Faltas</span></div>
      </div>
      ${rows}`;
  }

  function tabDinamicasEncontro(e){
    const dins = DB.data.dinamicas;
    if(!dins.length){
      return `<div class="empty-state"><span class="ic">🎲</span><h4>Nenhuma dinâmica cadastrada</h4><p>Cadastre dinâmicas no banco para vinculá-las aos encontros.</p><button class="btn btn-gold mt-12" data-view="dinamicas">Ir para Dinâmicas</button></div>`;
    }
    const attached = e.dinamicaIds||[];
    return dins.map(d=>`
      <label class="dinamica-check">
        <input type="checkbox" data-action="toggle-dinamica-encontro" data-id="${d.id}" ${attached.includes(d.id)?"checked":""}>
        <div class="flex-1">
          <div style="font-weight:700;font-size:13.5px;color:var(--navy-900);">${esc(d.titulo)}</div>
          ${d.objetivo?`<div class="small muted">${esc(d.objetivo.slice(0,70))}</div>`:""}
        </div>
      </label>
    `).join("");
  }

  function tabAnotacoesEncontro(e){
    return `
      <div class="field">
        <label>Anotações deste encontro</label>
        <textarea id="anotacaoEncontroTexto" rows="12" placeholder="Escreva observações, reflexões, pendências deste encontro...">${esc(e.anotacoes||"")}</textarea>
        <div class="hint">Salvo automaticamente.</div>
      </div>`;
  }

  function tabExportar(e){
    return `
      <div class="section-title" style="margin-top:0;"><span>Exportar este encontro</span><span class="line"></span></div>
      ${exportRow("Roteiro", "roteiro")}
      ${exportRow("Lista de chamada", "chamada")}
      ${exportRow("Dinâmicas do encontro", "dinamicas-encontro")}
      ${exportRow("Encontro completo", "completo")}
      <p class="small muted center mt-16">"PDF" baixa o arquivo direto no aparelho. "Word" baixa um .doc pronto para abrir e editar.</p>
    `;
  }
  function exportRow(label, kind){
    return `<div class="item-row">
      <div class="avatar">⇩</div>
      <div class="main"><div class="t1">${label}</div></div>
      <div class="row gap-8">
        <button class="btn btn-outline btn-sm" data-action="exportar" data-kind="${kind}" data-formato="pdf">PDF</button>
        <button class="btn btn-ghost btn-sm" data-action="exportar" data-kind="${kind}" data-formato="word">Word</button>
      </div>
    </div>`;
  }

  // ================================================================
  // CRISMANDOS
  // ================================================================
  function renderCrismandos(){
    const q = ($("#buscaCrismandos").value||"").toLowerCase().trim();
    let list = DB.data.crismandos.filter(c=>!q || c.nome.toLowerCase().includes(q) || (c.turma||"").toLowerCase().includes(q));
    const withFreq = list.map(c=>({c, f: DB.frequenciaCrismando(c.id)}));
    if(state.crismandoOrd==="nome") withFreq.sort((a,b)=>a.c.nome.localeCompare(b.c.nome,'pt-BR'));
    else if(state.crismandoOrd==="freq-desc") withFreq.sort((a,b)=> (b.f.pct??-1)-(a.f.pct??-1));
    else if(state.crismandoOrd==="freq-asc") withFreq.sort((a,b)=> (a.f.pct===null?999:a.f.pct)-(b.f.pct===null?999:b.f.pct));

    if(!withFreq.length){
      $("#crismandosLista").innerHTML = `<div class="empty-state"><span class="ic">👥</span><h4>Nenhum crismando cadastrado</h4><p>Toque no botão + para adicionar o primeiro.</p></div>`;
      return;
    }
    $("#crismandosLista").innerHTML = withFreq.map(({c,f})=>{
      let badge = `<span class="badge badge-navy">Sem dados</span>`;
      if(f.pct!==null){
        if(f.pct>=75) badge = `<span class="badge badge-ok">${f.pct}% presença</span>`;
        else if(f.pct>=50) badge = `<span class="badge badge-gold">${f.pct}% presença</span>`;
        else badge = `<span class="badge badge-warn">${f.pct}% presença</span>`;
      }
      return `<div class="item-row" data-abrir-crismando="${c.id}">
        <div class="avatar">${iniciais(c.nome)}</div>
        <div class="main">
          <div class="t1">${esc(c.nome)}</div>
          <div class="t2">${c.turma?esc(c.turma)+" · ":""}${badge}</div>
        </div>
        <div class="chev">›</div>
      </div>`;
    }).join("");
  }

  function sheetCrismandoForm(existing){
    const isEdit = !!existing;
    openSheet(`
      <div class="sheet-head"><h3>${isEdit?"Editar":"Novo"} crismando</h3><button class="x" data-close-sheet>✕</button></div>
      <form id="formCrismando">
        <div class="field"><label>Nome completo</label><input type="text" name="nome" required placeholder="Nome completo" value="${existing?esc(existing.nome):""}"></div>
        <div class="field"><label>Turma / grupo (opcional)</label><input type="text" name="turma" placeholder="Ex.: Turma A" value="${existing?esc(existing.turma||""):""}"></div>
        <div class="field"><label>Observações</label><textarea name="obs" rows="3" placeholder="Ex.: contato do responsável, restrições, observações pastorais...">${existing?esc(existing.obs||""):""}</textarea></div>
        <div class="sheet-actions">
          <button type="button" class="btn btn-ghost" data-close-sheet>Cancelar</button>
          <button type="submit" class="btn btn-primary">${isEdit?"Salvar":"Adicionar"}</button>
        </div>
      </form>
    `);
    $("#formCrismando").onsubmit = (ev)=>{
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const nome = (fd.get("nome")||"").trim();
      if(!nome){ toast("Informe o nome"); return; }
      const obj = {nome, turma: fd.get("turma"), obs: fd.get("obs")};
      if(isEdit){ DB.updateCrismando(existing.id, obj); toast("Crismando atualizado"); }
      else { DB.addCrismando(obj); toast("Crismando adicionado"); }
      closeSheet();
      renderCrismandos();
      renderInicio();
    };
  }

  // -------- Chamada rápida (independente do roteiro) --------
  function getOrCreateEncontroPorData(data){
    let e = DB.data.encontros.find(x=>x.data===data);
    if(!e){ e = DB.addEncontro({data, tema:""}); }
    return e;
  }

  function chamadaSheetHtml(e){
    const crismandos = [...DB.data.crismandos].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    let p=0,f=0;
    const rows = crismandos.map(c=>{
      const st = e.presencas?.[c.id] || null;
      if(st==="presente") p++; if(st==="falta") f++;
      return `<div class="presenca-row">
        <div class="nm">${esc(c.nome)}</div>
        <div class="toggle-presenca">
          <button class="${st==='presente'?'on-p':''}" data-action="chamada-marcar" data-id="${c.id}" data-status="presente">Presente</button>
          <button class="${st==='falta'?'on-f':''}" data-action="chamada-marcar" data-id="${c.id}" data-status="falta">Falta</button>
        </div>
      </div>`;
    }).join("");
    return `
      <div class="sheet-head"><h3>Fazer chamada</h3><button class="x" data-close-sheet>✕</button></div>
      <div class="field"><label>Data</label><input type="date" id="chamadaData" value="${e.data}"></div>
      ${e.tema ? `<p class="small muted mb-8">Este encontro já tem o tema "${esc(e.tema)}" cadastrado — a chamada é somente a presença, o roteiro continua separado.</p>` : ""}
      <div class="presenca-summary">
        <div class="ps"><b>${crismandos.length}</b><span>Total</span></div>
        <div class="ps"><b style="color:var(--ok-600)">${p}</b><span>Presentes</span></div>
        <div class="ps"><b style="color:var(--red-600)">${f}</b><span>Faltas</span></div>
      </div>
      <div id="chamadaLista">${rows}</div>
      <button class="btn btn-primary btn-block mt-16" data-close-sheet>Concluir chamada</button>
    `;
  }

  function sheetChamadaRapida(){
    if(!DB.data.crismandos.length){ toast("Cadastre os crismandos antes de fazer a chamada"); return; }
    const e = getOrCreateEncontroPorData(todayISO());
    state.chamadaEncontroId = e.id;
    openSheet(chamadaSheetHtml(e));
  }

  function refreshChamadaSheet(){
    const e = DB.getEncontro(state.chamadaEncontroId);
    if(!e) return;
    $("#sheet").innerHTML = `<div class="sheet-handle"></div>` + chamadaSheetHtml(e);
  }

  function sheetCrismandoDetalhe(id){
    const c = DB.data.crismandos.find(x=>x.id===id);
    if(!c) return;
    const f = DB.frequenciaCrismando(id);
    const historico = DB.sortedEncontros().filter(e=> e.presencas && e.presencas[id]);
    const histHtml = historico.length ? historico.map(e=>{
      const st = e.presencas[id];
      return `<div class="row gap-10" style="padding:8px 0;border-bottom:1px solid var(--line);">
        <span class="small muted" style="width:80px;flex-shrink:0;">${fmtDataBR(e.data)}</span>
        <span class="small flex-1" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(e.tema||"Encontro")}</span>
        <span class="badge ${st==='presente'?'badge-ok':'badge-warn'}">${st==='presente'?'Presente':'Falta'}</span>
      </div>`;
    }).join("") : `<p class="small muted">Nenhum registro de presença ainda.</p>`;

    openSheet(`
      <div class="sheet-head"><h3>${esc(c.nome)}</h3><button class="x" data-close-sheet>✕</button></div>
      ${c.turma?`<span class="badge badge-navy mb-12">${esc(c.turma)}</span>`:""}
      <div class="presenca-summary">
        <div class="ps"><b>${f.presencas}</b><span>Presenças</span></div>
        <div class="ps"><b>${f.faltas}</b><span>Faltas</span></div>
        <div class="ps"><b>${f.pct===null?"—":f.pct+"%"}</b><span>Frequência</span></div>
      </div>
      ${c.obs?`<div class="field"><label>Observações</label><p class="small" style="line-height:1.5;">${nl2br(c.obs)}</p></div>`:""}
      <div class="section-title" style="margin-top:14px;"><span>Histórico de presença</span><span class="line"></span></div>
      <div>${histHtml}</div>
      <div class="sheet-actions">
        <button class="btn btn-ghost flex-1" data-action="editar-crismando" data-id="${id}">✎ Editar</button>
        <button class="btn btn-danger flex-1" data-action="excluir-crismando" data-id="${id}">🗑 Excluir</button>
      </div>
    `);
  }

  // ================================================================
  // DINÂMICAS
  // ================================================================
  function renderDinamicas(){
    const q = ($("#buscaDinamicas").value||"").toLowerCase().trim();
    let list = DB.data.dinamicas;
    if(q){
      list = list.filter(d => [d.titulo,d.objetivo,d.materiais,d.passos,d.observacoes].join(" ").toLowerCase().includes(q));
    }
    if(!list.length){
      $("#dinamicasLista").innerHTML = `<div class="empty-state"><span class="ic">🎲</span><h4>Nenhuma dinâmica cadastrada</h4><p>Toque no botão + para cadastrar uma dinâmica, atividade ou método.</p></div>`;
      return;
    }
    $("#dinamicasLista").innerHTML = list.map(d=>`
      <div class="dinamica-card" id="dc-${d.id}">
        <div class="dh" data-toggle-dinamica="${d.id}">
          <div class="dic">🎲</div>
          <div class="main">
            <div class="t1">${esc(d.titulo)}</div>
            <div class="t2">${esc(d.objetivo||"Sem objetivo definido")}</div>
          </div>
          <div class="chev">›</div>
        </div>
        <div class="db">
          ${d.objetivo?`<h5>Objetivo</h5><p>${nl2br(d.objetivo)}</p>`:""}
          ${d.materiais?`<h5>Materiais necessários</h5><p>${nl2br(d.materiais)}</p>`:""}
          ${d.passos?`<h5>Passo a passo</h5><p>${nl2br(d.passos)}</p>`:""}
          ${d.observacoes?`<h5>Observações</h5><p>${nl2br(d.observacoes)}</p>`:""}
          <div class="row gap-8 mt-12">
            <button class="btn btn-ghost btn-sm flex-1" data-action="editar-dinamica" data-id="${d.id}">✎ Editar</button>
            <button class="btn btn-danger btn-sm flex-1" data-action="excluir-dinamica" data-id="${d.id}">🗑 Excluir</button>
          </div>
        </div>
      </div>
    `).join("");
  }

  function sheetDinamicaForm(existing){
    const isEdit = !!existing;
    openSheet(`
      <div class="sheet-head"><h3>${isEdit?"Editar":"Nova"} dinâmica</h3><button class="x" data-close-sheet>✕</button></div>
      <form id="formDinamica">
        <div class="field"><label>Título</label><input type="text" name="titulo" required placeholder="Nome da dinâmica" value="${existing?esc(existing.titulo):""}"></div>
        <div class="field"><label>Objetivo</label><textarea name="objetivo" rows="2" placeholder="O que essa dinâmica busca trabalhar">${existing?esc(existing.objetivo||""):""}</textarea></div>
        <div class="field"><label>Materiais necessários</label><textarea name="materiais" rows="2" placeholder="Ex.: papel, caneta, velas...">${existing?esc(existing.materiais||""):""}</textarea></div>
        <div class="field"><label>Passo a passo</label><textarea name="passos" rows="4" placeholder="Descreva o passo a passo">${existing?esc(existing.passos||""):""}</textarea></div>
        <div class="field"><label>Observações</label><textarea name="observacoes" rows="2" placeholder="Dicas, variações, tempo estimado...">${existing?esc(existing.observacoes||""):""}</textarea></div>
        <div class="sheet-actions">
          <button type="button" class="btn btn-ghost" data-close-sheet>Cancelar</button>
          <button type="submit" class="btn btn-primary">${isEdit?"Salvar":"Adicionar"}</button>
        </div>
      </form>
    `);
    $("#formDinamica").onsubmit = (ev)=>{
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const titulo = (fd.get("titulo")||"").trim();
      if(!titulo){ toast("Informe o título"); return; }
      const obj = {titulo, objetivo:fd.get("objetivo"), materiais:fd.get("materiais"), passos:fd.get("passos"), observacoes:fd.get("observacoes")};
      if(isEdit){ DB.updateDinamica(existing.id, obj); toast("Dinâmica atualizada"); }
      else { DB.addDinamica(obj); toast("Dinâmica adicionada"); }
      closeSheet();
      renderDinamicas();
    };
  }

  // ================================================================
  // BUSCA DE TEMAS
  // ================================================================
  function renderBuscaTemas(){
    const q = ($("#buscaTemasInput").value||"").trim();
    const box = $("#buscaTemasResultados");
    if(!q){
      box.innerHTML = `<div class="empty-state"><span class="ic">🔎</span><h4>Pesquise por um tema</h4><p>Descubra rapidamente quando um assunto já foi trabalhado nos encontros.</p></div>`;
      return;
    }
    const results = DB.buscarTemas(q);
    if(!results.length){
      box.innerHTML = `<div class="empty-state"><span class="ic">📭</span><h4>Nada encontrado</h4><p>Nenhum encontro cita "${esc(q)}".</p></div>`;
      return;
    }
    box.innerHTML = results.map(r=>`
      <div class="result-item" data-goto-encontro="${r.encontro.id}">
        <div class="t1">${highlight(r.encontro.tema||"Encontro sem tema", q)}</div>
        <div class="t2">${fmtDataBR(r.encontro.data)}${r.trecho && r.trecho!==r.encontro.tema ? " — "+highlight(r.trecho, q)+"…" : ""}</div>
      </div>
    `).join("");
  }

  // ================================================================
  // ANOTAÇÕES GERAIS
  // ================================================================
  function renderAnotacoesGerais(){
    const list = [...DB.data.notasGerais].sort((a,b)=>b.createdAt-a.createdAt);
    if(!list.length){
      $("#anotacoesGeraisLista").innerHTML = `<div class="empty-state"><span class="ic">🗒️</span><h4>Nenhuma anotação</h4><p>Use este espaço para ideias, lembretes e recados da equipe.</p></div>`;
      return;
    }
    $("#anotacoesGeraisLista").innerHTML = list.map(n=>`
      <div class="item-row" data-action="editar-nota" data-id="${n.id}" style="align-items:flex-start;">
        <div class="avatar">🗒️</div>
        <div class="main">
          <div class="t1">${esc(n.titulo||"Sem título")}</div>
          <div class="t2" style="white-space:normal;">${esc((n.conteudo||"").slice(0,80))}${n.conteudo && n.conteudo.length>80 ? "…" : ""}</div>
          <div class="t2 muted" style="margin-top:4px;">${fmtDataBR(n.data)}</div>
        </div>
      </div>
    `).join("");
  }

  function sheetNotaForm(existing){
    const isEdit = !!existing;
    openSheet(`
      <div class="sheet-head"><h3>${isEdit?"Editar":"Nova"} anotação</h3><button class="x" data-close-sheet>✕</button></div>
      <form id="formNota">
        <div class="field"><label>Título</label><input type="text" name="titulo" placeholder="Título da anotação" value="${existing?esc(existing.titulo):""}"></div>
        <div class="field"><label>Data</label><input type="date" name="data" value="${existing?existing.data:todayISO()}"></div>
        <div class="field"><label>Conteúdo</label><textarea name="conteudo" rows="8" placeholder="Escreva aqui...">${existing?esc(existing.conteudo):""}</textarea></div>
        <div class="sheet-actions">
          ${isEdit?`<button type="button" class="btn btn-danger" data-action="excluir-nota" data-id="${existing.id}">🗑</button>`:""}
          <button type="button" class="btn btn-ghost flex-1" data-close-sheet>Cancelar</button>
          <button type="submit" class="btn btn-primary flex-1">${isEdit?"Salvar":"Adicionar"}</button>
        </div>
      </form>
    `);
    $("#formNota").onsubmit = (ev)=>{
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const obj = {titulo: fd.get("titulo"), data: fd.get("data")||todayISO(), conteudo: fd.get("conteudo")};
      if(isEdit) DB.updateNotaGeral(existing.id, obj);
      else DB.addNotaGeral(obj);
      toast("Anotação salva");
      closeSheet();
      renderAnotacoesGerais();
    };
  }

  // ================================================================
  // RELATÓRIOS
  // ================================================================
  function renderRelatorios(){
    const crismandos = [...DB.data.crismandos].map(c=>({c, f: DB.frequenciaCrismando(c.id)})).sort((a,b)=>(b.f.pct??-1)-(a.f.pct??-1));
    const rows = crismandos.map(({c,f})=>`
      <div class="item-row">
        <div class="avatar">${iniciais(c.nome)}</div>
        <div class="main">
          <div class="t1">${esc(c.nome)}</div>
          <div class="t2">${f.presencas} presenças · ${f.faltas} faltas</div>
        </div>
        <span class="badge ${f.pct===null?'badge-navy':f.pct>=75?'badge-ok':f.pct>=50?'badge-gold':'badge-warn'}">${f.pct===null?"—":f.pct+"%"}</span>
      </div>`).join("");
    $("#view-relatorios").innerHTML = `
      <div class="hero" style="padding:16px 16px;">
        <div class="hero-stats" style="margin-top:0;">
          <div class="hero-stat"><b>${DB.data.crismandos.length}</b><span>Crismandos</span></div>
          <div class="hero-stat"><b>${DB.encontrosRealizados().length}</b><span>Realizados</span></div>
          <div class="hero-stat"><b>${DB.frequenciaGeralMedia()}%</b><span>Freq. média</span></div>
        </div>
      </div>
      <div class="row gap-8 mb-12">
        <button class="btn btn-outline flex-1" data-action="exportar-geral" data-formato="pdf">Exportar PDF</button>
        <button class="btn btn-ghost flex-1" data-action="exportar-geral" data-formato="word">Exportar Word</button>
      </div>
      <div class="section-title" style="margin-top:6px;"><span>Ranking de frequência</span><span class="line"></span></div>
      ${rows || `<div class="empty-state"><span class="ic">👥</span><h4>Nenhum crismando cadastrado</h4></div>`}
    `;
  }

  // ================================================================
  // CONFIGURAÇÕES
  // ================================================================
  function renderConfig(){
    const cfg = DB.data.config;
    $("#view-config").innerHTML = `
      <form id="formConfig" class="card">
        <div class="field"><label>Nome da turma / grupo</label><input type="text" name="grupoNome" value="${esc(cfg.grupoNome)}"></div>
        <div class="field"><label>Paróquia / comunidade</label><input type="text" name="paroquia" value="${esc(cfg.paroquia)}"></div>
        <div class="field"><label>Catequista responsável</label><input type="text" name="catequista" value="${esc(cfg.catequista)}"></div>
        <div class="form-row">
          <div class="field"><label>Ano da turma</label><input type="text" name="anoTurma" value="${esc(cfg.anoTurma)}"></div>
          <div class="field"><label>Avisar com quantos dias?</label><input type="number" name="diasAviso" min="1" max="30" value="${cfg.diasAviso}"></div>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Salvar configurações</button>
      </form>`;
    $("#formConfig").onsubmit = (ev)=>{
      ev.preventDefault();
      const fd = new FormData(ev.target);
      DB.data.config = {
        grupoNome: fd.get("grupoNome")||"Turma da Crisma",
        paroquia: fd.get("paroquia")||"",
        catequista: fd.get("catequista")||"",
        anoTurma: fd.get("anoTurma")||"",
        diasAviso: Number(fd.get("diasAviso"))||7
      };
      DB.save();
      toast("Configurações salvas");
    };
  }

  // ================================================================
  // BACKUP
  // ================================================================
  function renderBackup(){
    $("#view-backup").innerHTML = `
      <div class="card">
        <h4 class="mb-8">Exportar backup</h4>
        <p class="small muted mb-12">Salva um arquivo .json com todos os crismandos, encontros, dinâmicas e anotações. Guarde em um local seguro.</p>
        <button class="btn btn-primary btn-block" id="btnExportBackup">⇩ Baixar backup (.json)</button>
      </div>
      <div class="card">
        <h4 class="mb-8">Importar backup</h4>
        <p class="small muted mb-12">Atenção: isso substitui todos os dados atuais do aplicativo pelos dados do arquivo importado.</p>
        <input type="file" id="inputImportBackup" accept="application/json,.json" style="margin-bottom:10px;">
        <button class="btn btn-outline btn-block" id="btnImportBackup">Importar arquivo</button>
      </div>`;
    $("#btnExportBackup").onclick = ()=>{
      const blob = new Blob([DB.exportJSON()], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `crisma-em-dia-backup-${todayISO()}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url), 2000);
      toast("Backup baixado");
    };
    $("#btnImportBackup").onclick = ()=>{
      const inp = $("#inputImportBackup");
      if(!inp.files.length){ toast("Selecione um arquivo"); return; }
      const reader = new FileReader();
      reader.onload = ()=>{
        try{
          DB.importJSON(reader.result);
          toast("Dados importados com sucesso");
          switchView("inicio");
        }catch(e){ toast("Arquivo inválido"); }
      };
      reader.readAsText(inp.files[0]);
    };
  }

  // ================================================================
  // CRONOGRAMA DA CRISMA
  // ================================================================
  function renderCronograma(){
    const meses = DB.data.cronograma;
    let html = `
      <p class="small muted mb-12">Monte aqui o planejamento do ano todo: o tema que a Igreja celebra em cada mês e o tema de cada semana. Ao criar um encontro, você pode puxar esses temas automaticamente.</p>
      <button class="btn btn-primary btn-block mb-12" data-action="novo-mes-cronograma">+ Adicionar mês</button>`;

    if(!meses.length){
      html += `<div class="empty-state"><span class="ic">🗓️</span><h4>Nenhum mês cadastrado</h4><p>Adicione o primeiro mês para começar o planejamento.</p></div>`;
    } else {
      html += meses.map((m,i)=>`
        <div class="card">
          <div class="row gap-8" style="align-items:flex-start;">
            <div class="flex-1">
              <span class="eyebrow mb-8">${esc(m.mes||"Mês sem nome")}</span>
              <h4 style="margin-top:6px; ${m.temaDoMes?'':'color:var(--ink-soft);font-weight:500;'}">${esc(m.temaDoMes||"Sem tema do mês definido")}</h4>
            </div>
            <div class="rb-actions">
              <button data-action="mover-mes-cronograma" data-id="${m.id}" data-dir="-1" ${i===0?'disabled':''}>↑</button>
              <button data-action="mover-mes-cronograma" data-id="${m.id}" data-dir="1" ${i===meses.length-1?'disabled':''}>↓</button>
              <button data-action="editar-mes-cronograma" data-id="${m.id}">✎</button>
              <button class="danger" data-action="excluir-mes-cronograma" data-id="${m.id}">🗑</button>
            </div>
          </div>
          <div class="divider"></div>
          ${m.semanas.length ? m.semanas.map(s=>`
            <div class="row gap-10" style="padding:8px 0;border-bottom:1px solid var(--line);align-items:flex-start;">
              <span class="badge badge-gold" style="flex-shrink:0;margin-top:1px;">${s.numero}ª semana</span>
              <span class="small flex-1" style="line-height:1.4;">${s.tema?esc(s.tema):'<span class="muted">Sem tema definido</span>'}</span>
              <button class="btn btn-ghost btn-sm" data-action="editar-semana-cronograma" data-mesid="${m.id}" data-id="${s.id}">✎</button>
              <button class="btn btn-danger btn-sm" data-action="excluir-semana-cronograma" data-mesid="${m.id}" data-id="${s.id}">🗑</button>
            </div>`).join("") : `<p class="small muted">Nenhuma semana cadastrada ainda.</p>`}
          <button class="btn btn-ghost btn-sm btn-block mt-12" data-action="nova-semana-cronograma" data-mesid="${m.id}">+ Adicionar semana</button>
        </div>
      `).join("");
    }
    $("#view-cronograma").innerHTML = html;
  }

  function sheetMesCronogramaForm(existing){
    const isEdit = !!existing;
    openSheet(`
      <div class="sheet-head"><h3>${isEdit?"Editar":"Novo"} mês</h3><button class="x" data-close-sheet>✕</button></div>
      <form id="formMesCronograma">
        <div class="field"><label>Mês</label><input type="text" name="mes" required placeholder="Ex.: Agosto de 2026" value="${existing?esc(existing.mes):""}"></div>
        <div class="field"><label>Tema do mês</label><input type="text" name="temaDoMes" placeholder="Ex.: Mês das Vocações" value="${existing?esc(existing.temaDoMes||""):""}"></div>
        <div class="sheet-actions">
          ${isEdit?`<button type="button" class="btn btn-danger" data-action="excluir-mes-cronograma" data-id="${existing.id}">🗑</button>`:""}
          <button type="button" class="btn btn-ghost flex-1" data-close-sheet>Cancelar</button>
          <button type="submit" class="btn btn-primary flex-1">${isEdit?"Salvar":"Adicionar"}</button>
        </div>
      </form>
    `);
    $("#formMesCronograma").onsubmit = (ev)=>{
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const mes = (fd.get("mes")||"").trim();
      if(!mes){ toast("Informe o mês"); return; }
      const obj = {mes, temaDoMes: fd.get("temaDoMes")};
      if(isEdit) DB.updateMesCronograma(existing.id, obj);
      else DB.addMesCronograma(obj);
      toast("Salvo");
      closeSheet();
      renderCronograma();
    };
  }

  function sheetSemanaCronogramaForm(mesId, existing){
    const isEdit = !!existing;
    openSheet(`
      <div class="sheet-head"><h3>${isEdit?`Editar ${existing.numero}ª semana`:"Nova semana"}</h3><button class="x" data-close-sheet>✕</button></div>
      <form id="formSemanaCronograma">
        <div class="field"><label>Tema da semana</label><textarea name="tema" rows="3" placeholder="Ex.: O chamado de Deus na Bíblia">${existing?esc(existing.tema||""):""}</textarea></div>
        <div class="sheet-actions">
          ${isEdit?`<button type="button" class="btn btn-danger" data-action="excluir-semana-cronograma" data-mesid="${mesId}" data-id="${existing.id}">🗑</button>`:""}
          <button type="button" class="btn btn-ghost flex-1" data-close-sheet>Cancelar</button>
          <button type="submit" class="btn btn-primary flex-1">${isEdit?"Salvar":"Adicionar"}</button>
        </div>
      </form>
    `);
    $("#formSemanaCronograma").onsubmit = (ev)=>{
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const tema = fd.get("tema");
      if(isEdit) DB.updateSemanaCronograma(mesId, existing.id, tema);
      else DB.addSemanaCronograma(mesId, tema);
      toast("Salvo");
      closeSheet();
      renderCronograma();
    };
  }

  // ================================================================
  // EVENTOS GLOBAIS (delegação)
  // ================================================================
  document.addEventListener("click", (ev)=>{
    if(ev.target.closest("#fabBtn")){
      if(state.view==="encontros") sheetEncontroForm(null);
      else if(state.view==="crismandos") sheetCrismandoForm(null);
      else if(state.view==="dinamicas") sheetDinamicaForm(null);
      return;
    }

    const navItem = ev.target.closest(".nav-item");
    if(navItem){ switchView(navItem.dataset.view); return; }

    const viewBtn = ev.target.closest("[data-view]");
    if(viewBtn && !viewBtn.classList.contains("nav-item")){ switchView(viewBtn.dataset.view); return; }

    if(ev.target.closest("#backBtn")) return; // handled by onclick

    if(ev.target.closest("[data-close-sheet]")){ closeSheet(); return; }
    if(ev.target===$("#overlay")){ closeSheet(); return; }

    const gotoEnc = ev.target.closest("[data-goto-encontro]");
    if(gotoEnc){ switchView("encontro-detalhe", {encontroId: gotoEnc.dataset.gotoEncontro, encontroTab:"roteiro", roteiroMode: "leitura"}); return; }

    const abrirCris = ev.target.closest("[data-abrir-crismando]");
    if(abrirCris){ sheetCrismandoDetalhe(abrirCris.dataset.abrirCrismando); return; }

    const tabBtn = ev.target.closest(".tab-btn");
    if(tabBtn && tabBtn.closest("#encontroTabs")){
      state.encontroTab = tabBtn.dataset.tab;
      renderEncontroDetalhe();
      return;
    }

    const toggleDin = ev.target.closest("[data-toggle-dinamica]");
    if(toggleDin){
      $("#dc-"+toggleDin.dataset.toggleDinamica).classList.toggle("open");
      return;
    }

    const action = ev.target.closest("[data-action]");
    if(action){
      const act = action.dataset.action;

      if(act==="novo-encontro"){ sheetEncontroForm(null); }
      else if(act==="novo-crismando"){ sheetCrismandoForm(null); }
      else if(act==="fazer-chamada"){ sheetChamadaRapida(); }
      else if(act==="chamada-marcar"){
        const e = DB.getEncontro(state.chamadaEncontroId);
        if(!e) return;
        if(!e.presencas) e.presencas = {};
        const atual = e.presencas[action.dataset.id];
        const novo = action.dataset.status;
        if(atual===novo){ delete e.presencas[action.dataset.id]; }
        else { e.presencas[action.dataset.id] = novo; }
        DB.save();
        refreshChamadaSheet();
      }
      else if(act==="editar-encontro"){ closeSheet(); setTimeout(()=>sheetEncontroForm(DB.getEncontro(action.dataset.id)),160); }
      else if(act==="excluir-encontro"){
        if(confirm("Excluir este encontro? Essa ação não pode ser desfeita.")){
          DB.deleteEncontro(action.dataset.id);
          closeSheet();
          toast("Encontro excluído");
          switchView("encontros");
        }
      }
      else if(act==="editar-crismando"){ closeSheet(); setTimeout(()=>sheetCrismandoForm(DB.data.crismandos.find(x=>x.id===action.dataset.id)),160); }
      else if(act==="excluir-crismando"){
        if(confirm("Excluir este crismando? O histórico de presença dele será removido.")){
          DB.deleteCrismando(action.dataset.id);
          closeSheet(); toast("Crismando excluído"); renderCrismandos(); renderInicio();
        }
      }
      else if(act==="editar-dinamica"){ sheetDinamicaForm(DB.data.dinamicas.find(x=>x.id===action.dataset.id)); }
      else if(act==="excluir-dinamica"){
        if(confirm("Excluir esta dinâmica?")){ DB.deleteDinamica(action.dataset.id); toast("Dinâmica excluída"); renderDinamicas(); }
      }
      else if(act==="editar-nota"){ sheetNotaForm(DB.data.notasGerais.find(x=>x.id===action.dataset.id)); }
      else if(act==="nova-anotacao"){ sheetNotaForm(null); }
      else if(act==="excluir-nota"){
        if(confirm("Excluir esta anotação?")){ DB.deleteNotaGeral(action.dataset.id); closeSheet(); toast("Anotação excluída"); renderAnotacoesGerais(); }
      }
      else if(act==="ir-cronograma"){ switchView("cronograma"); }
      else if(act==="novo-mes-cronograma"){ sheetMesCronogramaForm(null); }
      else if(act==="editar-mes-cronograma"){ sheetMesCronogramaForm(DB.data.cronograma.find(x=>x.id===action.dataset.id)); }
      else if(act==="excluir-mes-cronograma"){
        if(confirm("Excluir este mês e todas as semanas cadastradas nele?")){
          DB.deleteMesCronograma(action.dataset.id);
          closeSheet(); toast("Mês excluído"); renderCronograma();
        }
      }
      else if(act==="mover-mes-cronograma"){ DB.moveMesCronograma(action.dataset.id, Number(action.dataset.dir)); renderCronograma(); }
      else if(act==="nova-semana-cronograma"){ sheetSemanaCronogramaForm(action.dataset.mesid, null); }
      else if(act==="editar-semana-cronograma"){
        const m = DB.data.cronograma.find(x=>x.id===action.dataset.mesid);
        sheetSemanaCronogramaForm(action.dataset.mesid, m.semanas.find(x=>x.id===action.dataset.id));
      }
      else if(act==="excluir-semana-cronograma"){
        if(confirm("Excluir esta semana?")){
          DB.deleteSemanaCronograma(action.dataset.mesid, action.dataset.id);
          closeSheet(); toast("Semana excluída"); renderCronograma();
        }
      }
      else if(act==="usar-tema-cronograma"){
        const form = action.closest("form");
        if(form){
          form.querySelector('[name="temaDoMes"]').value = decodeURIComponent(action.dataset.temames||"");
          form.querySelector('[name="tema"]').value = decodeURIComponent(action.dataset.tema||"");
        }
      }
      else if(act==="copiar-roteiro"){ sheetCopiarRoteiro(); }
      else if(act==="confirmar-copiar-roteiro"){
        const origem = DB.getEncontro(action.dataset.id);
        const atual = DB.getEncontro(state.encontroId);
        if(atual.roteiro.length && !confirm("Isso vai substituir o roteiro atual deste encontro. Continuar?")) return;
        atual.roteiro = origem.roteiro.map(b=>({id: uid(), tipo:b.tipo, conteudo:b.conteudo}));
        DB.save();
        closeSheet();
        toast("Roteiro copiado");
        renderEncontroDetalhe();
      }
      else if(act==="ir-busca-temas"){ switchView("busca-temas"); }
      else if(act==="ir-anotacoes-gerais"){ switchView("anotacoes-gerais"); }
      else if(act==="ir-relatorios"){ switchView("relatorios"); }
      else if(act==="ir-config"){ switchView("config"); }
      else if(act==="ir-backup"){ switchView("backup"); }
      else if(act==="modo-roteiro"){ state.roteiroMode = action.dataset.mode; renderEncontroDetalhe(); }
      else if(act==="add-bloco"){
        const tipo = $("#novoBlocoTipo").value;
        DB.addBlocoRoteiro(state.encontroId, tipo, "");
        renderEncontroDetalhe();
        setTimeout(()=>{
          const tas = $all("#encontroTabContent textarea[data-bloco-id]");
          if(tas.length) tas[tas.length-1].focus();
        },50);
      }
      else if(act==="excluir-bloco"){ DB.deleteBlocoRoteiro(state.encontroId, action.dataset.id); renderEncontroDetalhe(); }
      else if(act==="mover-bloco"){ DB.moveBlocoRoteiro(state.encontroId, action.dataset.id, Number(action.dataset.dir)); renderEncontroDetalhe(); }
      else if(act==="marcar-presenca"){
        const e = DB.getEncontro(state.encontroId);
        const atual = e.presencas?.[action.dataset.id];
        const novo = action.dataset.status;
        DB.setPresenca(state.encontroId, action.dataset.id, atual===novo ? null : novo);
        if(atual===novo){ delete e.presencas[action.dataset.id]; DB.save(); }
        renderEncontroDetalhe();
      }
      else if(act==="toggle-dinamica-encontro"){
        const e = DB.getEncontro(state.encontroId);
        const id = action.dataset.id;
        const has = e.dinamicaIds.includes(id);
        e.dinamicaIds = has ? e.dinamicaIds.filter(x=>x!==id) : [...e.dinamicaIds, id];
        DB.save();
      }
      else if(act==="exportar"){ handleExportar(action.dataset.kind, action.dataset.formato); }
      else if(act==="exportar-geral"){
        const doc = Export.docRelatorioFrequencia();
        if(action.dataset.formato==="pdf"){ toast("Gerando PDF..."); Export.toPDF(doc.bodyHtml, "relatorio-frequencia").then(()=>toast("PDF baixado")); }
        else Export.toWord(doc.fullHtml, "relatorio-frequencia");
      }
      return;
    }
  });

  document.addEventListener("input", (ev)=>{
    if(ev.target.id==="buscaEncontros") renderEncontros();
    else if(ev.target.id==="buscaCrismandos") renderCrismandos();
    else if(ev.target.id==="buscaDinamicas") renderDinamicas();
    else if(ev.target.id==="buscaTemasInput") renderBuscaTemas();
    else if(ev.target.id==="chamadaData"){
      const e = getOrCreateEncontroPorData(ev.target.value);
      state.chamadaEncontroId = e.id;
      refreshChamadaSheet();
    }
    else if(ev.target.dataset && ev.target.dataset.blocoId){
      DB.updateBlocoRoteiro(state.encontroId, ev.target.dataset.blocoId, {conteudo: ev.target.value});
    }
  });

  document.addEventListener("click", (ev)=>{
    const chip = ev.target.closest("#ordenarCrismandos .chip");
    if(chip){
      $all("#ordenarCrismandos .chip").forEach(c=>c.classList.remove("active"));
      chip.classList.add("active");
      state.crismandoOrd = chip.dataset.ord;
      renderCrismandos();
    }
  });

  function handleExportar(kind, formato){
    const e = DB.getEncontro(state.encontroId);
    if(!e) return;
    let doc, name;
    if(kind==="roteiro"){ doc = Export.docRoteiro(e); name = "roteiro-"+e.data; }
    else if(kind==="chamada"){ doc = Export.docChamada(e); name = "chamada-"+e.data; }
    else if(kind==="dinamicas-encontro"){
      const dins = (e.dinamicaIds||[]).map(id=>DB.data.dinamicas.find(d=>d.id===id)).filter(Boolean);
      doc = Export.docDinamicas(dins, `Dinâmicas — ${e.tema||"Encontro"} (${Export.fmtData(e.data)})`);
      name = "dinamicas-"+e.data;
    }
    else if(kind==="completo"){ doc = Export.docEncontroCompleto(e); name = "encontro-completo-"+e.data; }
    if(!doc) return;
    if(formato==="pdf"){ toast("Gerando PDF..."); Export.toPDF(doc.bodyHtml, name).then(()=>toast("PDF baixado")); }
    else Export.toWord(doc.fullHtml, name);
  }

  // ---------------- init ----------------
  switchView("inicio");

  // registra service worker (PWA offline)
  if("serviceWorker" in navigator){
    window.addEventListener("load", ()=>{
      navigator.serviceWorker.register("sw.js").catch(()=>{});
    });
  }
})();
