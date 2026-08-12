/* ============================================================
   CRISMA EM DIA — motor de exportação
   PDF: gerado diretamente (jsPDF + html2canvas, embutidos, offline)
   Word: arquivo .doc pronto para baixar e editar
   ============================================================ */

// CSS injetado uma única vez para renderizar o documento fora da tela
// antes de virar imagem/PDF. Mesma linguagem visual do app.
const PDF_DOC_CSS = `
.pdf-doc{ font-family: Georgia, 'Times New Roman', serif; color:#1A1D26; line-height:1.5; background:#fff; padding:26px 30px; }
.pdf-doc .doc-header{ border-bottom:3px solid #C1121F; padding-bottom:10px; margin-bottom:22px; }
.pdf-doc .dh-brand{ font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:#C1121F; font-weight:bold; font-family: Arial, sans-serif;}
.pdf-doc .dh-grupo{ font-size:22px; font-weight:bold; color:#12213F; margin-top:4px; font-family: Georgia, serif;}
.pdf-doc .dh-sub{ font-size:14px; color:#55596B; margin-top:3px; font-family: Arial, sans-serif;}
.pdf-doc .dh-cat{ font-size:11px; color:#8a8f9e; margin-top:2px; font-family: Arial, sans-serif;}
.pdf-doc h2.blk-titulo{ font-size:18px; color:#12213F; border-bottom:2px solid #E4A72E; padding-bottom:5px; margin:22px 0 8px; font-family: Georgia, serif;}
.pdf-doc h3.blk-subtitulo{ font-size:15px; color:#A10E16; margin:14px 0 5px; font-family: Georgia, serif;}
.pdf-doc .blk-topico{ margin:5px 0 5px 6px; font-size:13px; font-family: Arial, sans-serif;}
.pdf-doc .blk-destaque{ background:#FCEFD4; border-left:4px solid #E4A72E; padding:10px 12px; margin:10px 0; font-size:13px; font-weight:bold; color:#6E4E12; font-family: Arial, sans-serif;}
.pdf-doc .blk-texto{ font-size:13px; color:#3d4152; margin:6px 0; font-family: Arial, sans-serif;}
.pdf-doc table{ width:100%; border-collapse:collapse; margin-top:8px; font-family: Arial, sans-serif; font-size:12.5px;}
.pdf-doc th{ background:#12213F; color:#fff; text-align:left; padding:8px 10px; font-size:11px; text-transform:uppercase; letter-spacing:.03em;}
.pdf-doc td{ padding:7px 10px; border-bottom:1px solid #E7DEC9; }
.pdf-doc tr:nth-child(even) td{ background:#FBF3E3; }
.pdf-doc .stat-row{ display:flex; gap:14px; margin:14px 0; font-family: Arial, sans-serif;}
.pdf-doc .stat-box{ flex:1; border:1px solid #E7DEC9; border-radius:6px; padding:8px 10px; text-align:center;}
.pdf-doc .stat-box b{ display:block; font-size:20px; color:#12213F; }
.pdf-doc .stat-box span{ font-size:10px; color:#55596B; text-transform:uppercase; }
.pdf-doc .dyn-block{ border:1px solid #E7DEC9; border-radius:8px; padding:12px 14px; margin-bottom:12px; font-family: Arial, sans-serif;}
.pdf-doc .dyn-block h4{ font-size:14px; color:#12213F; margin:0 0 6px; font-family: Georgia, serif;}
.pdf-doc .dyn-block .lbl{ font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:#C98A1F; font-weight:bold; margin-top:8px;}
.pdf-doc .dyn-block p{ font-size:12.5px; margin:3px 0 0; white-space:pre-wrap; }
.pdf-doc .assinatura{ margin-top:50px; display:flex; gap:30px; font-family: Arial, sans-serif; font-size:12px;}
.pdf-doc .assinatura .linha{ flex:1; border-top:1px solid #1A1D26; padding-top:5px; text-align:center; color:#55596B;}
.pdf-doc .footer-note{ margin-top:24px; font-size:10px; color:#9aa; text-align:center; font-family: Arial, sans-serif; }
`;

function ensurePdfDocStyles(){
  if(document.getElementById("pdf-doc-styles")) return;
  const style = document.createElement("style");
  style.id = "pdf-doc-styles";
  style.textContent = PDF_DOC_CSS;
  document.head.appendChild(style);
}

const Export = {

  esc(s){
    return (s||"").toString()
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  },

  fmtData(iso){
    if(!iso) return "";
    const [y,m,d] = iso.split("-");
    return `${d}/${m}/${y}`;
  },

  cabecalho(subtitulo){
    const cfg = DB.data.config;
    return `
      <div class="doc-header">
        <div class="dh-brand">✝ Crisma em Dia</div>
        <div class="dh-grupo">${this.esc(cfg.grupoNome)}${cfg.paroquia ? " — "+this.esc(cfg.paroquia) : ""}</div>
        <div class="dh-sub">${this.esc(subtitulo)}</div>
        ${cfg.catequista ? `<div class="dh-cat">Catequista: ${this.esc(cfg.catequista)}</div>` : ""}
      </div>`;
  },

  temaMesLinha(encontro){
    if(!encontro.temaDoMes) return "";
    return `<div style="font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:.05em;color:#C98A1F;font-family:Arial, sans-serif;margin-top:-4px;margin-bottom:2px;">🕊 ${this.esc(encontro.temaDoMes)}</div>`;
  },

  wrap(bodyHtml, titulo){
    return `
    <html><head><meta charset="utf-8"><title>${this.esc(titulo)}</title>
    <style>
      @page{ margin:20mm 16mm; }
      body{ font-family: Georgia, 'Times New Roman', serif; color:#1A1D26; line-height:1.5; }
      .doc-header{ border-bottom:3px solid #C1121F; padding-bottom:10px; margin-bottom:22px; }
      .dh-brand{ font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:#C1121F; font-weight:bold; font-family: Arial, sans-serif;}
      .dh-grupo{ font-size:22px; font-weight:bold; color:#12213F; margin-top:4px; font-family: Georgia, serif;}
      .dh-sub{ font-size:14px; color:#55596B; margin-top:3px; font-family: Arial, sans-serif;}
      .dh-cat{ font-size:11px; color:#8a8f9e; margin-top:2px; font-family: Arial, sans-serif;}
      h2.blk-titulo{ font-size:18px; color:#12213F; border-bottom:2px solid #E4A72E; padding-bottom:5px; margin:22px 0 8px; font-family: Georgia, serif;}
      h3.blk-subtitulo{ font-size:15px; color:#A10E16; margin:14px 0 5px; font-family: Georgia, serif;}
      .blk-topico{ margin:5px 0 5px 6px; font-size:13px; font-family: Arial, sans-serif;}
      .blk-topico:before{ content:"› "; color:#C98A1F; font-weight:bold; }
      .blk-destaque{ background:#FCEFD4; border-left:4px solid #E4A72E; padding:10px 12px; margin:10px 0; font-size:13px; font-weight:bold; color:#6E4E12; font-family: Arial, sans-serif;}
      .blk-texto{ font-size:13px; color:#3d4152; margin:6px 0; font-family: Arial, sans-serif;}
      table{ width:100%; border-collapse:collapse; margin-top:8px; font-family: Arial, sans-serif; font-size:12.5px;}
      th{ background:#12213F; color:#fff; text-align:left; padding:8px 10px; font-size:11px; text-transform:uppercase; letter-spacing:.03em;}
      td{ padding:7px 10px; border-bottom:1px solid #E7DEC9; }
      tr:nth-child(even) td{ background:#FBF3E3; }
      .stat-row{ display:flex; gap:14px; margin:14px 0; font-family: Arial, sans-serif;}
      .stat-box{ flex:1; border:1px solid #E7DEC9; border-radius:6px; padding:8px 10px; text-align:center;}
      .stat-box b{ display:block; font-size:20px; color:#12213F; }
      .stat-box span{ font-size:10px; color:#55596B; text-transform:uppercase; }
      .dyn-block{ border:1px solid #E7DEC9; border-radius:8px; padding:12px 14px; margin-bottom:12px; font-family: Arial, sans-serif;}
      .dyn-block h4{ font-size:14px; color:#12213F; margin:0 0 6px; font-family: Georgia, serif;}
      .dyn-block .lbl{ font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:#C98A1F; font-weight:bold; margin-top:8px;}
      .dyn-block p{ font-size:12.5px; margin:3px 0 0; white-space:pre-wrap; }
      .footer-note{ margin-top:30px; font-size:10px; color:#9aa; text-align:center; font-family: Arial, sans-serif; }
      .assinatura{ margin-top:50px; display:flex; gap:30px; font-family: Arial, sans-serif; font-size:12px;}
      .assinatura .linha{ flex:1; border-top:1px solid #1A1D26; padding-top:5px; text-align:center; color:#55596B;}
    </style>
    </head><body>${bodyHtml}
    <div class="footer-note">Gerado pelo aplicativo Crisma em Dia</div>
    </body></html>`;
  },

  blocoRoteiroHtml(b){
    const c = this.esc(b.conteudo).replace(/\n/g,"<br>");
    if(b.tipo==="titulo") return `<h2 class="blk-titulo">${c}</h2>`;
    if(b.tipo==="subtitulo") return `<h3 class="blk-subtitulo">${c}</h3>`;
    if(b.tipo==="topico") return `<div class="blk-topico">${c}</div>`;
    if(b.tipo==="destaque") return `<div class="blk-destaque">${c}</div>`;
    return `<p class="blk-texto">${c}</p>`;
  },

  // ---------- construtores de documento ----------
  // Cada método devolve { title, bodyHtml, fullHtml }
  // bodyHtml -> usado na geração direta de PDF (renderizado fora da tela)
  // fullHtml -> documento HTML completo, usado na exportação Word (.doc)
  docRoteiro(encontro){
    let body = this.cabecalho(`Roteiro do encontro — ${this.fmtData(encontro.data)}`);
    body += this.temaMesLinha(encontro);
    body += `<h2 class="blk-titulo" style="margin-top:0;">${this.esc(encontro.tema||"Encontro")}</h2>`;
    if(encontro.roteiro.length===0){
      body += `<p class="blk-texto">Nenhum conteúdo de roteiro cadastrado.</p>`;
    } else {
      body += encontro.roteiro.map(b=>this.blocoRoteiroHtml(b)).join("");
    }
    const title = "Roteiro - "+ (encontro.tema||"Encontro");
    return { title, bodyHtml: body, fullHtml: this.wrap(body, title) };
  },

  docChamada(encontro){
    let body = this.cabecalho(`Lista de chamada — ${this.fmtData(encontro.data)}`);
    body += this.temaMesLinha(encontro);
    body += `<h2 class="blk-titulo" style="margin-top:0;">${this.esc(encontro.tema||"Encontro")}</h2>`;
    const crismandos = [...DB.data.crismandos].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    let presentes=0, faltas=0;
    const rows = crismandos.map((c,i)=>{
      const st = encontro.presencas ? encontro.presencas[c.id] : null;
      if(st==="presente") presentes++;
      if(st==="falta") faltas++;
      const marca = st==="presente" ? "✓ Presente" : (st==="falta" ? "✗ Falta" : "—");
      return `<tr><td>${i+1}</td><td>${this.esc(c.nome)}</td><td>${this.esc(c.turma||"")}</td><td>${marca}</td></tr>`;
    }).join("");
    body += `<div class="stat-row">
      <div class="stat-box"><b>${crismandos.length}</b><span>Cadastrados</span></div>
      <div class="stat-box"><b>${presentes}</b><span>Presentes</span></div>
      <div class="stat-box"><b>${faltas}</b><span>Faltas</span></div>
    </div>`;
    body += `<table><tr><th>#</th><th>Nome</th><th>Turma</th><th>Status</th></tr>${rows || `<tr><td colspan="4">Nenhum crismando cadastrado.</td></tr>`}</table>`;
    body += `<div class="assinatura"><div class="linha">Catequista responsável</div></div>`;
    const title = "Chamada - "+ (encontro.tema||"Encontro");
    return { title, bodyHtml: body, fullHtml: this.wrap(body, title) };
  },

  docDinamicas(dinamicas, subtitulo){
    let body = this.cabecalho(subtitulo || "Dinâmicas selecionadas");
    if(dinamicas.length===0){
      body += `<p class="blk-texto">Nenhuma dinâmica selecionada.</p>`;
    } else {
      body += dinamicas.map(d=>`
        <div class="dyn-block">
          <h4>${this.esc(d.titulo)}</h4>
          ${d.objetivo ? `<div class="lbl">Objetivo</div><p>${this.esc(d.objetivo)}</p>`:""}
          ${d.materiais ? `<div class="lbl">Materiais</div><p>${this.esc(d.materiais)}</p>`:""}
          ${d.passos ? `<div class="lbl">Passo a passo</div><p>${this.esc(d.passos)}</p>`:""}
          ${d.observacoes ? `<div class="lbl">Observações</div><p>${this.esc(d.observacoes)}</p>`:""}
        </div>`).join("");
    }
    const title = "Dinâmicas";
    return { title, bodyHtml: body, fullHtml: this.wrap(body, title) };
  },

  docEncontroCompleto(encontro){
    let body = this.cabecalho(`Encontro completo — ${this.fmtData(encontro.data)}`);
    body += this.temaMesLinha(encontro);
    body += `<h2 class="blk-titulo" style="margin-top:0;">${this.esc(encontro.tema||"Encontro")}</h2>`;

    body += `<h3 class="blk-subtitulo">Roteiro</h3>`;
    body += encontro.roteiro.length
      ? encontro.roteiro.map(b=>this.blocoRoteiroHtml(b)).join("")
      : `<p class="blk-texto">Nenhum roteiro cadastrado.</p>`;

    const dins = (encontro.dinamicaIds||[]).map(id=>DB.data.dinamicas.find(d=>d.id===id)).filter(Boolean);
    if(dins.length){
      body += `<h3 class="blk-subtitulo">Dinâmicas do encontro</h3>`;
      body += dins.map(d=>`
        <div class="dyn-block">
          <h4>${this.esc(d.titulo)}</h4>
          ${d.objetivo ? `<div class="lbl">Objetivo</div><p>${this.esc(d.objetivo)}</p>`:""}
          ${d.materiais ? `<div class="lbl">Materiais</div><p>${this.esc(d.materiais)}</p>`:""}
          ${d.passos ? `<div class="lbl">Passo a passo</div><p>${this.esc(d.passos)}</p>`:""}
        </div>`).join("");
    }

    const crismandos = [...DB.data.crismandos].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    let presentes=0, faltas=0;
    const rows = crismandos.map((c,i)=>{
      const st = encontro.presencas ? encontro.presencas[c.id] : null;
      if(st==="presente") presentes++;
      if(st==="falta") faltas++;
      const marca = st==="presente" ? "✓ Presente" : (st==="falta" ? "✗ Falta" : "—");
      return `<tr><td>${i+1}</td><td>${this.esc(c.nome)}</td><td>${marca}</td></tr>`;
    }).join("");
    body += `<h3 class="blk-subtitulo">Presença</h3>`;
    body += `<div class="stat-row">
      <div class="stat-box"><b>${presentes}</b><span>Presentes</span></div>
      <div class="stat-box"><b>${faltas}</b><span>Faltas</span></div>
    </div>`;
    body += `<table><tr><th>#</th><th>Nome</th><th>Status</th></tr>${rows || `<tr><td colspan="3">Nenhum crismando cadastrado.</td></tr>`}</table>`;

    if(encontro.anotacoes && encontro.anotacoes.trim()){
      body += `<h3 class="blk-subtitulo">Anotações</h3><p class="blk-texto">${this.esc(encontro.anotacoes).replace(/\n/g,"<br>")}</p>`;
    }
    const title = "Encontro completo - "+ (encontro.tema||"Encontro");
    return { title, bodyHtml: body, fullHtml: this.wrap(body, title) };
  },

  docRelatorioFrequencia(){
    let body = this.cabecalho("Relatório de frequência geral");
    const crismandos = [...DB.data.crismandos].map(c=>({c, f: DB.frequenciaCrismando(c.id)}))
      .sort((a,b)=> (b.f.pct ?? -1) - (a.f.pct ?? -1));
    const rows = crismandos.map(({c,f})=>`
      <tr><td>${this.esc(c.nome)}</td><td>${this.esc(c.turma||"")}</td><td>${f.presencas}</td><td>${f.faltas}</td><td>${f.pct===null?"—":f.pct+"%"}</td></tr>
    `).join("");
    body += `<div class="stat-row">
      <div class="stat-box"><b>${DB.data.crismandos.length}</b><span>Crismandos</span></div>
      <div class="stat-box"><b>${DB.encontrosRealizados().length}</b><span>Encontros realizados</span></div>
      <div class="stat-box"><b>${DB.frequenciaGeralMedia()}%</b><span>Frequência média</span></div>
    </div>`;
    body += `<table><tr><th>Nome</th><th>Turma</th><th>Presenças</th><th>Faltas</th><th>%</th></tr>${rows || `<tr><td colspan="5">Nenhum crismando cadastrado.</td></tr>`}</table>`;
    const title = "Relatório de frequência";
    return { title, bodyHtml: body, fullHtml: this.wrap(body, title) };
  },

  // ---------- ações de saída ----------

  // Gera o PDF diretamente (sem passar pela caixa de impressão) usando
  // jsPDF + html2canvas, ambos embutidos no app — funciona 100% offline.
  async toPDF(bodyHtml, filenameBase){
    ensurePdfDocStyles();
    const filename = filenameBase.replace(/[^a-z0-9\-_ ]/gi,"").trim().replace(/\s+/g,"-") || "documento";

    // container fora da tela, largura fixa (equivalente a A4)
    let root = document.getElementById("pdfRenderRoot");
    if(!root){
      root = document.createElement("div");
      root.id = "pdfRenderRoot";
      document.body.appendChild(root);
    }
    root.style.cssText = "position:fixed; left:-99999px; top:0; width:794px; background:#fff; z-index:-1;";
    root.innerHTML = `<div class="pdf-doc">${bodyHtml}</div>`;

    try{
      const canvas = await html2canvas(root.firstElementChild, {
        scale: 2, backgroundColor: "#ffffff", useCORS: true, windowWidth: 794
      });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210, pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while(heightLeft > 0){
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(filename + ".pdf");
    } finally {
      root.innerHTML = "";
      root.style.cssText = "display:none;";
    }
  },

  toWord(html, filenameBase){
    const pre = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>";
    const full = html.replace("<html>", pre);
    const blob = new Blob(['\ufeff', full], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filenameBase.replace(/[^a-z0-9\-_ ]/gi,"").trim().replace(/\s+/g,"-") + ".doc";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
  }
};
