/* ============================================================
   CRISMA EM DIA — camada de dados (100% local, localStorage)
   ============================================================ */
const DB_KEY = "crismaEmDia:v1";

function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

function todayISO(){
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off*60000).toISOString().slice(0,10);
}

const DB = {
  data: null,

  defaultData(){
    return {
      config: {
        grupoNome: "Turma da Crisma",
        paroquia: "",
        catequista: "",
        anoTurma: new Date().getFullYear().toString(),
        diasAviso: 7,
        ultimoBackup: null
      },
      crismandos: [],
      encontros: [],
      dinamicas: [],
      notasGerais: [],
      cronograma: []
    };
  },

  load(){
    try{
      const raw = localStorage.getItem(DB_KEY);
      if(raw){
        this.data = JSON.parse(raw);
        // garante que campos novos existam se o app evoluir
        const def = this.defaultData();
        this.data.config = Object.assign(def.config, this.data.config || {});
        for(const k of ["crismandos","encontros","dinamicas","notasGerais","cronograma"]){
          if(!Array.isArray(this.data[k])) this.data[k] = [];
        }
      } else {
        this.data = this.defaultData();
        this.save();
      }
    }catch(e){
      console.error("Falha ao carregar dados, iniciando novo banco.", e);
      this.data = this.defaultData();
      this.save();
    }
    return this.data;
  },

  save(){
    try{
      localStorage.setItem(DB_KEY, JSON.stringify(this.data));
      return true;
    }catch(e){
      console.error("Falha ao salvar dados", e);
      return false;
    }
  },

  // ---------- CRISMANDOS ----------
  addCrismando(obj){
    const c = { id: uid(), nome: obj.nome.trim(), turma: (obj.turma||"").trim(), obs: (obj.obs||"").trim(), createdAt: Date.now() };
    this.data.crismandos.push(c);
    this.save();
    return c;
  },
  updateCrismando(id, obj){
    const c = this.data.crismandos.find(x=>x.id===id);
    if(!c) return null;
    Object.assign(c, obj);
    this.save();
    return c;
  },
  deleteCrismando(id){
    this.data.crismandos = this.data.crismandos.filter(x=>x.id!==id);
    // remove presenças associadas
    this.data.encontros.forEach(e=>{ if(e.presencas) delete e.presencas[id]; });
    this.save();
  },
  listaTurmas(){
    const set = new Set();
    this.data.crismandos.forEach(c=>{ if(c.turma && c.turma.trim()) set.add(c.turma.trim()); });
    return [...set].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  },

  // ---------- ENCONTROS ----------
  addEncontro(obj){
    const e = {
      id: uid(),
      data: obj.data,
      tema: (obj.tema||"").trim(),
      temaDoMes: (obj.temaDoMes||"").trim(),
      local: (obj.local||"").trim(),
      roteiro: [],
      dinamicaIds: [],
      anotacoes: "",
      presencas: {},
      createdAt: Date.now()
    };
    this.data.encontros.push(e);
    this.save();
    return e;
  },
  updateEncontro(id, obj){
    const e = this.data.encontros.find(x=>x.id===id);
    if(!e) return null;
    Object.assign(e, obj);
    this.save();
    return e;
  },
  deleteEncontro(id){
    this.data.encontros = this.data.encontros.filter(x=>x.id!==id);
    this.save();
  },
  getEncontro(id){
    return this.data.encontros.find(x=>x.id===id) || null;
  },
  sortedEncontros(){
    return [...this.data.encontros].sort((a,b)=> a.data < b.data ? 1 : -1);
  },
  proximoEncontro(){
    const today = todayISO();
    const futuros = this.data.encontros.filter(e=>e.data >= today).sort((a,b)=> a.data > b.data ? 1 : -1);
    return futuros[0] || null;
  },
  ultimoTemaDoMes(){
    const comTema = [...this.data.encontros].filter(e=>e.temaDoMes && e.temaDoMes.trim()).sort((a,b)=> a.data < b.data ? 1 : -1);
    return comTema[0] ? comTema[0].temaDoMes : "";
  },
  encontrosRealizados(){
    const today = todayISO();
    return this.data.encontros.filter(e=>e.data < today || e.data === today);
  },

  // ---------- ROTEIRO (dentro de um encontro) ----------
  addBlocoRoteiro(encontroId, tipo, conteudo=""){
    const e = this.getEncontro(encontroId);
    if(!e) return null;
    const b = { id: uid(), tipo, conteudo };
    e.roteiro.push(b);
    this.save();
    return b;
  },
  updateBlocoRoteiro(encontroId, blocoId, obj){
    const e = this.getEncontro(encontroId);
    if(!e) return null;
    const b = e.roteiro.find(x=>x.id===blocoId);
    if(!b) return null;
    Object.assign(b, obj);
    this.save();
    return b;
  },
  deleteBlocoRoteiro(encontroId, blocoId){
    const e = this.getEncontro(encontroId);
    if(!e) return;
    e.roteiro = e.roteiro.filter(x=>x.id!==blocoId);
    this.save();
  },
  moveBlocoRoteiro(encontroId, blocoId, dir){
    const e = this.getEncontro(encontroId);
    if(!e) return;
    const idx = e.roteiro.findIndex(x=>x.id===blocoId);
    if(idx<0) return;
    const newIdx = idx + dir;
    if(newIdx<0 || newIdx>=e.roteiro.length) return;
    const [item] = e.roteiro.splice(idx,1);
    e.roteiro.splice(newIdx,0,item);
    this.save();
  },

  // ---------- PRESENÇA ----------
  setPresenca(encontroId, crismandoId, status){
    const e = this.getEncontro(encontroId);
    if(!e) return;
    if(!e.presencas) e.presencas = {};
    e.presencas[crismandoId] = status; // 'presente' | 'falta'
    this.save();
  },
  frequenciaCrismando(crismandoId){
    let presencas=0, faltas=0;
    this.data.encontros.forEach(e=>{
      const st = e.presencas ? e.presencas[crismandoId] : null;
      if(st==="presente") presencas++;
      else if(st==="falta") faltas++;
    });
    const total = presencas+faltas;
    const pct = total>0 ? Math.round((presencas/total)*100) : null;
    return {presencas, faltas, total, pct};
  },
  frequenciaGeralMedia(){
    const cs = this.data.crismandos;
    if(cs.length===0) return 0;
    let soma=0, count=0;
    cs.forEach(c=>{
      const f = this.frequenciaCrismando(c.id);
      if(f.pct!==null){ soma+=f.pct; count++; }
    });
    return count>0 ? Math.round(soma/count) : 0;
  },

  // ---------- DINÂMICAS ----------
  addDinamica(obj){
    const d = {
      id: uid(),
      titulo: (obj.titulo||"").trim(),
      objetivo: (obj.objetivo||"").trim(),
      materiais: (obj.materiais||"").trim(),
      passos: (obj.passos||"").trim(),
      observacoes: (obj.observacoes||"").trim(),
      createdAt: Date.now()
    };
    this.data.dinamicas.push(d);
    this.save();
    return d;
  },
  updateDinamica(id, obj){
    const d = this.data.dinamicas.find(x=>x.id===id);
    if(!d) return null;
    Object.assign(d, obj);
    this.save();
    return d;
  },
  deleteDinamica(id){
    this.data.dinamicas = this.data.dinamicas.filter(x=>x.id!==id);
    this.data.encontros.forEach(e=>{ e.dinamicaIds = (e.dinamicaIds||[]).filter(x=>x!==id); });
    this.save();
  },

  // ---------- NOTAS GERAIS ----------
  addNotaGeral(obj){
    const n = { id: uid(), titulo:(obj.titulo||"").trim(), conteudo:(obj.conteudo||"").trim(), data: obj.data || todayISO(), createdAt: Date.now() };
    this.data.notasGerais.push(n);
    this.save();
    return n;
  },
  updateNotaGeral(id, obj){
    const n = this.data.notasGerais.find(x=>x.id===id);
    if(!n) return null;
    Object.assign(n, obj);
    this.save();
    return n;
  },
  deleteNotaGeral(id){
    this.data.notasGerais = this.data.notasGerais.filter(x=>x.id!==id);
    this.save();
  },

  // ---------- BUSCA DE TEMAS (encontros + dinâmicas) ----------
  buscarTemas(query){
    const q = query.trim().toLowerCase();
    if(!q) return [];
    const results = [];
    this.data.encontros.forEach(e=>{
      let hit = false;
      let trecho = "";
      if((e.tema||"").toLowerCase().includes(q)){ hit = true; trecho = e.tema; }
      if(!hit && (e.temaDoMes||"").toLowerCase().includes(q)){ hit = true; trecho = e.temaDoMes; }
      if(!hit){
        for(const b of e.roteiro){
          if((b.conteudo||"").toLowerCase().includes(q)){ hit=true; trecho = b.conteudo.slice(0,90); break; }
        }
      }
      if(!hit && (e.anotacoes||"").toLowerCase().includes(q)){ hit=true; trecho = e.anotacoes.slice(0,90); }
      if(hit) results.push({ tipo:"encontro", encontro: e, trecho });
    });
    this.data.dinamicas.forEach(d=>{
      const titulo = d.titulo||"";
      const camposExtra = [d.objetivo, d.materiais, d.passos, d.observacoes];
      let hit = false, trecho = "";
      if(titulo.toLowerCase().includes(q)){ hit = true; trecho = titulo; }
      if(!hit){
        for(const campo of camposExtra){
          if(campo && campo.toLowerCase().includes(q)){ hit = true; trecho = campo.slice(0,90); break; }
        }
      }
      if(hit) results.push({ tipo:"dinamica", dinamica: d, trecho });
    });
    results.sort((a,b)=>{
      const da = a.tipo==="encontro" ? a.encontro.data : "0000-00-00";
      const dbb = b.tipo==="encontro" ? b.encontro.data : "0000-00-00";
      return da < dbb ? 1 : -1;
    });
    return results;
  },

  // ---------- CRONOGRAMA ----------
  addMesCronograma(obj){
    const m = { id: uid(), mes: (obj.mes||"").trim(), temaDoMes: (obj.temaDoMes||"").trim(), semanas: [] };
    this.data.cronograma.push(m);
    this.save();
    return m;
  },
  updateMesCronograma(id, obj){
    const m = this.data.cronograma.find(x=>x.id===id);
    if(!m) return null;
    Object.assign(m, obj);
    this.save();
    return m;
  },
  deleteMesCronograma(id){
    this.data.cronograma = this.data.cronograma.filter(x=>x.id!==id);
    this.save();
  },
  moveMesCronograma(id, dir){
    const idx = this.data.cronograma.findIndex(x=>x.id===id);
    if(idx<0) return;
    const newIdx = idx + dir;
    if(newIdx<0 || newIdx>=this.data.cronograma.length) return;
    const [item] = this.data.cronograma.splice(idx,1);
    this.data.cronograma.splice(newIdx,0,item);
    this.save();
  },
  addSemanaCronograma(mesId, tema){
    const m = this.data.cronograma.find(x=>x.id===mesId);
    if(!m) return null;
    const s = { id: uid(), numero: m.semanas.length+1, tema: (tema||"").trim() };
    m.semanas.push(s);
    this.save();
    return s;
  },
  updateSemanaCronograma(mesId, semanaId, tema){
    const m = this.data.cronograma.find(x=>x.id===mesId);
    if(!m) return null;
    const s = m.semanas.find(x=>x.id===semanaId);
    if(!s) return null;
    s.tema = (tema||"").trim();
    this.save();
    return s;
  },
  deleteSemanaCronograma(mesId, semanaId){
    const m = this.data.cronograma.find(x=>x.id===mesId);
    if(!m) return;
    m.semanas = m.semanas.filter(x=>x.id!==semanaId);
    m.semanas.forEach((s,i)=> s.numero = i+1);
    this.save();
  },

  // ---------- BACKUP ----------
  diasDesdeBackup(){
    if(!this.data.config.ultimoBackup) return null;
    const last = new Date(this.data.config.ultimoBackup);
    const now = new Date();
    return Math.floor((now-last)/86400000);
  },
  marcarBackupFeito(){
    this.data.config.ultimoBackup = new Date().toISOString();
    this.save();
  },
  temDadosRelevantes(){
    return this.data.crismandos.length>0 || this.data.encontros.length>0;
  },
  exportJSON(){
    return JSON.stringify(this.data, null, 2);
  },
  importJSON(str){
    const parsed = JSON.parse(str);
    if(!parsed || typeof parsed !== "object") throw new Error("Arquivo inválido");
    this.data = parsed;
    const def = this.defaultData();
    this.data.config = Object.assign(def.config, this.data.config||{});
    for(const k of ["crismandos","encontros","dinamicas","notasGerais","cronograma"]){
      if(!Array.isArray(this.data[k])) this.data[k] = [];
    }
    this.save();
  }
};
