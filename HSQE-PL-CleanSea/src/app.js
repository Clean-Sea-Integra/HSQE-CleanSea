import Chart from 'chart.js/auto';
import { supabase } from './lib/supabase.js';
import html2canvas from 'html2canvas';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';


/* ============ CONFIG ============ */
const TYPES = {
  NC:  {label:'No Conformidad',      color:'#7A3B9E'},
  OBS: {label:'Observación',         color:'#2C7FB8'},
  OM:  {label:'Oportunidad de Mejora', color:'#4C8C4A'},
  LA:  {label:'Lección Aprendida',   color:'#2C8C6B'},
  ACC: {label:'Accidente Personal',  color:'#C0392B'},
  INC: {label:'Incidente',           color:'#0A3A66'},
  CUA: {label:'Cuasi Accidente',     color:'#B07D0A'},
  AI:  {label:'Acto Inseguro',       color:'#B07D0A'},
  CI:  {label:'Condición Insegura',  color:'#B07D0A'},
};
const STATUS = {
  'Abierto':    '#C0392B',
  'En Proceso': '#B07D0A',
  'Cerrado':    '#1E7A4A',
};
// Normaliza estados heredados (femenino) a los 3 estados oficiales (masculino).
// Permite que los registros ya guardados en Supabase se muestren bien sin migración.
function normalizeEstado(e){
  const v = (e||'').trim();
  if(v === 'Abierta') return 'Abierto';
  if(v === 'En Progreso') return 'En Proceso';
  if(v === 'Cerrada') return 'Cerrado';
  if(STATUS[v]) return v;
  return 'Abierto'; // valor por defecto seguro
}
function esCerrado(estado){ return normalizeEstado(estado) === 'Cerrado'; }
const SEV_COLORS = {Baja:'#5B6671',Media:'#B07D0A',Alta:'#0A3A66',Crítica:'#C0392B'};
const SEV_BG = {Baja:'#EEF0F1',Media:'#FBF1D6',Alta:'#FCE4D6',Crítica:'#F7D9D3'};
const ACCION_ESTADOS = ['Abierto','En Proceso','Cerrado'];
const ACCION_ESTADO_COLOR = {'Abierto':'#C0392B','En Proceso':'#B07D0A','Cerrado':'#1E7A4A'};
const ACCION_ESTADO_BG = {'Abierto':'#F7D9D3','En Proceso':'#FBF1D6','Cerrado':'#E1EFE4'};
const CLASIF_OCIMF = ['','LTI - Lesión con Tiempo Perdido','MTI - Lesión con Tratamiento Médico','RWC - Trabajo Restringido','FAC - Primeros Auxilios','NM - Casi Accidente (Near Miss)','MTC - Daño Material'];

// Tipos que llevan Clasificación OCIMF/TMSA (solo Accidente e Incidente)
const DEFAULT_LOGOS = {
  cleansea: "/cleansea.png",
  ploffshore: "/PL.png",
};
function guessDefaultLogo(companyName){
  const n = (companyName||'').toLowerCase();
  if(n.includes('clean')) return DEFAULT_LOGOS.cleansea;
  if(n.includes('offshore') || n.includes('parana') || n.includes('paraná')) return DEFAULT_LOGOS.ploffshore;
  return null;
}
function getCompanyLogo(companyId){
  const co = DATA.companies.find(c=>c.id===companyId);
  if(!co) return null;
  if(co.logo) return co.logo;
  return guessDefaultLogo(co.name);
}

const TIPOS_CON_OCIMF = ['ACC'];

// Tipos que llevan bloque "Clasificación y Cumplimiento" (NC / Observación / Oportunidad de Mejora / Lección Aprendida)
const TIPOS_CON_CLASIF_ORIGEN = ['NC','OBS','OM','LA'];
let CLASIF_ORIGEN = ['','ISO','ISM','PNA','Inspección HSQE','Cliente','No Aplica'];

// Oportunidad de Mejora y Lección Aprendida no llevan causa raíz/acción correctiva; llevan datos de comunicación
// Solo Lección Aprendida no lleva causa raíz/acción correctiva; lleva datos de comunicación.
// Oportunidad de Mejora se trata igual que Observación / No Conformidad (con causa raíz y acción correctiva).
const TIPOS_SIN_CAUSA_ACCION = ['LA'];
const MEDIOS_COMUNICACION = ['','Reunión de Seguridad','Correo Electrónico','Cartelera / Boletín HSQE','Charla de Seguridad (Toolbox Talk)','Sistema de Gestión (SGS)','Otro'];

// Tipos que llevan campo "Lecciones Aprendidas" como parte del registro (Accidente / Incidente / Cuasi Accidente)
const TIPOS_CON_LECCIONES = ['NC','OBS','ACC','INC','CUA','AI','CI'];

// La severidad solo aplica a estos tipos; para NC/Observación/Oportunidad de Mejora/Lección Aprendida no tiene sentido.
const TIPOS_CON_SEVERIDAD = ['ACC','INC','CUA','AI','CI'];

const NATURALEZA_CUASI = ['','Personal','Material','Ambas'];

// ===== Datos ambientales del incidente (según formulario "Detalle de viento e iluminación") =====
const FUERZA_VIENTO = ['N/A','0 - Calma','1 - Ventolina','2 - Viento suave','3 - Viento leve','4 - Viento moderado','5 - Viento regular','6 - Viento fuerte','7 - Viento muy fuerte','8 - Temporal','9 - Temporal fuerte','10 - Temporal muy fuerte','11 - Tempestad','12 - Huracán','> 12'];
const ESTADO_MAR = ['N/A','Calma','Rizada','Marejadilla','Marejada','Marejada fuerte','Gruesa','Muy gruesa','Arbolada','Montañosa','Caótica'];
const FUENTE_LUZ = ['N/A','Luz del día completa','Luz del día parcial','Luz del día ensombrecida','Iluminación de cubierta adecuada','Iluminación de cubierta buena','Iluminación de cubierta pobre','Iluminación interior adecuada','Iluminación interior buena','Iluminación interior pobre','Luz de luna completa','Luz de luna parcial','Noche cerrada','Linterna','Otra'];

// Preguntas guía para la descripción de un Incidente
const INC_PREGUNTAS = [
  'Describa qué pasó.',
  'Operación al momento del incidente.',
  '¿Quién estuvo involucrado?',
  '¿Qué equipo estuvo involucrado y bajo qué situación (incluyendo las condiciones del equipo)?',
  '¿Hubo materiales involucrados? (Pintura, cargamento, combustible, etc.)',
  '¿Hubo factores ambientales involucrados? (Ruido, gases, iluminación, etc.)',
  '¿Cómo y por qué sucedió el incidente de acuerdo a su punto de vista?',
  '¿Hubo incumplimiento al SGS o a regulaciones aplicables?',
];

let CATEGORIAS_ACTO_INSEGURO = ['Falta de EPP','Falta de atención','Falta de control','Incumplimiento del SGS','Incumplimiento de órdenes','Otros'];
let CATEGORIAS_CONDICION_INSEGURA = ['Falta de arrancho','Arrancho inadecuado','Equipo desafectado','Equipo defectuoso','Falta de limpieza','Falta de señalización','Otros'];
let TIPIFICACION_INCIDENTE = ['Daño a la carga','Daño al buque','Daño a equipo','Derrame','Otros'];

// Tipificación de causa raíz: disponible en todos los reportes que tienen bloque de Causa Raíz / Acciones
// (NC, Observación, Oportunidad de Mejora, Accidente, Incidente, Cuasi Accidente, Acto Inseguro, Condición Insegura).
let TIPIFICACION_CAUSA_RAIZ = ['','Falta de Procedimiento','Falta de Capacitación / Entrenamiento','Falla de Equipo o Material',
  'Falta de Supervisión','Incumplimiento de Procedimiento','Factor Humano','Diseño o Ingeniería Inadecuados',
  'Mantenimiento Deficiente','Comunicación Deficiente','Otros'];

const TIPO_LESION = ['',
  'Contusiones','Escoriaciones','Heridas cortantes','Heridas punzantes','Heridas contuso/anfractuosas',
  'Torceduras','Esguinces','Luxaciones','Fracturas cerradas','Fracturas expuestas','Amputaciones','Desgarro',
  'Distensión muscular','Efectos de compresión y aplastamiento','Quemaduras térmicas','Quemaduras químicas',
  'Contacto directo con el fuego','Cuerpo extraño en ojos','Efectos de la electricidad','Intoxicaciones','Asfixia',
  'Infecciones','Lesiones inflamatorias cutáneas','Traumatismos internos','Efectos por picadura',
  'Efectos de calor e insolación','Efectos del frío','Otras lesiones no detalladas'];
const PARTE_CUERPO = ['',
  'Región craneana (cráneo, cuero cabelludo)','Ojos','Oído','Nariz','Boca (labios, dientes, lengua)','Cara',
  'Cabeza, ubicaciones múltiples','Cuello','Región cervical','Región dorsal','Región lumbosacra','Tórax','Abdomen',
  'Pelvis','Tronco, ubicaciones múltiples','Hombro','Brazo','Codo','Antebrazo','Muñeca','Mano (excepto los dedos)',
  'Dedos de las manos','Miembro superior, ubicaciones múltiples','Cadera','Muslo','Rodilla','Pierna','Tobillo',
  'Pie (excepto los dedos)','Dedos de los pies','Miembro inferior, ubicaciones múltiples','Piel',
  'Ubicaciones múltiples','Otra'];

let modalAttachments = [];
let modalLecciones = [];
let modalInvestigadores = [];
let modalAccionesCorrectivas = [];
let modalAccionesPreventivas = [];
let presetCategoriaEvento = null;

let DATA = { companies: [], records: [], visadores: [] };
let currentTypeFilter = 'ALL';
let currentSiteFilter = 'ALL';

/* ============ USUARIO ACTUAL Y VISADO (Responsable HSQE/DPA) ============ */
let CURRENT_USER = null; // email de la sesión activa (se setea en initApp)

// Visador por defecto (se puede administrar desde "Gestionar usuarios / visadores").
// Nota: los dominios de correo no admiten acentos ni ñ; se usa 'paranalogistica' (sin acento).
// TODO Clean Sea: actualizar el visador por defecto (tambien editable desde 'Gestionar usuarios / visadores').
const VISADOR_DEFAULT = { email: 'emartinez@paranalogistica.com.ar', nombre: 'Emmanuel Martinez', cargo: 'Gte. HSQE/DPA' };

// Normaliza email para comparar: minúsculas + sin acentos (tolera 'logística' vs 'logistica').
function normEmail(e){
  return (e||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function getVisadores(){ return Array.isArray(DATA.visadores) ? DATA.visadores : []; }
function getVisador(email){
  const n = normEmail(email);
  return getVisadores().find(v => normEmail(v.email) === n) || null;
}
function esVisador(email){ return !!getVisador(email); }
function usuarioActualPuedeVisar(){ return esVisador(CURRENT_USER); }
let editingId = null;
let charts = {};

/* ============ PERSISTENCE (Supabase) ============ */
async function loadData(){
  try{
    const [regRes, catRes, cfgRes] = await Promise.all([
      supabase.from('hsqe_cs_registros').select('data').order('fecha', { ascending: false }),
      supabase.from('hsqe_cs_catalogos').select('data').eq('id', 1).maybeSingle(),
      supabase.from('hsqe_cs_config').select('data').eq('id', 1).maybeSingle(),
    ]);
    if(regRes.error) throw regRes.error;
    if(catRes.error) throw catRes.error;
    if(cfgRes.error) throw cfgRes.error;
    DATA.records   = (regRes.data || []).map(r => {
      const d = r.data || {};
      d.estado = normalizeEstado(d.estado);
      return d;
    });
    DATA.catalogos = (catRes.data && catRes.data.data) ? catRes.data.data : {};
    DATA.companies = (cfgRes.data && cfgRes.data.data && Array.isArray(cfgRes.data.data.companies)) ? cfgRes.data.data.companies : [];
    DATA.scorecardTargets = (cfgRes.data && cfgRes.data.data && cfgRes.data.data.scorecardTargets) ? cfgRes.data.data.scorecardTargets : {};
    DATA.visadores = (cfgRes.data && cfgRes.data.data && Array.isArray(cfgRes.data.data.visadores)) ? cfgRes.data.data.visadores : [];
    if(DATA.visadores.length === 0){ DATA.visadores = [ {...VISADOR_DEFAULT} ]; await saveConfig(); }
    if(DATA.companies.length === 0){ seedDefaults(); await saveConfig(); }
  }catch(e){
    console.error('Error cargando datos HSQE:', e && e.message ? e.message : e);
    showToast('Error al cargar datos — verificá la conexión');
    if(!Array.isArray(DATA.companies) || DATA.companies.length === 0) seedDefaults();
  }
  ensureCatalogos();
  renderAll();
}

async function upsertRegistro(rec){
  try{
    const row = {
      id: rec.id,
      tipo: rec.tipo,
      instalacion: rec.instalacion || null,
      fecha: rec.fecha || null,
      estado: rec.estado || null,
      data: rec,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('hsqe_cs_registros').upsert(row);
    if(error) throw error;
    return true;
  }catch(e){
    console.error('Error guardando registro:', e && e.message ? e.message : e);
    showToast('Error al guardar el registro');
    return false;
  }
}

async function deleteRegistroRow(id){
  try{
    const { error } = await supabase.from('hsqe_cs_registros').delete().eq('id', id);
    if(error) throw error;
    return true;
  }catch(e){
    console.error('Error eliminando registro:', e && e.message ? e.message : e);
    showToast('Error al eliminar el registro');
    return false;
  }
}

async function saveCatalogos(){
  try{
    const { error } = await supabase.from('hsqe_cs_catalogos')
      .upsert({ id: 1, data: DATA.catalogos, updated_at: new Date().toISOString() });
    if(error) throw error;
    return true;
  }catch(e){
    console.error('Error guardando catálogos:', e && e.message ? e.message : e);
    showToast('Error al guardar catálogos');
    return false;
  }
}

async function saveConfig(){
  try{
    const { error } = await supabase.from('hsqe_cs_config')
      .upsert({ id: 1, data: { companies: DATA.companies, scorecardTargets: DATA.scorecardTargets, visadores: DATA.visadores }, updated_at: new Date().toISOString() });
    if(error) throw error;
    return true;
  }catch(e){
    console.error('Error guardando configuración:', e && e.message ? e.message : e);
    showToast('Error al guardar configuración');
    return false;
  }
}

// saveData genérico: persiste catálogos + configuración (los registros van por fila con upsertRegistro)
async function saveData(){
  await Promise.all([saveCatalogos(), saveConfig()]);
}

async function refreshData(){
  showToast('Actualizando datos...');
  await loadData();
  showToast('Datos actualizados');
}

function ensureCatalogos(){
  if(!DATA.catalogos) DATA.catalogos = {};
  const c = DATA.catalogos;
  if(!Array.isArray(c.personas)) c.personas = [];
  if(!Array.isArray(c.clasifOrigen)) c.clasifOrigen = CLASIF_ORIGEN.slice();
  if(!Array.isArray(c.categoriasActoInseguro)) c.categoriasActoInseguro = CATEGORIAS_ACTO_INSEGURO.slice();
  if(!Array.isArray(c.categoriasCondicionInsegura)) c.categoriasCondicionInsegura = CATEGORIAS_CONDICION_INSEGURA.slice();
  if(!Array.isArray(c.tipificacionIncidente)) c.tipificacionIncidente = TIPIFICACION_INCIDENTE.slice();
  if(!Array.isArray(c.tipificacionCausaRaiz)) c.tipificacionCausaRaiz = TIPIFICACION_CAUSA_RAIZ.slice();
  if(!c.dotacionMensual || typeof c.dotacionMensual !== 'object' || Array.isArray(c.dotacionMensual)) c.dotacionMensual = {};
  ordenarAlfa(c.personas);
  ordenarAlfa(c.clasifOrigen);
  ordenarAlfa(c.categoriasActoInseguro);
  ordenarAlfa(c.categoriasCondicionInsegura);
  ordenarAlfa(c.tipificacionIncidente);
  ordenarAlfa(c.tipificacionCausaRaiz);
  if(DATA.companies[0]) ordenarAlfa(DATA.companies[0].vessels);
  CLASIF_ORIGEN = c.clasifOrigen;
  CATEGORIAS_ACTO_INSEGURO = c.categoriasActoInseguro;
  CATEGORIAS_CONDICION_INSEGURA = c.categoriasCondicionInsegura;
  TIPIFICACION_INCIDENTE = c.tipificacionIncidente;
  TIPIFICACION_CAUSA_RAIZ = c.tipificacionCausaRaiz;
}
function seedDefaults(){
  DATA.companies = [
    {id:'CS', name:'Clean Sea', vessels:[]},
  ];
  DATA.records = [];
}

/* ============ HELPERS ============ */
function uid(){ return Math.random().toString(36).slice(2,8).toUpperCase(); }
function ordenarAlfa(arr){ arr.sort((a,b)=>a.localeCompare(b, 'es', {sensitivity:'base'})); return arr; }
function generateRecordId(tipo, fechaStr){
  const year = fechaStr ? new Date(fechaStr+'T00:00:00').getFullYear() : new Date().getFullYear();
  const count = DATA.records.filter(r => r.tipo === tipo && r.fecha && new Date(r.fecha+'T00:00:00').getFullYear() === year).length;
  const num = String(count + 1).padStart(3,'0');
  return `${tipo}-${num}-${year}`;
}
function todayISO(){ return new Date().toISOString().slice(0,10); }
function fmtDate(d){ if(!d) return '—'; const p=d.split('-'); return p.length===3? `${p[2]}/${p[1]}/${p[0]}` : d; }
function isOverdue(r){
  if(esCerrado(r.estado)) return false;
  if(TIPOS_SIN_CAUSA_ACCION.includes(r.tipo)){
    if(!r.fecha_vencimiento) return false;
    return r.fecha_vencimiento < todayISO();
  }
  return todasAcciones(r).some(a => a.estado !== 'Cerrado' && a.vencimiento && a.vencimiento < todayISO());
}
function isDueSoon(r){
  if(esCerrado(r.estado)) return false;
  const hoy = todayISO();
  const limite = new Date(); limite.setDate(limite.getDate()+30);
  const limiteISO = limite.toISOString().slice(0,10);
  if(TIPOS_SIN_CAUSA_ACCION.includes(r.tipo)){
    if(!r.fecha_vencimiento) return false;
    return r.fecha_vencimiento >= hoy && r.fecha_vencimiento <= limiteISO;
  }
  return todasAcciones(r).some(a => a.estado !== 'Cerrado' && a.vencimiento && a.vencimiento >= hoy && a.vencimiento <= limiteISO);
}
function todasAcciones(r){
  return [...(Array.isArray(r.acciones_correctivas)?r.acciones_correctivas:[]), ...(Array.isArray(r.acciones_preventivas)?r.acciones_preventivas:[])];
}
function accionesResumen(r){
  if(TIPOS_SIN_CAUSA_ACCION.includes(r.tipo)){
    return { responsable: r.responsable || '—', vencimiento: r.fecha_vencimiento || '' };
  }
  const acciones = todasAcciones(r);
  if(acciones.length === 0) return { responsable: '—', vencimiento: '' };
  const pendientes = acciones.filter(a => a.estado !== 'Cerrado');
  const relevantes = pendientes.length ? pendientes : acciones;
  const nombres = [...new Set(relevantes.map(a => a.responsable).filter(Boolean))];
  const fechas = relevantes.map(a => a.vencimiento).filter(Boolean).sort();
  return { responsable: nombres.length ? nombres.join(', ') : '—', vencimiento: fechas[0] || '' };
}
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.display='block';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.style.display='none', 2200);
}
function allVessels(){
  let v = [];
  DATA.companies.forEach(c => c.vessels.forEach(x => v.push({company:c.name, vessel:x})));
  return v;
}

/* ============ NAV / SIDEBAR ============ */

/* Fix de layout: evita que el contenido del sidebar (categorias + config + sesion)
   quede cortado cuando la suma de esas secciones supera el alto de la pantalla (100vh).
   Se aplica desde el codigo (no toca style.css): agrega scroll interno propio al sidebar
   y evita que el header/marca y el bloque de sesion se compriman. */
function fixSidebarLayout(){
  if(document.getElementById('sidebarScrollFix')) return;
  const style = document.createElement('style');
  style.id = 'sidebarScrollFix';
  style.textContent = `
    .sidebar{overflow-y:auto !important;overflow-x:hidden !important;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.25) transparent;}
    .sidebar::-webkit-scrollbar{width:6px;}
    .sidebar::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.18);border-radius:4px;}
    .sidebar::-webkit-scrollbar-track{background:transparent;}
    .sidebar .brand{flex-shrink:0;}
    .sidebar .session-block{flex-shrink:0;}
  `;
  document.head.appendChild(style);
}

function renderSiteSelect(){
  const sel = document.getElementById('siteFilter');
  const sitios = (DATA.companies[0] && DATA.companies[0].vessels) || [];
  sel.innerHTML = `<option value="ALL">Todos los sitios</option>` +
    sitios.map(v=>`<option value="${v}">${v}</option>`).join('');
  sel.value = currentSiteFilter;
}
function setSiteFilter(v){ currentSiteFilter = v; renderAll(); }

function renderTypeNav(){
  const wrap = document.getElementById('typeNav');
  const filtered = filteredRecords(true);
  let html = `<div class="nav-label">Categorías</div>`;
  html += navItem('ALL', 'Todos los registros', '#B7C4CE', filtered.length);
  Object.keys(TYPES).forEach(k=>{
    const c = filtered.filter(r=>r.tipo===k).length;
    html += navItem(k, TYPES[k].label, TYPES[k].color, c);
  });
  html += `<div class="nav-item ${currentTypeFilter==='KPI'?'active':''}" onclick="setTypeFilter('KPI')" style="margin-top:6px;">
    <span class="nav-dot" style="background:#0A3A66"></span>KPI HSQE
  </div>`;
  wrap.innerHTML = html;
}
function navItem(key, label, color, count){
  const active = currentTypeFilter===key ? 'active' : '';
  return `<div class="nav-item ${active}" onclick="setTypeFilter('${key}')">
    <span class="nav-dot" style="background:${color}"></span>${label}
    <span class="nav-count">${count}</span>
  </div>`;
}
function setTypeFilter(k){ currentTypeFilter = k; renderAll(); }
function clearFilters(){
  document.getElementById('searchBox').value='';
  document.getElementById('statusFilter').value='';
  document.getElementById('sevFilter').value='';
  document.getElementById('overdueFilter').value='';
  renderTable();
}

/* ============ FILTERING ============ */
function filteredRecords(bySiteOnly){
  let r = DATA.records.filter(x => currentSiteFilter==='ALL' || x.instalacion===currentSiteFilter);
  if(!bySiteOnly && currentTypeFilter!=='ALL') r = r.filter(x=>x.tipo===currentTypeFilter);
  return r;
}
function applyTableFilters(list){
  const q = (document.getElementById('searchBox')?.value||'').toLowerCase();
  const st = document.getElementById('statusFilter')?.value||'';
  const sv = document.getElementById('sevFilter')?.value||'';
  const ov = document.getElementById('overdueFilter')?.value||'';
  return list.filter(r=>{
    if(q && !(`${r.titulo} ${r.descripcion} ${r.area} ${accionesResumen(r).responsable} ${r.reportado_por}`.toLowerCase().includes(q))) return false;
    if(st && r.estado!==st) return false;
    if(sv && r.severidad!==sv) return false;
    if(ov==='overdue' && !isOverdue(r)) return false;
    return true;
  });
}

/* ============ RENDER: KPI ============ */
function renderKPIs(){
  const list = filteredRecords(false);
  const abiertas = list.filter(r=>!esCerrado(r.estado)).length;
  const vencidas = list.filter(isOverdue).length;
  const porVencer = list.filter(isDueSoon).length;

  const cards = [
    {val:list.length, lbl:'Registros totales', alert:false},
    {val:abiertas, lbl:'Abiertas / en curso', alert:abiertas>0},
    {val:vencidas, lbl:'Acciones vencidas', alert:vencidas>0},
    {val:porVencer, lbl:'Acciones por vencer (30 días)', alert:porVencer>0},
  ];
  document.getElementById('kpiRow').innerHTML = cards.map(c=>`
    <div class="kpi-card ${c.alert?'alert':''}">
      <div class="val">${c.val}</div>
      <div class="lbl">${c.lbl}</div>
    </div>`).join('');
}

/* ============ KPI OCIMF — FRECUENCIA DE LESIONES (Marine Injury Guideline) ============
   Base de exposición fija: 12 tripulantes x 24 horas/día (a bordo, criterio OCIMF).
   Tasas expresadas cada 1.000.000 de horas-hombre (estándar OCIMF/IMCA). */
const OCIMF_EXPOSURE_CREW = 12;
const OCIMF_HOURS_PER_DAY = 24;
const OCIMF_MULTIPLIER = 1000000;
const SCORECARD_DEFAULT_TARGETS = { trcf:20, ltif:20, nnc_cia_ext:4, nnc_cia_int:4, nnc_buq_ext:4, nnc_buq_int:4 };

function daysBetweenInclusive(desde, hasta){
  if(!desde || !hasta) return 0;
  const d1 = new Date(desde+'T00:00:00');
  const d2 = new Date(hasta+'T00:00:00');
  const diff = Math.round((d2-d1)/(1000*60*60*24)) + 1;
  return diff > 0 ? diff : 0;
}
function crewForMonth(ym){
  const dot = (DATA.catalogos && DATA.catalogos.dotacionMensual) || {};
  return (typeof dot[ym] === 'number') ? dot[ym] : 0; // sin default: mes sin dotacion cargada = 0 h
}
function mesesEnRango(desde, hasta){
  const meses = [];
  if(!desde || !hasta) return meses;
  let cur = new Date(desde.slice(0,7)+'-01T00:00:00');
  const end = new Date(hasta.slice(0,7)+'-01T00:00:00');
  while(cur <= end){
    meses.push(cur.toISOString().slice(0,7));
    cur.setMonth(cur.getMonth()+1);
  }
  return meses;
}
function computeExposureHours(desde, hasta){
  let total = 0;
  let cur = new Date(desde+'T00:00:00');
  const end = new Date(hasta+'T00:00:00');
  while(cur <= end){
    const ym = cur.toISOString().slice(0,7);
    total += crewForMonth(ym) * OCIMF_HOURS_PER_DAY;
    cur.setDate(cur.getDate()+1);
  }
  return total;
}

function renderOcimfKpi(){
  const panel = document.getElementById('ocimfKpiPanel');
  if(!panel) return;
  if(currentTypeFilter !== 'KPI'){ panel.style.display = 'none'; return; }
  panel.style.display = 'block';

  const desdeEl = document.getElementById('ocimfDesde');
  const hastaEl = document.getElementById('ocimfHasta');
  if(!desdeEl.value) desdeEl.value = `${new Date().getFullYear()}-01-01`;
  if(!hastaEl.value) hastaEl.value = new Date().toISOString().slice(0,10);
  const desde = desdeEl.value, hasta = hastaEl.value;

  const list = filteredRecords(true).filter(r =>
    r.tipo === 'ACC' && r.incluir_kpi && r.fecha >= desde && r.fecha <= hasta);

  const contar = prefijo => list.filter(r => (r.clasificacion||'').startsWith(prefijo)).length;
  const lti = contar('LTI');
  const mti = contar('MTI');
  const rwc = contar('RWC');
  const fac = contar('FAC');
  const trc = lti + mti + rwc;

  const dias = daysBetweenInclusive(desde, hasta);
  const exposicionHoras = computeExposureHours(desde, hasta);
  const sinExp = exposicionHoras === 0;
  const tasa = n => n === 0 ? 0 : (sinExp ? null : +((n * OCIMF_MULTIPLIER) / exposicionHoras).toFixed(2));

  const ltif = tasa(lti);
  const trcf = tasa(trc);
  const showTasa = v => v === null ? 's/d' : v;

  const cards = [
    {val: lti, lbl:'LTI — Lesión con tiempo perdido', alert: lti>0},
    {val: trc, lbl:'Casos registrables (LTI + RWC + MTI)', alert: trc>0},
    {val: showTasa(ltif), lbl:'LTIF (cada 1.000.000 h-h)', alert: ltif!==null && ltif>0},
    {val: showTasa(trcf), lbl:'TRCF (cada 1.000.000 h-h)', alert: trcf!==null && trcf>0},
  ];
  document.getElementById('ocimfKpiRow').innerHTML = cards.map(c=>`
    <div class="kpi-card ${c.alert?'alert':''}">
      <div class="val">${c.val}</div>
      <div class="lbl">${c.lbl}</div>
    </div>`).join('');

  const dot = (DATA.catalogos && DATA.catalogos.dotacionMensual) || {};
  const meses = mesesEnRango(desde, hasta);
  const dotacionTxt = meses.map(m => `${fmtMesAnio(m)}: ${crewForMonth(m)}${typeof dot[m]==='number' ? '' : ' (sin cargar)'} trip.`).join(' · ');

  document.getElementById('ocimfExposureInfo').innerHTML =
    `Período: ${dias} día(s) · Exposición total: <b>${exposicionHoras.toLocaleString('es-AR')} horas-hombre</b> (24 h/día × dotación mensual cargada en Catálogos) · ` +
    `Accidentes marcados "Incluir en KPI": ${list.length} (de los cuales ${fac} son FAC — Primeros Auxilios, informativos, no computan en LTIF/TRCF)<br>` +
    `Dotación aplicada por mes: ${dotacionTxt || '—'}`;
}

/* ============ KPI — NO CONFORMIDADES EN AUDITORÍAS ISM / ISO ============ */
function renderAuditNcKpi(){
  const panel = document.getElementById('auditNcKpiPanel');
  if(!panel) return;
  if(currentTypeFilter !== 'KPI'){ panel.style.display = 'none'; return; }
  panel.style.display = 'block';

  const desdeEl = document.getElementById('auditNcDesde');
  const hastaEl = document.getElementById('auditNcHasta');
  if(!desdeEl.value) desdeEl.value = `${new Date().getFullYear()}-01-01`;
  if(!hastaEl.value) hastaEl.value = new Date().toISOString().slice(0,10);
  const desde = desdeEl.value, hasta = hastaEl.value;

  const list = filteredRecords(true).filter(r => r.tipo === 'NC' && r.fecha >= desde && r.fecha <= hasta);
  const cuenta = (origenes, auditoria, ambito) => list.filter(r =>
    origenes.includes(r.clasificacion_origen) && r.tipo_auditoria === auditoria && r.ambito_auditoria === ambito
  ).length;

  const cards = [
    {val: cuenta(['ISM','ISO'], 'Interna', 'Oficina'), lbl:'Auditorías Internas ISM/ISO — Oficina'},
    {val: cuenta(['ISM','ISO'], 'Externa', 'Oficina'), lbl:'Auditorías Externas ISM/ISO — Oficina'},
    {val: cuenta(['ISM'], 'Interna', 'Buques'), lbl:'Auditorías Internas ISM — Buques'},
    {val: cuenta(['ISM'], 'Externa', 'Buques'), lbl:'Auditorías Externas ISM — Buques'},
  ];
  document.getElementById('auditNcKpiRow').innerHTML = cards.map(c=>`
    <div class="kpi-card ${c.val>0?'alert':''}">
      <div class="val">${c.val}</div>
      <div class="lbl">${c.lbl}</div>
    </div>`).join('');

  const dias = daysBetweenInclusive(desde, hasta);
  document.getElementById('auditNcInfo').textContent =
    `Período: ${dias} día(s) (${fmtDate(desde)} a ${fmtDate(hasta)}) · NC en el período: ${list.length} · ` +
    `Se cuentan las NC con Clasificación = ISM o ISO y Tipo de auditoría / Ámbito cargados en cada registro. En "Buques" solo se contabiliza ISM.`;
}


/* ============ SCORE CARD (KPI HSQE) ============ */
const SCORECARD_YEAR_MIN = 2025, SCORECARD_YEAR_MAX = 2032;
let scoreCardYear = null;

// Targets POR ANO (persistidos en config). Cada ano tiene su propio set editable.
function scorecardTargetsFor(y){
  if(!DATA.scorecardTargets || typeof DATA.scorecardTargets !== 'object') DATA.scorecardTargets = {};
  if(typeof DATA.scorecardTargets.trcf === 'number') DATA.scorecardTargets = {}; // migra formato viejo (plano)
  const k = String(y);
  if(!DATA.scorecardTargets[k]) DATA.scorecardTargets[k] = { ...SCORECARD_DEFAULT_TARGETS };
  return DATA.scorecardTargets[k];
}

function setScoreCardYear(v){
  scoreCardYear = parseInt(v, 10) || new Date().getFullYear();
  renderScoreCard();
}

async function setScoreCardTarget(key, v){
  const yr = scoreCardYear || new Date().getFullYear();
  const T = scorecardTargetsFor(yr);
  const num = parseFloat(String(v).replace(',', '.'));
  T[key] = isNaN(num) ? 0 : num;
  renderScoreCard();               // refresca UI/semaforo de inmediato
  const ok = await saveConfig();   // persiste en Supabase (hsqe_config) y confirma
  showToast(ok ? `Target ${yr} guardado ✓` : 'No se pudo guardar el target — revisá la conexión');
}

function renderScoreCard(){
  let panel = document.getElementById('scoreCardPanel');
  if(!panel){
    panel = document.createElement('div');
    panel.id = 'scoreCardPanel';
    panel.style.marginBottom = '22px';
    const after = document.getElementById('auditNcKpiPanel');
    if(after && after.parentNode) after.parentNode.insertBefore(panel, after.nextSibling);
    else document.querySelector('.main').appendChild(panel);
  }
  panel.style.display = 'block';

  if(!scoreCardYear){
    const yn = new Date().getFullYear();
    scoreCardYear = Math.min(SCORECARD_YEAR_MAX, Math.max(SCORECARD_YEAR_MIN, yn));
  }
  const y = scoreCardYear;
  const T = scorecardTargetsFor(y);   // targets del ano seleccionado

  const quarters = [
    { q:'1Q', ini:`${y}-01-01`, fin:`${y}-03-31` },
    { q:'2Q', ini:`${y}-04-01`, fin:`${y}-06-30` },
    { q:'3Q', ini:`${y}-07-01`, fin:`${y}-09-30` },
    { q:'4Q', ini:`${y}-10-01`, fin:`${y}-12-31` },
  ];
  const yIni = `${y}-01-01`, yFin = `${y}-12-31`;
  const hoy = new Date().toISOString().slice(0,10);
  const effFin = d => d < hoy ? d : hoy;   // TOTAL: acumulado hasta hoy

  // Misma logica y fuente que los paneles de arriba (respeta el filtro Sitio/Buque).
  const accAll = filteredRecords(true).filter(r => r.tipo==='ACC' && r.incluir_kpi);
  const ncAll  = filteredRecords(true).filter(r => r.tipo==='NC');

  // Tasa OCIMF: null (s/d) si no hay exposicion cargada en ese periodo.
  const rate = (prefijos, ini, fin) => {
    if(fin < ini) return null;
    const cases = accAll.filter(r => r.fecha>=ini && r.fecha<=fin &&
      prefijos.some(pre => (r.clasificacion||'').startsWith(pre))).length;
    if(cases === 0) return 0;              // sin casos -> 0 (aunque no haya exposicion cargada)
    const exp = computeExposureHours(ini, fin);
    if(exp === 0) return null;             // hay casos pero no hay exposicion -> s/d
    return +((cases*OCIMF_MULTIPLIER)/exp).toFixed(2);
  };
  const ncCount = (orig, aud, amb, ini, fin) => (fin < ini) ? 0 : ncAll.filter(r =>
    r.fecha>=ini && r.fecha<=fin &&
    orig.includes(r.clasificacion_origen) &&
    r.tipo_auditoria===aud && r.ambito_auditoria===amb
  ).length;

  const rows = [
    { key:'trcf',        kpi:'Accidentes personales TRCF',         kind:'rate',  fn:(i,f)=>rate(['LTI','MTI','RWC'],i,f) },
    { key:'ltif',        kpi:'Accidentes personales LTIF',         kind:'rate',  fn:(i,f)=>rate(['LTI'],i,f) },
    { key:'nnc_cia_ext', kpi:'NNC Cia en Aud. Externas ISM - ISO', kind:'count', fn:(i,f)=>ncCount(['ISM','ISO'],'Externa','Oficina',i,f) },
    { key:'nnc_cia_int', kpi:'NNC Cia en Aud. Internas ISM - ISO', kind:'count', fn:(i,f)=>ncCount(['ISM','ISO'],'Interna','Oficina',i,f) },
    { key:'nnc_buq_ext', kpi:'NNC Buques en Aud. Externas ISM',    kind:'count', fn:(i,f)=>ncCount(['ISM'],'Externa','Buques',i,f) },
    { key:'nnc_buq_int', kpi:'NNC Buques en Aud. Internas ISM',    kind:'count', fn:(i,f)=>ncCount(['ISM'],'Interna','Buques',i,f) },
  ];

  const fmt = v => v===null ? 's/d' : (Number.isInteger(v) ? String(v) : v.toFixed(2));
  const dmy = iso => { const [Y,M,D]=iso.split('-'); return `${D}/${M}/${Y}`; };

  const bodyHtml = rows.map(row=>{
    const target = (typeof T[row.key]==='number') ? T[row.key] : (SCORECARD_DEFAULT_TARGETS[row.key] || 0);
    const qv = quarters.map(q=>row.fn(yIni, q.fin));   // acumulado 01-ene al cierre de cada Q
    const total = row.fn(yIni, effFin(yFin));          // acumulado hasta hoy

    // Semaforo: estas KPI son "menor es mejor" (el target es un maximo admisible).
    let bg = '#E9EDF1', dot = '#8B96A1';                       // s/d -> neutro
    if(total !== null){
      if(total <= target){ bg = '#CDE9CE'; dot = '#1E7A4A'; }  // cumple
      else { bg = '#F3C9C9'; dot = '#C0392B'; }                // no cumple
    }

    // Resultado del ano anterior (ano completo) + semaforo contra el target de ESE ano.
    const py = y - 1;
    const prevTotal = row.fn(`${py}-01-01`, effFin(`${py}-12-31`));
    const prevT = DATA.scorecardTargets[String(py)] || SCORECARD_DEFAULT_TARGETS;
    const prevTarget = (typeof prevT[row.key]==='number') ? prevT[row.key] : (SCORECARD_DEFAULT_TARGETS[row.key] || 0);
    let pbg = '#E9EDF1', pdot = '#8B96A1';
    if(prevTotal !== null){
      if(prevTotal <= prevTarget){ pbg = '#CDE9CE'; pdot = '#1E7A4A'; }
      else { pbg = '#F3C9C9'; pdot = '#C0392B'; }
    }

    const qCells = qv.map(v=>`<td style="text-align:center;padding:7px 8px;border:1px solid #DBE0E6;">${fmt(v)}</td>`).join('');
    return `<tr>
      <td style="padding:7px 10px;border:1px solid #DBE0E6;font-weight:600;">${row.kpi}</td>
      <td style="text-align:center;padding:7px 8px;border:1px solid #DBE0E6;background:${pbg};font-weight:600;white-space:nowrap;">
        <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${pdot};margin-right:6px;vertical-align:middle;"></span>${fmt(prevTotal)}
      </td>
      <td style="text-align:center;padding:5px 6px;border:1px solid #DBE0E6;background:#FFF3B0;">
        <input type="number" step="any" value="${target}" onchange="setScoreCardTarget('${row.key}', this.value)"
          style="width:64px;text-align:center;font-weight:700;background:transparent;border:1px solid #E0D48A;border-radius:4px;padding:3px 4px;color:#5B4C00;" />
      </td>
      ${qCells}
      <td style="text-align:center;padding:7px 8px;border:1px solid #DBE0E6;background:${bg};font-weight:700;white-space:nowrap;">
        <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${dot};margin-right:6px;vertical-align:middle;"></span>${fmt(total)}
      </td>
    </tr>`;
  }).join('');

  const thQ = quarters.map(q=>`<th style="background:#6B7681;color:#fff;text-align:center;padding:6px 8px;border:1px solid #DBE0E6;font-size:11px;">${q.q}<br><span style="font-weight:400;font-size:10px;">${dmy(q.fin)}</span></th>`).join('');

  const yearOpts = [];
  for(let yy=SCORECARD_YEAR_MIN; yy<=SCORECARD_YEAR_MAX; yy++) yearOpts.push(`<option value="${yy}" ${yy===y?'selected':''}>${yy}</option>`);

  panel.innerHTML = `
    <div class="chart-card" style="padding:0;overflow:hidden;">
      <div style="display:flex;justify-content:space-between;align-items:center;background:#002247;color:#fff;padding:10px 14px;">
        <div style="font-family:'Saira',sans-serif;font-weight:700;letter-spacing:0.06em;font-size:16px;">SCORE CARD</div>
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;">
          <span style="opacity:.85;">Año</span>
          <select onchange="setScoreCardYear(this.value)" style="width:auto;background:#0A3A66;color:#fff;border:1px solid rgba(255,255,255,0.25);padding:4px 8px;">${yearOpts.join('')}</select>
        </div>
      </div>
      <table id="scoreCardTable" style="width:100%;border-collapse:collapse;font-size:12.5px;background:#fff;">
        <thead>
          <tr>
            <th style="background:#E9EDF1;text-align:left;padding:6px 10px;border:1px solid #DBE0E6;">KPI</th>
            <th style="background:#E9EDF1;text-align:center;padding:6px 8px;border:1px solid #DBE0E6;">Resultado ${y-1}</th>
            <th style="background:#FFF3B0;text-align:center;padding:6px 8px;border:1px solid #DBE0E6;">Target ${y}</th>
            ${thQ}
            <th style="background:#1E7A4A;color:#fff;text-align:center;padding:6px 8px;border:1px solid #DBE0E6;">TOTAL</th>
          </tr>
        </thead>
        <tbody>${bodyHtml}</tbody>
      </table>
      <div style="padding:8px 14px;font-size:11px;color:#5B6671;background:#F7F9FB;border-top:1px solid #DBE0E6;">
        🟢 cumple el target &nbsp;·&nbsp; 🔴 no cumple (valor mayor al target) &nbsp;·&nbsp; el Target es editable por fila &nbsp;·&nbsp; s/d = sin exposición cargada
      </div>
    </div>`;
}

/* ============ RENDER: CHARTS ============ */
function nonZeroPairs(labels, list, field){
  const pairs = labels.map(l=>({l, v:list.filter(r=>r[field]===l).length})).filter(p=>p.v>0);
  if(pairs.length===0) pairs.push({l:'Sin datos cargados', v:0});
  return {labels: pairs.map(p=>p.l), data: pairs.map(p=>p.v)};
}

function getChartSpecs(list, tipo){
  const statLabels = Object.keys(STATUS);
  const specEstado = { title:'Por estado', kind:'doughnut', labels: statLabels,
    data: statLabels.map(s=>list.filter(r=>r.estado===s).length), colors: statLabels.map(s=>STATUS[s]) };

  const sitios = (DATA.companies[0] && DATA.companies[0].vessels) || [];
  const specInstalacion = { title:'Por instalación', kind:'bar', labels: sitios,
    data: sitios.map(v=>list.filter(r=>r.instalacion===v).length), colors:['#002247'] };

  const sevLabels = ['Baja','Media','Alta','Crítica'];
  const specSeveridad = { title:'Por severidad', kind:'doughnut', labels: sevLabels,
    data: sevLabels.map(s=>list.filter(r=>r.severidad===s).length), colors: sevLabels.map(s=>SEV_COLORS[s]) };

  // Distribución por tipificación de causa raíz — aplica a todos los tipos con bloque de Causa Raíz / Acciones.
  const causaCats = TIPIFICACION_CAUSA_RAIZ.filter(c=>c);
  const causaPairs = nonZeroPairs(causaCats, list, 'tipificacion_causa');
  const specCausaRaiz = { title:'Por causa raíz', kind:'bar', indexAxis:'y', labels: causaPairs.labels, data: causaPairs.data, colors:['#7A3B9E'] };

  if(tipo === 'ALL'){
    const tipoLabels = Object.keys(TYPES);
    return { scope:'Todos los registros — diversidad de categorías', specs: [
      { title:'Registros por tipo', kind:'bar', indexAxis:'y', labels: tipoLabels.map(k=>TYPES[k].label),
        data: tipoLabels.map(k=>list.filter(r=>r.tipo===k).length), colors: tipoLabels.map(k=>TYPES[k].color) },
      specEstado, specInstalacion, specCausaRaiz,
    ]};
  }
  if(TIPOS_CON_CLASIF_ORIGEN.includes(tipo)){
    const clasifs = CLASIF_ORIGEN.filter(c=>c);
    const specs = [
      { title:'Por clasificación', kind:'doughnut', labels: clasifs,
        data: clasifs.map(c=>list.filter(r=>r.clasificacion_origen===c).length),
        colors:['#7A3B9E','#2C7FB8','#4C8C4A','#B07D0A','#C0392B','#5B6671'] },
      specEstado, specInstalacion,
    ];
    if(!TIPOS_SIN_CAUSA_ACCION.includes(tipo)) specs.push(specCausaRaiz);
    return { scope: TYPES[tipo].label, specs };
  }
  if(tipo === 'ACC'){
    const pc = nonZeroPairs(PARTE_CUERPO.filter(c=>c), list, 'parte_cuerpo');
    const tl = nonZeroPairs(TIPO_LESION.filter(c=>c), list, 'tipo_lesion');
    return { scope: TYPES[tipo].label, specs: [
      specSeveridad,
      { title:'Por parte del cuerpo afectada', kind:'bar', indexAxis:'y', labels: pc.labels, data: pc.data, colors:['#C0392B'] },
      { title:'Por tipo de lesión', kind:'bar', indexAxis:'y', labels: tl.labels, data: tl.data, colors:['#002247'] },
      specCausaRaiz,
    ]};
  }
  if(tipo === 'INC'){
    return { scope: TYPES[tipo].label, specs: [
      specSeveridad,
      { title:'Por tipificación', kind:'bar', indexAxis:'y', labels: TIPIFICACION_INCIDENTE,
        data: TIPIFICACION_INCIDENTE.map(c=>list.filter(r=>r.categoria_evento===c).length), colors:['#0A3A66'] },
      specEstado,
      specCausaRaiz,
    ]};
  }
  if(tipo === 'CUA'){
    const nat = NATURALEZA_CUASI.filter(c=>c);
    return { scope: TYPES[tipo].label, specs: [
      specSeveridad,
      { title:'Por naturaleza', kind:'doughnut', labels: nat,
        data: nat.map(n=>list.filter(r=>r.naturaleza_cuasi===n).length), colors:['#C0392B','#002247','#B07D0A'] },
      specEstado,
      specCausaRaiz,
    ]};
  }
  // Acto Inseguro / Condición Insegura — ya no llevan categorización/tipificación propia,
  // la causa raíz cubre esa necesidad de clasificación.
  if(tipo === 'AI' || tipo === 'CI'){
    return { scope: TYPES[tipo].label, specs: [ specSeveridad, specEstado, specCausaRaiz ] };
  }
  return { scope: TYPES[tipo].label, specs: [ specSeveridad, specEstado, specInstalacion ] };
}

// Divide etiquetas largas en varias lineas para que no se corten en el eje.
function wrapChartLabel(label, maxChars=16){
  const text = String(label);
  if(text.length <= maxChars) return text;
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for(const w of words){
    if((line + ' ' + w).trim().length > maxChars){
      if(line) lines.push(line.trim());
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if(line) lines.push(line.trim());
  return lines;
}

function renderCharts(){
  const list = filteredRecords(false);
  Object.values(charts).forEach(c=>c && c.destroy());
  charts = {};

  const { scope, specs } = getChartSpecs(list, currentTypeFilter);
  document.getElementById('chartsSectionLabel').textContent = `Gráficos — ${scope}`;

  const canvasIds = ['chartTipo','chartEstado','chartEmpresa','chartCausa'];
  const titleIds = ['chartTitle1','chartTitle2','chartTitle3','chartTitle4'];
  const chartKeys = ['tipo','estado','empresa','causa'];
  const cardCausa = document.getElementById('chartCardCausa');
  if(cardCausa) cardCausa.style.display = specs.length >= 4 ? '' : 'none';

  specs.forEach((spec, i)=>{
    if(i >= canvasIds.length) return;
    document.getElementById(titleIds[i]).textContent = spec.title;

    const canvas = document.getElementById(canvasIds[i]);
    // Envolver el canvas en un contenedor de altura controlada (una sola vez).
    let host = canvas.parentElement;
    if(!host.classList.contains('chart-canvas-host')){
      host = document.createElement('div');
      host.className = 'chart-canvas-host';
      canvas.parentNode.insertBefore(host, canvas);
      host.appendChild(canvas);
    }
    // Las barras horizontales crecen segun la cantidad de categorias; el resto, altura fija.
    const isHBar = spec.kind === 'bar' && spec.indexAxis === 'y';
    host.style.height = isHBar
      ? Math.max(170, spec.labels.length * 30 + 30) + 'px'
      : '210px';

    let opts;
    if(spec.kind === 'doughnut'){
      opts = { responsive:true, maintainAspectRatio:false,
        plugins:{legend:{position:'bottom', labels:{boxWidth:10, font:{size:10}}}} };
    } else {
      const catAxis = spec.indexAxis === 'y' ? 'y' : 'x';
      const valAxis = spec.indexAxis === 'y' ? 'x' : 'y';
      opts = {
        responsive:true, maintainAspectRatio:false,
        indexAxis: spec.indexAxis || 'x',
        plugins:{legend:{display:false}},
        scales:{
          [valAxis]:{ beginAtZero:true, ticks:{precision:0} },
          [catAxis]:{ ticks:{
            autoSkip:false,
            font:{size:10},
            callback:function(value){ return wrapChartLabel(this.getLabelForValue(value)); }
          } },
        },
      };
    }

    charts[chartKeys[i]] = new Chart(canvas, {
      type: spec.kind,
      data: { labels: spec.labels, datasets:[{ data: spec.data, backgroundColor: spec.colors.length>1 ? spec.colors : spec.labels.map((_,j)=>spec.colors[j % spec.colors.length]), borderRadius: spec.kind==='bar'?2:0 }] },
      options: opts,
    });
  });
}

/* ============ RENDER: TABLE ============ */
function renderTable(){
  let list = filteredRecords(false);
  list = applyTableFilters(list);
  list.sort((a,b)=> (b.fecha||'').localeCompare(a.fecha||''));

  const title = currentTypeFilter==='ALL' ? 'Todos los registros' : TYPES[currentTypeFilter].label;
  document.getElementById('viewTitle').textContent = currentTypeFilter==='ALL' ? 'Panel General' : title;
  const siteName = currentSiteFilter==='ALL' ? 'Todos los sitios' : currentSiteFilter;
  document.getElementById('viewMeta').textContent = `${siteName} · ${list.length} registro(s)`;

  const mostrarSeveridad = currentTypeFilter === 'ALL' || TIPOS_CON_SEVERIDAD.includes(currentTypeFilter);
  const sevFilterEl = document.getElementById('sevFilter');
  if(sevFilterEl){
    sevFilterEl.style.display = mostrarSeveridad ? '' : 'none';
    if(!mostrarSeveridad) sevFilterEl.value = '';
  }

  if(list.length===0){
    document.getElementById('tableWrap').innerHTML = `
      <div class="empty-state">
        <div class="display">Sin registros</div>
        <div>No hay eventos que coincidan con los filtros actuales.</div>
      </div>`;
    return;
  }

  const rows = list.map(r=>{
    const co = DATA.companies.find(c=>c.id===r.empresa_id);
    const nAdj = (r.adjuntos||[]).length;
    const resumen = accionesResumen(r);
    const sevCell = mostrarSeveridad ? `<td>${r.severidad ? `<span class="sev-tag" style="color:${SEV_COLORS[r.severidad]};background:${SEV_BG[r.severidad]}">${r.severidad}</span>` : '<span style="color:var(--graphite-light)">—</span>'}</td>` : '';
    return `<tr onclick="openRecordForm('${r.id}')">
      <td><span class="id-tag">${r.id}</span></td>
      <td><span class="type-tag" style="background:${TYPES[r.tipo].color}20;color:${TYPES[r.tipo].color}">${TYPES[r.tipo].label}</span></td>
      <td>${r.instalacion||'—'}</td>
      <td class="mono" style="font-size:12px;white-space:nowrap;">${fmtDate(r.fecha)}</td>
      <td class="desc-cell" style="font-size:11.5px;">${((r.titulo||r.descripcion)||'').slice(0,80)}${((r.titulo||r.descripcion)||'').length>80?'…':''}</td>
      <td><div class="status-cell" style="white-space:nowrap;"><span class="status-dot" style="background:${STATUS[r.estado]}"></span>${r.estado}${r.visado ? ' <span title="Visado por Responsable HSQE/DPA" style="color:#1E7A4A;font-weight:bold;">✔</span>' : ''}</div></td>
      <td class="mono ${isOverdue(r)?'overdue':''}" style="font-size:12px;white-space:nowrap;">${isOverdue(r)?'⚠ ':''}${resumen.vencimiento?fmtDate(resumen.vencimiento):'—'}</td>
      <td>${resumen.responsable}</td>
      <td style="text-align:center">${nAdj>0 ? '📎 '+nAdj : '—'}</td>
      <td style="text-align:center;white-space:nowrap;"><button class="btn" style="padding:4px 8px;font-size:11px;" title="Imprimir PDF" onclick="event.stopPropagation();printRecordPDF('${r.id}')">🖨 PDF</button></td>
    </tr>`;
  }).join('');

  document.getElementById('tableWrap').innerHTML = `
    <table style="font-size:12.5px;">
      <thead><tr>
        <th>ID</th><th>Tipo</th><th>Instalación</th><th>Fecha</th>
        <th>Título</th><th>Estado</th><th>Vencimiento</th><th>Responsable</th><th>Adj.</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderBrandLogo(){
  const el = document.getElementById('brandLogo');
  if(!el) return;
  const co = DATA.companies[0];
  const logo = co ? getCompanyLogo(co.id) : null;
  el.innerHTML = logo ? `<div class="brand-logo-box"><img src="${logo}"></div>` : '';
}
// Alterna entre el panel normal (KPIs, graficos, tabla) y la vista dedicada "KPI HSQE".
// El encabezado con el boton de impresion queda SIEMPRE visible; solo cambian sus textos.
function setKpiViewMode(kpiMode){
  const toggles = [
    document.getElementById('kpiRow'),
    document.querySelector('.chart-row'),
    document.querySelector('.filters'),
    document.getElementById('tableWrap'),
    document.querySelector('.topbar button.btn'),
  ];
  toggles.forEach(el=>{ if(el) el.style.display = kpiMode ? 'none' : ''; });
  const sc = document.getElementById('scoreCardPanel');
  if(sc) sc.style.display = kpiMode ? 'block' : 'none';

  const label = document.getElementById('chartsSectionLabel');
  const header = label ? label.parentElement : null;
  const printBtn = header ? header.querySelector('button') : null;
  if(kpiMode){
    if(label) label.textContent = 'Indicadores KPI';
    if(printBtn) printBtn.textContent = '\uD83D\uDDA8 Imprimir KPI (PDF)';
  } else if(printBtn){
    printBtn.textContent = '\uD83D\uDDA8 Imprimir graficos (PDF)';
  }
}

function renderAll(){
  renderBrandLogo();
  renderSiteSelect();
  renderTypeNav();

  const kpiMode = currentTypeFilter === 'KPI';
  setKpiViewMode(kpiMode);

  if(kpiMode){
    document.getElementById('viewTitle').textContent = 'KPI HSQE';
    document.getElementById('viewMeta').textContent = 'Indicadores OCIMF y No Conformidades en auditorias ISM/ISO';
    renderOcimfKpi();
    renderAuditNcKpi();
    renderScoreCard();
  } else {
    renderKPIs();
    renderOcimfKpi();
    renderAuditNcKpi();
    renderCharts();
    renderTable();
  }

  const btn = document.getElementById('printReportBtn');
  if(btn){
    btn.textContent = currentSiteFilter==='ALL' ? '🖨 Imprimir PDF — Todos los sitios' : `🖨 Imprimir PDF — ${currentSiteFilter}`;
  }
}

/* ============ FORM / MODAL ============ */
function openRecordForm(id){
  editingId = id || null;
  const r = id ? DATA.records.find(x=>x.id===id) : null;
  const co = r ? r.empresa_id : (DATA.companies[0]?.id || '');
  const tipo = r ? r.tipo : (currentTypeFilter!=='ALL'?currentTypeFilter:'OBS');

  const overlay = document.createElement('div');
  overlay.className='modal-overlay';
  overlay.id='modalOverlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <h2>${r? 'Editar registro '+r.id : 'Nuevo registro'}</h2>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="section-title">Clasificación</div>
        <div class="field-row">
          <div class="field"><label>Tipo de evento</label>
            <select id="f_tipo">${Object.keys(TYPES).map(k=>`<option value="${k}" ${k===tipo?'selected':''}>${TYPES[k].label}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Empresa</label>
            <select id="f_empresa" onchange="updateVesselOptions()">${DATA.companies.map(c=>`<option value="${c.id}" ${c.id===co?'selected':''}>${c.name}</option>`).join('')}</select>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label>Buque / Instalación</label>
            <select id="f_instalacion"></select>
          </div>
          <div class="field"><label>Fecha del evento</label>
            <input type="date" id="f_fecha" value="${r?r.fecha:todayISO()}">
          </div>
        </div>

        <div class="field-row">
          <div class="field"><label>Reportado por <span style="font-weight:400;color:var(--graphite-light);">(nombre / cargo)</span></label>
            <input type="text" id="f_reportado" list="personasDatalist" value="${r?r.reportado_por||'':''}" placeholder="Ej: Juan Pérez / Contramaestre">
          </div>
        </div>

        <div id="block_investigadores">
          <div class="section-title" style="margin-top:14px;">Investigadores</div>
          <div class="field"><label>Investigador líder <span style="font-weight:400;color:var(--graphite-light);">(nombre / cargo)</span></label>
            <input type="text" id="f_investigador_lider" list="personasDatalist" value="${r?r.investigador_lider||'':''}" placeholder="Ej: María Gómez / Oficial de Seguridad">
          </div>
          <div class="section-title with-btn" style="margin-top:8px;">
            <span style="font-size:12.5px;">Investigadores adicionales</span>
            <button class="btn secondary" style="padding:3px 10px;font-size:11px;" onclick="addInvestigador()">+ Agregar investigador</button>
          </div>
          <div id="investigadoresList"></div>
        </div>

        <div id="block_condiciones_inc">
          <div class="section-title" style="margin-top:14px;">Datos del incidente (condiciones al momento del evento)</div>
          <div class="field-row-3">
            <div class="field"><label>Fuerza del viento</label>
              <select id="f_fuerza_viento">${FUERZA_VIENTO.map(o=>`<option ${r&&r.fuerza_viento===o?'selected':''}>${o}</option>`).join('')}</select>
            </div>
            <div class="field"><label>Estado del mar</label>
              <select id="f_estado_mar">${ESTADO_MAR.map(o=>`<option ${r&&r.estado_mar===o?'selected':''}>${o}</option>`).join('')}</select>
            </div>
            <div class="field"><label>Fuente de luz</label>
              <select id="f_fuente_luz">${FUENTE_LUZ.map(o=>`<option ${r&&r.fuente_luz===o?'selected':''}>${o}</option>`).join('')}</select>
            </div>
          </div>
          <div class="field-row-3">
            <div class="field"><label>Temperatura exterior (°C)</label>
              <input type="text" id="f_temp_exterior" value="${r?r.temp_exterior||'':''}" placeholder="Ej: 12 · o N/A">
            </div>
            <div class="field"><label>Temperatura ambiente (°C)</label>
              <input type="text" id="f_temp_ambiente" value="${r?r.temp_ambiente||'':''}" placeholder="Ej: 19 · o N/A">
            </div>
            <div class="field"><label>Rumbo (verdadero, °)</label>
              <input type="text" id="f_rumbo" value="${r?r.rumbo||'':''}" placeholder="Ej: 171 · o N/A">
            </div>
          </div>
          <div class="field-row">
            <div class="field"><label>Velocidad (nudos)</label>
              <input type="text" id="f_velocidad" value="${r?r.velocidad||'':''}" placeholder="Ej: 3.5 · o N/A">
            </div>
          </div>
        </div>

        <div class="section-title">Descripción</div>
        <div class="field"><label>Título del evento</label>
          <input type="text" id="f_titulo" value="${r?r.titulo||'':''}" placeholder="Título breve que resuma el evento" maxlength="120">
        </div>
        <div class="field"><label>Área / Departamento</label>
          <input type="text" id="f_area" value="${r?r.area||'':''}" placeholder="Ej: Cubierta, Sala de Máquinas, Puente">
        </div>
        <div class="field" id="block_desc_simple"><label>Descripción del evento</label>
          <textarea id="f_descripcion" placeholder="Detalle qué ocurrió, cómo y dónde">${r?r.descripcion||'':''}</textarea>
        </div>
        <div id="block_desc_inc">
          ${INC_PREGUNTAS.map((q,i)=>{
            let val = '';
            if(r && r.inc_descripcion) val = r.inc_descripcion['q'+(i+1)] || '';
            else if(r && i===0) val = r.descripcion || ''; // incidente previo: la descripción libre pasa a la pregunta 1
            return `<div class="field"><label>${i+1}. ${q}</label>
            <textarea id="f_inc_q${i+1}" placeholder="Respuesta...">${val}</textarea>
          </div>`;
          }).join('')}
        </div>

        <div id="block_ocimf">
          <div class="field-row">
            <div class="field"><label>Clasificación OCIMF/TMSA</label>
              <select id="f_clasif">${CLASIF_OCIMF.map(c=>`<option value="${c}" ${r&&r.clasificacion===c?'selected':''}>${c||'No aplica'}</option>`).join('')}</select>
            </div>
            <div class="field" style="display:flex;align-items:flex-end;padding-bottom:9px;">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600;color:var(--navy);">
                <input type="checkbox" id="f_incluir_kpi" ${r&&r.incluir_kpi?'checked':''} style="width:16px;height:16px;cursor:pointer;">
                Incluir en KPI OCIMF
              </label>
            </div>
          </div>
        </div>

        <div id="block_cuasi">
          <div class="section-title">Detalle del Cuasi Accidente</div>
          <div class="field-row">
            <div class="field"><label>Naturaleza del cuasi accidente</label>
              <select id="f_naturaleza_cuasi">${NATURALEZA_CUASI.map(c=>`<option value="${c}" ${r&&r.naturaleza_cuasi===c?'selected':''}>${c||'Seleccionar...'}</option>`).join('')}</select>
            </div>
          </div>
          <div class="field"><label>Daño material potencial (si aplica)</label>
            <textarea id="f_dano_material" placeholder="Qué equipo, estructura o material podría haber resultado dañado">${r?r.dano_material_potencial||'':''}</textarea>
          </div>
        </div>

        <div id="block_clasif_origen">
          <div class="section-title">Clasificación</div>
          <div class="field-row">
            <div class="field"><label>Clasificación</label>
              <select id="f_clasif_origen">${CLASIF_ORIGEN.map(c=>`<option value="${c}" ${r&&r.clasificacion_origen===c?'selected':''}>${c||'Seleccionar...'}</option>`).join('')}</select>
            </div>
          </div>
        </div>

        <div id="block_auditoria_nc">
          <div class="section-title">Origen de Auditoría (para KPI ISM / ISO)</div>
          <div class="field-row">
            <div class="field"><label>Tipo de auditoría</label>
              <select id="f_tipo_auditoria">
                ${['','Interna','Externa','No proviene de auditoría'].map(v=>`<option value="${v}" ${r&&r.tipo_auditoria===v?'selected':''}>${v||'Seleccionar...'}</option>`).join('')}
              </select>
            </div>
            <div class="field"><label>Ámbito</label>
              <select id="f_ambito_auditoria">
                ${['','Oficina','Buques'].map(v=>`<option value="${v}" ${r&&r.ambito_auditoria===v?'selected':''}>${v||'Seleccionar...'}</option>`).join('')}
              </select>
            </div>
          </div>
          <div style="font-size:11px;color:var(--graphite-light);margin-top:-6px;">
            Solo se contabiliza en el KPI cuando la Clasificación de arriba es ISM o ISO. En Buques, el KPI solo toma ISM (los relevamientos ISO habitualmente se auditan en oficina).
          </div>
        </div>

        <div id="block_categoria_aici">
          <div class="section-title" id="titulo_categoria_aici">Categorización</div>
          <div class="field-row">
            <div class="field"><label id="label_categoria_aici">Categoría</label>
              <select id="f_categoria_aici" onchange="toggleCategoriaOtro()"></select>
            </div>
            <div class="field" id="field_categoria_otro" style="display:none;">
              <label>Especificar</label>
              <input type="text" id="f_categoria_otro" value="${r?r.categoria_otro_detalle||'':''}" placeholder="Detallar">
            </div>
          </div>
        </div>

        <div id="block_lesion">
          <div class="section-title">Datos de la Lesión</div>
          <div class="field-row">
            <div class="field"><label>Parte del cuerpo afectada</label>
              <select id="f_parte_cuerpo">${PARTE_CUERPO.map(c=>`<option value="${c}" ${r&&r.parte_cuerpo===c?'selected':''}>${c||'Seleccionar...'}</option>`).join('')}</select>
            </div>
            <div class="field"><label>Tipo de lesión</label>
              <select id="f_tipo_lesion">${TIPO_LESION.map(c=>`<option value="${c}" ${r&&r.tipo_lesion===c?'selected':''}>${c||'Seleccionar...'}</option>`).join('')}</select>
            </div>
          </div>

          <div class="section-title" style="margin-top:14px;padding-top:10px;border-top:1px dashed var(--line);">Consideraciones del evento</div>
          ${[
            ['q_guardia','¿La persona estaba de guardia?'],
            ['q_lugar_autorizado','¿El lugar estaba autorizado para realizar el trabajo?'],
            ['q_persona_autorizada','¿La persona estaba autorizada para realizar el trabajo?'],
            ['q_alcohol','¿La persona estaba bajo la influencia de alcohol?'],
            ['q_incapacitado','¿Está incapacitado para trabajar?'],
            ['q_asiento_libro','¿Se realizó asiento en el libro de navegación?'],
          ].map(([k,q])=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding:8px 2px;border-bottom:1px solid var(--line);">
            <span style="font-size:12.5px;color:var(--navy);">${q}</span>
            <div style="display:flex;gap:16px;flex-shrink:0;">${siNoNaRadios(k, r?r[k]||'':'')}</div>
          </div>`).join('')}
        </div>

        <div id="block_causa_accion">
          <div class="section-title" style="margin-top:18px;padding-top:10px;border-top:1px dashed var(--line);">Causa Raíz</div>
          <div class="field-row">
            <div class="field"><label>Tipificación de la causa raíz</label>
              <select id="f_tipificacion_causa" onchange="toggleTipificacionCausaOtro()">${TIPIFICACION_CAUSA_RAIZ.map(c=>`<option value="${c}" ${r&&r.tipificacion_causa===c?'selected':''}>${c||'Seleccionar...'}</option>`).join('')}</select>
            </div>
            <div class="field" id="field_tipificacion_causa_otro" style="display:none;">
              <label>Especificar</label>
              <input type="text" id="f_tipificacion_causa_otro" value="${r?r.tipificacion_causa_otro||'':''}" placeholder="Detallar">
            </div>
          </div>
          <div class="field"><label>Descripción de causas</label>
            <textarea id="f_causa" placeholder="Detalle adicional del análisis de causa raíz">${r?r.causa_raiz||'':''}</textarea>
          </div>

          <div class="section-title with-btn">
            <span>Acciones Correctivas</span>
            <button type="button" class="btn secondary" style="padding:5px 10px;font-size:11px;" onclick="addAccion('correctiva')">+ Agregar acción correctiva</button>
          </div>
          <div id="accionesCorrectivasList"></div>

          <div class="section-title with-btn">
            <span>Acciones Preventivas</span>
            <button type="button" class="btn secondary" style="padding:5px 10px;font-size:11px;" onclick="addAccion('preventiva')">+ Agregar acción preventiva</button>
          </div>
          <div id="accionesPreventivasList"></div>
        </div>

        <div id="block_lecciones">
          <div class="section-title" style="margin-top:18px;padding-top:10px;border-top:1px dashed var(--line);">Lecciones Aprendidas</div>
          <div class="field-row">
            <div class="field" style="flex:1">
              <label>Nueva lección aprendida</label>
              <div style="display:flex;gap:6px;">
                <input type="text" id="f_leccion_nueva" placeholder="Qué se aprendió y cómo se difundirá para evitar la repetición">
                <button class="btn secondary" style="white-space:nowrap;" onclick="addLeccion()">+ Agregar</button>
              </div>
            </div>
          </div>
          <div id="leccionesList" class="badge-strip" style="margin-top:6px;"></div>
        </div>

        <div id="block_comunicacion">
          <div class="section-title" style="margin-top:18px;padding-top:10px;border-top:1px dashed var(--line);">Comunicación</div>
          <div class="field"><label>A quién comunicar</label>
            <input type="text" id="f_comunicar_a" value="${r?r.comunicar_a||'':''}" placeholder="Ej: Tripulación del buque, Jefes de Departamento">
          </div>
          <div class="field-row">
            <div class="field"><label>A través de qué medio</label>
              <select id="f_medio_comunicacion">${MEDIOS_COMUNICACION.map(m=>`<option value="${m}" ${r&&r.medio_comunicacion===m?'selected':''}>${m||'Seleccionar...'}</option>`).join('')}</select>
            </div>
            <div class="field"><label>En qué plazo</label>
              <input type="text" id="f_plazo_comunicacion" value="${r?r.plazo_comunicacion||'':''}" placeholder="Ej: Antes de zarpar, 7 días, Próxima reunión de seguridad">
            </div>
          </div>
        </div>
        <div id="block_responsable_simple" class="field-row">
          <div class="field"><label>Responsable</label>
            <input type="text" id="f_responsable" list="personasDatalist" value="${r?r.responsable||'':''}">
          </div>
          <div class="field"><label>Fecha de vencimiento</label>
            <input type="date" id="f_vencimiento" value="${r?r.fecha_vencimiento||'':''}">
          </div>
        </div>



        <div class="section-title">Gestión</div>
        <div class="field-row">
          <div class="field" id="block_severidad"><label>Severidad</label>
            <select id="f_severidad">${['Baja','Media','Alta','Crítica'].map(s=>`<option ${r&&r.severidad===s?'selected':''}>${s}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Estado</label>
            <select id="f_estado" onchange="validateEstadoCierre(this)">${Object.keys(STATUS).map(s=>`<option ${r&&r.estado===s?'selected':''}>${s}</option>`).join('')}</select>
          </div>
        </div>
        <div class="field"><label>Fecha de cierre (si corresponde)</label>
          <input type="date" id="f_cierre" value="${r?r.fecha_cierre||'':''}">
        </div>
        <div class="field"><label>Referencia normativa (ISM / ISO / SRT / MARPOL, etc.)</label>
          <input type="text" id="f_referencia" value="${r?r.referencia_normativa||'':''}" placeholder="Ej: ISM Cód. 9, ISO 45001 Cl. 10.2">
        </div>

        <div class="section-title">Adjuntos</div>
        <div class="field-row">
          <div class="field" style="flex:1">
            <label>Adjuntar archivo</label>
            <input type="file" id="f_adjunto_file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onchange="addAttachmentFile(this)">
          </div>
          <div class="field" style="flex:1">
            <label>O referenciar documento físico/externo</label>
            <div style="display:flex;gap:6px;">
              <input type="text" id="f_adjunto_manual" placeholder="Ej: Declaración de testigos (papel)">
              <button class="btn secondary" style="white-space:nowrap;" onclick="addAttachmentManual()">+ Agregar</button>
            </div>
          </div>
        </div>
        <div id="attachmentsList" class="badge-strip" style="margin-top:6px;"></div>
        <div style="font-size:11px;color:var(--graphite-light);margin-top:6px;">
          Nota: este prototipo registra el nombre y tamaño del archivo como referencia; no almacena el contenido del archivo.
        </div>
      </div>
      <div class="modal-foot" style="flex-direction:column;align-items:stretch;gap:10px;">
        ${r ? `<div style="width:100%;">${visadoBlockHtml(r)}</div>` : ''}
        <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${r? `<button class="btn danger" onclick="deleteRecord('${r.id}')">Eliminar</button>` : ''}
            ${r? `<button class="btn" onclick="printRecordPDF('${r.id}')">🖨 Imprimir PDF</button>` : ''}
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn" onclick="saveRecord()">${r?'Guardar cambios':'Crear registro'}</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  updateVesselOptions(r ? r.instalacion : (currentSiteFilter!=='ALL' ? currentSiteFilter : null));
  renderPersonasDatalist();
  modalAttachments = (r && Array.isArray(r.adjuntos)) ? JSON.parse(JSON.stringify(r.adjuntos)) : [];
  renderAttachmentsList();
  modalLecciones = leccionesFromRecord(r);
  renderLeccionesList();
  modalInvestigadores = investigadoresFromRecord(r);
  renderInvestigadoresList();
  modalAccionesCorrectivas = accionesFromRecord(r, 'acciones_correctivas');
  modalAccionesPreventivas = accionesFromRecord(r, 'acciones_preventivas');
  renderAccionesBlock('correctiva');
  renderAccionesBlock('preventiva');
  document.getElementById('f_tipo').addEventListener('change', toggleConditionalFields);
  document.getElementById('f_naturaleza_cuasi').addEventListener('change', toggleLesionBlock);
  presetCategoriaEvento = r ? (r.categoria_evento || null) : null;
  toggleConditionalFields();
  toggleTipificacionCausaOtro();
}
function renderPersonasDatalist(){
  const dl = document.getElementById('personasDatalist');
  if(!dl) return;
  const personas = (DATA.catalogos && DATA.catalogos.personas) || [];
  dl.innerHTML = personas.map(p=>`<option value="${p}">`).join('');
}
function registrarPersonaSiEsNueva(nombre){
  if(!nombre) return;
  const n = nombre.trim();
  if(!n) return;
  if(!DATA.catalogos) ensureCatalogos();
  const existe = DATA.catalogos.personas.some(p=>p.toLowerCase()===n.toLowerCase());
  if(!existe){ DATA.catalogos.personas.push(n); ordenarAlfa(DATA.catalogos.personas); }
}
function leccionesFromRecord(r){
  if(!r || !r.lecciones_aprendidas) return [];
  if(Array.isArray(r.lecciones_aprendidas)) return JSON.parse(JSON.stringify(r.lecciones_aprendidas));
  // compatibilidad con registros previos donde era un único texto
  return [{texto: r.lecciones_aprendidas, la_id: r.leccion_generada_id || null}];
}
function addLeccion(){
  const inp = document.getElementById('f_leccion_nueva');
  const v = inp.value.trim();
  if(!v) return;
  modalLecciones.push({texto: v, la_id: null});
  inp.value = '';
  renderLeccionesList();
}
function removeLeccion(i){
  modalLecciones.splice(i,1);
  renderLeccionesList();
}
function renderLeccionesList(){
  const wrap = document.getElementById('leccionesList');
  if(!wrap) return;
  if(modalLecciones.length===0){ wrap.innerHTML = '<span style="font-size:12px;color:var(--graphite-light)">Sin lecciones aprendidas cargadas.</span>'; return; }
  wrap.innerHTML = modalLecciones.map((l,i)=>`
    <span class="sev-tag" style="background:var(--paper-dark);color:var(--navy);max-width:100%;white-space:normal;">
      💡 ${l.texto} ${l.la_id?`<span class="mono" style="color:var(--graphite-light);font-size:10px;">(${l.la_id})</span>`:''}
      <span style="cursor:pointer;color:var(--red);margin-left:4px;" onclick="removeLeccion(${i})">✕</span>
    </span>`).join('');
}

/* ============ INVESTIGADORES ADICIONALES (solo Incidente) ============ */
function investigadoresFromRecord(r){
  if(r && Array.isArray(r.investigadores)) return JSON.parse(JSON.stringify(r.investigadores));
  return [];
}
function addInvestigador(){
  modalInvestigadores.push({ nombre:'', cargo:'' });
  renderInvestigadoresList();
}
function removeInvestigador(i){
  modalInvestigadores.splice(i,1);
  renderInvestigadoresList();
}
function updateInvestigadorField(i, campo, val){
  if(modalInvestigadores[i]) modalInvestigadores[i][campo] = val;
}
function renderInvestigadoresList(){
  const wrap = document.getElementById('investigadoresList');
  if(!wrap) return;
  if(modalInvestigadores.length===0){ wrap.innerHTML = '<span style="font-size:12px;color:var(--graphite-light)">Sin investigadores adicionales.</span>'; return; }
  wrap.innerHTML = modalInvestigadores.map((inv,i)=>`
    <div class="field-row" style="align-items:flex-end;">
      <div class="field"><label style="font-size:11px;">Nombre</label>
        <input type="text" list="personasDatalist" value="${(inv.nombre||'').replace(/"/g,'&quot;')}" placeholder="Nombre" oninput="updateInvestigadorField(${i},'nombre',this.value)">
      </div>
      <div class="field"><label style="font-size:11px;">Cargo</label>
        <input type="text" value="${(inv.cargo||'').replace(/"/g,'&quot;')}" placeholder="Cargo" oninput="updateInvestigadorField(${i},'cargo',this.value)">
      </div>
      <button class="btn secondary" style="padding:6px 10px;color:var(--red);" onclick="removeInvestigador(${i})">✕</button>
    </div>`).join('');
}

/* ============ ACCIONES CORRECTIVAS / PREVENTIVAS ============ */
function nuevaAccion(){
  return { id: uid(), descripcion:'', responsable:'', vencimiento:'', estado:'Abierto' };
}
function accionesFromRecord(r, campo){
  if(r && Array.isArray(r[campo])) return JSON.parse(JSON.stringify(r[campo]));
  // Compatibilidad con registros anteriores a la versión de acciones múltiples,
  // donde había una única "Acción correctiva / preventiva" de texto libre.
  if(r && campo === 'acciones_correctivas' && (r.accion_correctiva || '').trim()){
    const estadoLegacy = esCerrado(r.estado) ? 'Cerrado' : (normalizeEstado(r.estado) === 'En Proceso' ? 'En Proceso' : 'Abierto');
    return [{ id: uid(), descripcion: r.accion_correctiva, responsable: r.responsable || '', vencimiento: r.fecha_vencimiento || '', estado: estadoLegacy }];
  }
  return [];
}
function accionesArray(tipoAccion){
  return tipoAccion === 'correctiva' ? modalAccionesCorrectivas : modalAccionesPreventivas;
}
function addAccion(tipoAccion){
  accionesArray(tipoAccion).push(nuevaAccion());
  renderAccionesBlock(tipoAccion);
}
function removeAccion(tipoAccion, i){
  accionesArray(tipoAccion).splice(i,1);
  renderAccionesBlock(tipoAccion);
}
function updateAccionField(tipoAccion, i, field, value){
  const arr = accionesArray(tipoAccion);
  if(!arr[i]) return;
  arr[i][field] = value;
  if(field === 'estado') renderAccionesBlock(tipoAccion);
}
function validateEstadoCierre(sel){
  const tipo = document.getElementById('f_tipo').value;
  if(TIPOS_SIN_CAUSA_ACCION.includes(tipo)) return;
  if(sel.value !== 'Cerrado') return;
  const pendientes = [...modalAccionesCorrectivas, ...modalAccionesPreventivas].filter(a => a.estado !== 'Cerrado');
  if(pendientes.length > 0){
    showToast('No se puede cerrar: hay acciones correctivas/preventivas sin cerrar');
    sel.value = 'En Proceso';
  }
}
function renderAccionesBlock(tipoAccion){
  const arr = accionesArray(tipoAccion);
  const wrap = document.getElementById(tipoAccion === 'correctiva' ? 'accionesCorrectivasList' : 'accionesPreventivasList');
  if(!wrap) return;
  if(arr.length === 0){
    wrap.innerHTML = `<div class="accion-empty">Sin acciones ${tipoAccion==='correctiva'?'correctivas':'preventivas'} cargadas.</div>`;
    return;
  }
  wrap.innerHTML = arr.map((a,i)=>`
    <div class="accion-row">
      <div class="accion-row-top">
        <span class="accion-num">#${i+1}</span>
        <span class="sev-tag" style="background:${ACCION_ESTADO_BG[a.estado]||'#EEF0F1'};color:${ACCION_ESTADO_COLOR[a.estado]||'#5B6671'}">${a.estado}</span>
        <span style="cursor:pointer;color:var(--red);margin-left:auto;font-size:12px;" onclick="removeAccion('${tipoAccion}',${i})">✕ Quitar</span>
      </div>
      <div class="field"><label>Descripción de la acción</label>
        <textarea oninput="updateAccionField('${tipoAccion}',${i},'descripcion',this.value)" placeholder="Qué se va a hacer / qué se hizo">${a.descripcion||''}</textarea>
      </div>
      <div class="field-row-3">
        <div class="field"><label>Responsable</label>
          <input type="text" list="personasDatalist" value="${a.responsable||''}" oninput="updateAccionField('${tipoAccion}',${i},'responsable',this.value)">
        </div>
        <div class="field"><label>Fecha de vencimiento</label>
          <input type="date" value="${a.vencimiento||''}" oninput="updateAccionField('${tipoAccion}',${i},'vencimiento',this.value)">
        </div>
        <div class="field"><label>Estado</label>
          <select onchange="updateAccionField('${tipoAccion}',${i},'estado',this.value)">
            ${ACCION_ESTADOS.map(s=>`<option ${a.estado===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>`).join('');
}
function toggleConditionalFields(){
  const tipo = document.getElementById('f_tipo').value;
  document.getElementById('block_ocimf').style.display = TIPOS_CON_OCIMF.includes(tipo) ? 'block' : 'none';
  document.getElementById('block_clasif_origen').style.display = TIPOS_CON_CLASIF_ORIGEN.includes(tipo) ? 'block' : 'none';
  document.getElementById('block_auditoria_nc').style.display = (tipo === 'NC') ? 'block' : 'none';
  document.getElementById('block_causa_accion').style.display = TIPOS_SIN_CAUSA_ACCION.includes(tipo) ? 'none' : 'block';
  document.getElementById('block_responsable_simple').style.display = TIPOS_SIN_CAUSA_ACCION.includes(tipo) ? 'grid' : 'none';
  document.getElementById('block_comunicacion').style.display = TIPOS_SIN_CAUSA_ACCION.includes(tipo) ? 'block' : 'none';
  document.getElementById('block_cuasi').style.display = (tipo === 'CUA') ? 'block' : 'none';
  document.getElementById('block_categoria_aici').style.display = (tipo === 'INC') ? 'block' : 'none';
  // Bloques exclusivos de Incidente: investigadores, condiciones ambientales y descripción guiada
  const esInc = (tipo === 'INC');
  document.getElementById('block_investigadores').style.display = esInc ? 'block' : 'none';
  document.getElementById('block_condiciones_inc').style.display = esInc ? 'block' : 'none';
  document.getElementById('block_desc_inc').style.display = esInc ? 'block' : 'none';
  document.getElementById('block_desc_simple').style.display = esInc ? 'none' : 'block';
  updateCategoriaOptions();
  document.getElementById('block_severidad').style.display = TIPOS_CON_SEVERIDAD.includes(tipo) ? 'block' : 'none';
  document.getElementById('block_lecciones').style.display = TIPOS_CON_LECCIONES.includes(tipo) ? 'block' : 'none';
  toggleLesionBlock();
}
function updateCategoriaOptions(){
  const tipo = document.getElementById('f_tipo').value;
  const sel = document.getElementById('f_categoria_aici');
  const esIncidente = tipo === 'INC';
  const lista = tipo === 'AI' ? CATEGORIAS_ACTO_INSEGURO : (tipo === 'CI' ? CATEGORIAS_CONDICION_INSEGURA : (esIncidente ? TIPIFICACION_INCIDENTE : []));
  document.getElementById('label_categoria_aici').textContent = esIncidente ? 'Tipificación' : 'Categoría';
  document.getElementById('titulo_categoria_aici').textContent = esIncidente ? 'Tipificación del Incidente' : 'Categorización';
  sel.innerHTML = '<option value="">Seleccionar...</option>' + lista.map(c=>`<option value="${c}" ${c===presetCategoriaEvento?'selected':''}>${c}</option>`).join('');
  presetCategoriaEvento = null;
  toggleCategoriaOtro();
}
function toggleCategoriaOtro(){
  const sel = document.getElementById('f_categoria_aici');
  const show = sel && sel.value === 'Otros';
  document.getElementById('field_categoria_otro').style.display = show ? 'block' : 'none';
}
function toggleTipificacionCausaOtro(){
  const sel = document.getElementById('f_tipificacion_causa');
  const show = sel && sel.value === 'Otros';
  document.getElementById('field_tipificacion_causa_otro').style.display = show ? 'block' : 'none';
}
function siNoNaRadios(name, val){
  return ['Sí','No','N/A'].map(o=>`<label style="display:inline-flex;align-items:center;gap:5px;margin:0;font-size:12.5px;font-weight:normal;text-transform:none;letter-spacing:0;color:var(--navy);cursor:pointer;">
      <input type="radio" name="${name}" value="${o}" ${val===o?'checked':''} style="width:auto;margin:0;padding:0;"> ${o}
    </label>`).join('');
}
function getRadioVal(name){
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}

function toggleLesionBlock(){
  const tipo = document.getElementById('f_tipo').value;
  const naturaleza = document.getElementById('f_naturaleza_cuasi') ? document.getElementById('f_naturaleza_cuasi').value : '';
  const mostrar = (tipo === 'ACC') || (tipo === 'CUA' && (naturaleza === 'Personal' || naturaleza === 'Ambas'));
  document.getElementById('block_lesion').style.display = mostrar ? 'block' : 'none';
}
function humanFileSize(bytes){
  if(bytes < 1024) return bytes + ' B';
  if(bytes < 1024*1024) return (bytes/1024).toFixed(0) + ' KB';
  return (bytes/(1024*1024)).toFixed(1) + ' MB';
}
async function addAttachmentFile(input){
  if(!input.files || !input.files[0]) return;
  const f = input.files[0];
  const LIMITE_MB = 2;
  if(f.size > LIMITE_MB * 1024 * 1024){
    showToast(`El archivo supera el límite de ${LIMITE_MB} MB (${humanFileSize(f.size)}). No se puede subir.`);
    input.value = '';
    return;
  }
  // Solo se permiten PDF, JPG y PNG
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  const CONTENT_TYPES = { pdf:'application/pdf', jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png' };
  const contentType = CONTENT_TYPES[ext];
  if(!contentType){
    showToast('Formato no permitido. Solo se aceptan archivos PDF, JPG o PNG.');
    input.value = '';
    return;
  }
  showToast('Subiendo adjunto...');
  const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${new Date().getFullYear()}/${uid()}_${safe}`;
  try{
    const { error } = await supabase.storage.from('hsqe-adjuntos-cleansea').upload(path, f, { contentType, upsert: false });
    if(error) throw error;
    modalAttachments.push({nombre: f.name, tamano: humanFileSize(f.size), fecha: todayISO(), path});
    showToast('Adjunto subido');
  }catch(e){
    const msg = (e && e.message) ? e.message : String(e);
    console.error('Error subiendo adjunto:', msg);
    if(/size|large|exceed|payload|413/i.test(msg)) showToast('El servidor rechazó el archivo por superar el límite de 2 MB');
    else if(/mime|type|not allowed|format/i.test(msg)) showToast('El servidor rechazó el archivo: solo se permiten PDF, JPG o PNG');
    else showToast('Error al subir el adjunto');
  }
  input.value = '';
  renderAttachmentsList();
}
async function openAttachment(i){
  const a = modalAttachments[i];
  if(!a) return;
  if(!a.path){ showToast('Este adjunto es una referencia manual (sin archivo)'); return; }
  try{
    const { data, error } = await supabase.storage.from('hsqe-adjuntos-cleansea').createSignedUrl(a.path, 300);
    if(error) throw error;
    window.open(data.signedUrl, '_blank');
  }catch(e){
    console.error('Error abriendo adjunto:', e && e.message ? e.message : e);
    showToast('No se pudo abrir el adjunto');
  }
}
function addAttachmentManual(){
  const inp = document.getElementById('f_adjunto_manual');
  const v = inp.value.trim();
  if(!v) return;
  modalAttachments.push({nombre: v, tamano: '—', fecha: todayISO()});
  inp.value = '';
  renderAttachmentsList();
}
function removeAttachment(i){
  modalAttachments.splice(i,1);
  renderAttachmentsList();
}
function renderAttachmentsList(){
  const wrap = document.getElementById('attachmentsList');
  if(!wrap) return;
  if(modalAttachments.length===0){ wrap.innerHTML = '<span style="font-size:12px;color:var(--graphite-light)">Sin adjuntos cargados.</span>'; return; }
  wrap.innerHTML = modalAttachments.map((a,i)=>`
    <span class="sev-tag" style="background:var(--paper-dark);color:var(--navy);">
      <span style="cursor:${a.path?'pointer':'default'};${a.path?'text-decoration:underline;':''}" onclick="openAttachment(${i})">📎 ${a.nombre}</span> <span style="color:var(--graphite-light)">(${a.tamano})</span>
      <span style="cursor:pointer;color:var(--red);margin-left:4px;" onclick="removeAttachment(${i})">✕</span>
    </span>`).join('');
}
function updateVesselOptions(preset){
  const coId = document.getElementById('f_empresa').value;
  const co = DATA.companies.find(c=>c.id===coId);
  const sel = document.getElementById('f_instalacion');
  sel.innerHTML = (co?co.vessels:[]).map(v=>`<option value="${v}" ${v===preset?'selected':''}>${v}</option>`).join('');
}
function closeModal(){
  const m = document.getElementById('modalOverlay');
  if(m) m.remove();
}

/* ============ VISADO — RESPONSABLE HSQE / DPA ============ */
// Bloque que se muestra en el pie del formulario de cada registro.
function visadoBlockHtml(r){
  const puede = usuarioActualPuedeVisar();
  if(r && r.visado){
    const quien = `${r.visado_por || '—'}${r.visado_cargo ? ' — ' + r.visado_cargo : ''}`;
    return `<div id="visadoBlock" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#E1EFE4;border:1px solid #1E7A4A;border-radius:6px;padding:8px 12px;">
      <span style="font-size:16px;color:#1E7A4A;">✔</span>
      <div style="line-height:1.3;">
        <div style="font-size:12.5px;font-weight:bold;color:#1E7A4A;">Visado por Responsable HSQE/DPA</div>
        <div style="font-size:11.5px;color:#2b3a2f;">${quien} · ${fmtDate(r.visado_fecha)}</div>
      </div>
      ${puede ? `<button class="btn secondary" style="padding:4px 10px;font-size:11px;margin-left:auto;" onclick="toggleVisado('${r.id}')">Quitar visado</button>` : ''}
    </div>`;
  }
  if(puede){
    return `<div id="visadoBlock">
      <button class="btn" style="background:#1E7A4A;border-color:#1E7A4A;" onclick="toggleVisado('${r.id}')">🖊 Visar como Responsable HSQE/DPA</button>
    </div>`;
  }
  return `<div id="visadoBlock" style="font-size:11.5px;color:var(--graphite-light);font-style:italic;">Pendiente de visado por Responsable HSQE/DPA.</div>`;
}

// Firma manuscrita para los printables (PDF/Word). Devuelve '' si no está visado.
function firmaVisadoHtml(r){
  if(!r || !r.visado) return '';
  const NAVY='#002247', GRAPH='#5B6671';
  const nombre = r.visado_por || 'Emmanuel Martinez';
  const cargo  = r.visado_cargo || 'Gte. HSQE/DPA';
  return `
    <table style="width:100%;margin-top:26px;border-collapse:collapse;">
      <tr><td style="text-align:center;padding-top:6px;">
        <div class="firma-manuscrita" style="font-family:'Great Vibes','Segoe Script','Bradley Hand',cursive;font-size:34pt;color:${NAVY};line-height:1;">${nombre}</div>
        <div style="border-top:1px solid #555;width:280px;margin:2px auto 0;"></div>
        <div style="font-size:8.5pt;color:${GRAPH};margin-top:5px;text-transform:uppercase;letter-spacing:0.6pt;">Visado por Responsable HSQE / DPA</div>
        <div style="font-size:10.5pt;color:${NAVY};font-weight:bold;">${nombre} — ${cargo}</div>
        <div style="font-size:8.5pt;color:${GRAPH};">Fecha de visado: ${fmtDate(r.visado_fecha)}</div>
      </td></tr>
    </table>`;
}

async function toggleVisado(id){
  if(!usuarioActualPuedeVisar()){
    showToast('Solo el Responsable HSQE/DPA autorizado puede visar');
    return;
  }
  const r = DATA.records.find(x=>x.id===id);
  if(!r){ showToast('No se encontró el registro'); return; }
  const v = getVisador(CURRENT_USER);
  if(r.visado){
    if(!confirm('¿Quitar el visado de este reporte?')) return;
    r.visado = false; r.visado_por=''; r.visado_cargo=''; r.visado_email=''; r.visado_fecha='';
  } else {
    r.visado = true;
    r.visado_por   = v ? v.nombre : 'Responsable HSQE/DPA';
    r.visado_cargo = v ? v.cargo  : '';
    r.visado_email = CURRENT_USER;
    r.visado_fecha = todayISO();
  }
  const ok = await upsertRegistro(r);
  if(!ok) return;
  const block = document.getElementById('visadoBlock');
  if(block){
    const tmp = document.createElement('div');
    tmp.innerHTML = visadoBlockHtml(r);
    block.replaceWith(tmp.firstElementChild);
  }
  renderAll();
  showToast(r.visado ? 'Reporte visado por Responsable HSQE/DPA' : 'Visado retirado');
}

async function saveRecord(){
  const get = id => document.getElementById(id).value;
  const getIf = id => document.getElementById(id) ? document.getElementById(id).value : '';
  const tipoSel = get('f_tipo');
  const fechaSel = get('f_fecha');
  const tipoSinAcciones = TIPOS_SIN_CAUSA_ACCION.includes(tipoSel);
  const estadoSel = get('f_estado');
  const esInc = (tipoSel === 'INC');

  // Descripción guiada del Incidente (8 preguntas). Se guarda como objeto q1..q8.
  let incDescripcion = null;
  if(esInc){
    incDescripcion = {};
    INC_PREGUNTAS.forEach((q,i)=>{ incDescripcion['q'+(i+1)] = getIf('f_inc_q'+(i+1)).trim(); });
  }
  // Para validación / tablas / búsqueda, la descripción principal:
  // en Incidente es la respuesta a "Describa qué pasó" (Q1); en el resto, el textarea único.
  const descripcionPrincipal = esInc ? (incDescripcion.q1 || '') : get('f_descripcion');

  if(!tipoSinAcciones && estadoSel === 'Cerrado'){
    const pendientes = [...modalAccionesCorrectivas, ...modalAccionesPreventivas].filter(a => a.estado !== 'Cerrado');
    if(pendientes.length > 0){
      showToast('No se puede cerrar el reporte: hay acciones correctivas/preventivas sin cerrar');
      return;
    }
  }

  const rec = {
    id: editingId || generateRecordId(tipoSel, fechaSel),
    tipo: tipoSel,
    empresa_id: get('f_empresa'),
    instalacion: get('f_instalacion'),
    fecha: fechaSel,
    area: get('f_area'),
    titulo: get('f_titulo'),
    descripcion: descripcionPrincipal,
    inc_descripcion: esInc ? incDescripcion : null,
    reportado_por: get('f_reportado'),
    investigador_lider: esInc ? get('f_investigador_lider') : '',
    investigadores: esInc ? JSON.parse(JSON.stringify(modalInvestigadores.filter(i => (i.nombre||'').trim() || (i.cargo||'').trim()))) : [],
    fuerza_viento: esInc ? getIf('f_fuerza_viento') : '',
    estado_mar: esInc ? getIf('f_estado_mar') : '',
    fuente_luz: esInc ? getIf('f_fuente_luz') : '',
    temp_exterior: esInc ? getIf('f_temp_exterior').trim() : '',
    temp_ambiente: esInc ? getIf('f_temp_ambiente').trim() : '',
    rumbo: esInc ? getIf('f_rumbo').trim() : '',
    velocidad: esInc ? getIf('f_velocidad').trim() : '',
    clasificacion: getIf('f_clasif'),
    incluir_kpi: (tipoSel === 'ACC' && document.getElementById('f_incluir_kpi')) ? document.getElementById('f_incluir_kpi').checked : false,
    naturaleza_cuasi: getIf('f_naturaleza_cuasi'),
    categoria_evento: (tipoSel === 'INC') ? getIf('f_categoria_aici') : '',
    categoria_otro_detalle: (tipoSel === 'INC') ? getIf('f_categoria_otro') : '',
    dano_material_potencial: getIf('f_dano_material'),
    clasificacion_origen: getIf('f_clasif_origen'),
    tipo_auditoria: (tipoSel === 'NC') ? getIf('f_tipo_auditoria') : '',
    ambito_auditoria: (tipoSel === 'NC') ? getIf('f_ambito_auditoria') : '',
    parte_cuerpo: getIf('f_parte_cuerpo'),
    tipo_lesion: getIf('f_tipo_lesion'),
    q_guardia: getRadioVal('q_guardia'),
    q_lugar_autorizado: getRadioVal('q_lugar_autorizado'),
    q_persona_autorizada: getRadioVal('q_persona_autorizada'),
    q_alcohol: getRadioVal('q_alcohol'),
    q_incapacitado: getRadioVal('q_incapacitado'),
    q_asiento_libro: getRadioVal('q_asiento_libro'),
    lecciones_aprendidas: JSON.parse(JSON.stringify(modalLecciones)),
    severidad: TIPOS_CON_SEVERIDAD.includes(tipoSel) ? get('f_severidad') : '',
    estado: estadoSel,
    tipificacion_causa: getIf('f_tipificacion_causa'),
    tipificacion_causa_otro: getIf('f_tipificacion_causa_otro'),
    causa_raiz: getIf('f_causa'),
    acciones_correctivas: tipoSinAcciones ? [] : JSON.parse(JSON.stringify(modalAccionesCorrectivas)),
    acciones_preventivas: tipoSinAcciones ? [] : JSON.parse(JSON.stringify(modalAccionesPreventivas)),
    comunicar_a: getIf('f_comunicar_a'),
    medio_comunicacion: getIf('f_medio_comunicacion'),
    plazo_comunicacion: getIf('f_plazo_comunicacion'),
    responsable: tipoSinAcciones ? get('f_responsable') : '',
    fecha_vencimiento: tipoSinAcciones ? get('f_vencimiento') : '',
    fecha_cierre: get('f_cierre'),
    referencia_normativa: get('f_referencia'),
    adjuntos: JSON.parse(JSON.stringify(modalAttachments)),
  };
  if(!rec.fecha || !rec.titulo || !rec.descripcion){
    showToast(esInc ? 'Completá al menos fecha, título y la pregunta 1 (Describa qué pasó)' : 'Completá al menos fecha, título y descripción');
    return;
  }

  if(editingId){
    const prev = DATA.records.find(x=>x.id===editingId);
    if(prev && prev.visado){
      // Se conserva el visado existente. Nota de auditoría: si el contenido cambió,
      // el visado sigue vigente; ver recomendación de invalidar visado tras edición.
      rec.visado = prev.visado;
      rec.visado_por = prev.visado_por;
      rec.visado_cargo = prev.visado_cargo;
      rec.visado_email = prev.visado_email;
      rec.visado_fecha = prev.visado_fecha;
    }
  }

  if(editingId){
    const idx = DATA.records.findIndex(x=>x.id===editingId);
    DATA.records[idx] = rec;
  } else {
    DATA.records.push(rec);
  }
  registrarPersonaSiEsNueva(rec.reportado_por);
  registrarPersonaSiEsNueva(rec.responsable);
  [...rec.acciones_correctivas, ...rec.acciones_preventivas].forEach(a => registrarPersonaSiEsNueva(a.responsable));
  const nuevasLA = manageLeccionesAprendidas(rec);
  const cambiados = [rec];
  (rec.lecciones_aprendidas || []).forEach(item => {
    if(item.la_id){
      const la = DATA.records.find(x => x.id === item.la_id);
      if(la) cambiados.push(la);
    }
  });
  const resultados = await Promise.all(cambiados.map(r => upsertRegistro(r)));
  await saveCatalogos(); // personas nuevas registradas
  if(resultados.some(ok => !ok)){ return; } // error ya notificado; el modal queda abierto
  closeModal();
  renderAll();
  showToast(nuevasLA>0 ? `Registro guardado — se ${nuevasLA===1?'generó 1 Lección Aprendida':'generaron '+nuevasLA+' Lecciones Aprendidas'} para seguimiento` : (editingId? 'Registro actualizado' : 'Registro creado'));
}
function manageLeccionesAprendidas(rec){
  if(!TIPOS_CON_LECCIONES.includes(rec.tipo) || !Array.isArray(rec.lecciones_aprendidas)) return 0;
  let nuevas = 0;
  rec.lecciones_aprendidas.forEach(item=>{
    const texto = (item.texto||'').trim();
    if(!texto) return;
    if(item.la_id){
      const la = DATA.records.find(x=>x.id===item.la_id && x.tipo==='LA');
      if(la){ la.descripcion = texto; return; }
    }
    const nuevaLA = {
      id: generateRecordId('LA', rec.fecha),
      tipo: 'LA',
      empresa_id: rec.empresa_id,
      instalacion: rec.instalacion,
      fecha: rec.fecha,
      area: rec.area,
      descripcion: texto,
      reportado_por: rec.reportado_por,
      clasificacion_origen: '',
      severidad: '',
      estado: 'Abierto',
      comunicar_a: '',
      medio_comunicacion: '',
      plazo_comunicacion: '',
      responsable: rec.responsable,
      fecha_vencimiento: '',
      fecha_cierre: '',
      referencia_normativa: `Generada automáticamente desde ${rec.id}`,
      adjuntos: [],
      lecciones_aprendidas: [],
      origen_automatico: true,
      origen_registro_id: rec.id,
      origen_registro_tipo: rec.tipo,
    };
    DATA.records.push(nuevaLA);
    item.la_id = nuevaLA.id;
    nuevas++;
  });
  return nuevas;
}
async function deleteRecord(id){
  if(!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
  const ok = await deleteRegistroRow(id);
  if(!ok) return;
  DATA.records = DATA.records.filter(r=>r.id!==id);
  closeModal();
  renderAll();
  showToast('Registro eliminado');
}

/* ============ COMPANY MANAGER ============ */
/* ============ GESTIÓN DE CATÁLOGOS (SITIOS, PERSONAS Y CATEGORÍAS) ============ */
function openCatalogManager(){
  const overlay = document.createElement('div');
  overlay.className='modal-overlay';
  overlay.id='modalOverlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:760px;">
      <div class="modal-head"><h2>Gestionar catálogos</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
      <div class="modal-body" id="catalogManagerBody"></div>
      <div class="modal-foot">
        <div></div>
        <button class="btn secondary" onclick="closeModal()">Cerrar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  renderCatalogManager();
}

/* ============ GESTIÓN DE USUARIOS / VISADORES (Responsables HSQE/DPA) ============ */
function openVisadoresManager(){
  const puede = usuarioActualPuedeVisar();
  const overlay = document.createElement('div');
  overlay.className='modal-overlay';
  overlay.id='modalOverlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:640px;">
      <div class="modal-head"><h2>Usuarios habilitados para visar (HSQE/DPA)</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
      <div class="modal-body">
        <div style="font-size:12px;color:var(--graphite-light);margin-bottom:10px;">
          Sólo los correos de esta lista pueden visar reportes como Responsable HSQE/DPA. La comparación ignora mayúsculas y acentos.
          ${puede ? '' : '<br><b>Estás conectado con un usuario sin permiso de visado, por lo que esta lista es de sólo lectura.</b>'}
        </div>
        <div id="visadoresList"></div>
        ${puede ? `
        <div class="section-title">Agregar visador</div>
        <div class="field-row-3">
          <input type="email" id="newVisadorEmail" placeholder="correo@empresa.com.ar">
          <input type="text" id="newVisadorNombre" placeholder="Nombre y apellido">
          <input type="text" id="newVisadorCargo" placeholder="Cargo (ej: Gte. HSQE/DPA)">
        </div>
        <div style="text-align:right;margin-top:6px;"><button class="btn" onclick="addVisador()">+ Agregar visador</button></div>` : ''}
      </div>
      <div class="modal-foot"><div></div><button class="btn secondary" onclick="closeModal()">Cerrar</button></div>
    </div>`;
  document.body.appendChild(overlay);
  renderVisadoresList();
}
function renderVisadoresList(){
  const wrap = document.getElementById('visadoresList');
  if(!wrap) return;
  const puede = usuarioActualPuedeVisar();
  const lista = getVisadores();
  if(lista.length===0){ wrap.innerHTML = '<span style="font-size:12px;color:var(--graphite-light)">Sin visadores cargados.</span>'; return; }
  wrap.innerHTML = `<table style="width:100%;font-size:12.5px;border-collapse:collapse;">
    <thead><tr><th style="text-align:left;">Correo</th><th style="text-align:left;">Nombre</th><th style="text-align:left;">Cargo</th><th></th></tr></thead>
    <tbody>${lista.map((v,i)=>`<tr>
      <td class="mono" style="font-size:11.5px;">${v.email||'—'}${normEmail(v.email)===normEmail(CURRENT_USER)?' <span style="color:#1E7A4A;">(vos)</span>':''}</td>
      <td>${v.nombre||'—'}</td>
      <td>${v.cargo||'—'}</td>
      <td style="text-align:right;">${puede?`<button class="btn secondary" style="padding:3px 8px;font-size:11px;color:var(--red)" onclick="removeVisador(${i})">✕</button>`:''}</td>
    </tr>`).join('')}</tbody></table>`;
}
async function addVisador(){
  if(!usuarioActualPuedeVisar()){ showToast('No tenés permiso para modificar la lista de visadores'); return; }
  const email = (document.getElementById('newVisadorEmail').value||'').trim();
  const nombre = (document.getElementById('newVisadorNombre').value||'').trim();
  const cargo = (document.getElementById('newVisadorCargo').value||'').trim();
  if(!email || !nombre){ showToast('Completá al menos correo y nombre'); return; }
  if(esVisador(email)){ showToast('Ese correo ya está habilitado'); return; }
  DATA.visadores.push({ email, nombre, cargo });
  const ok = await saveConfig();
  if(!ok) return;
  renderVisadoresList();
  document.getElementById('newVisadorEmail').value='';
  document.getElementById('newVisadorNombre').value='';
  document.getElementById('newVisadorCargo').value='';
  showToast('Visador agregado');
}
async function removeVisador(i){
  if(!usuarioActualPuedeVisar()){ showToast('No tenés permiso para modificar la lista de visadores'); return; }
  const v = DATA.visadores[i];
  if(!v) return;
  if(getVisadores().length<=1){ showToast('Debe quedar al menos un visador habilitado'); return; }
  if(!confirm(`¿Quitar a ${v.nombre||v.email} de los visadores habilitados?`)) return;
  DATA.visadores.splice(i,1);
  const ok = await saveConfig();
  if(!ok) return;
  renderVisadoresList();
  showToast('Visador quitado');
}
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function fmtMesAnio(ym){
  const [y,m] = ym.split('-');
  return `${MESES_ES[parseInt(m,10)-1]} ${y}`;
}
function dotacionSectionHtml(){
  const dot = DATA.catalogos.dotacionMensual || {};
  const meses = Object.keys(dot).sort();
  return `
    <div class="section-title">Dotación de Tripulantes por Mes</div>
    <div style="font-size:11px;color:var(--graphite-light);margin:-4px 0 8px;">
      Cantidad de tripulantes a bordo en cada mes. Se usa como base de exposición para el KPI OCIMF (LTIF / TRCF) de Accidente Personal.
      Si un mes no tiene valor cargado, ese mes no computa exposición (0 h) y las tasas de ese período no se calculan.
    </div>
    <div class="badge-strip" style="margin-bottom:8px;">
      ${meses.length===0 ? '<span style="font-size:12px;color:var(--graphite-light)">Sin meses cargados — se usa el valor por defecto en todos los períodos.</span>' :
        meses.map(m=>`<span class="sev-tag" style="background:var(--paper-dark);color:var(--navy);">${fmtMesAnio(m)}: ${dot[m]} trip. <span style="cursor:pointer;color:var(--red)" onclick="removeDotacionMes('${m}')">✕</span></span>`).join('')}
    </div>
    <div class="field-row-3">
      <input type="month" id="newDotacionMes">
      <input type="number" id="newDotacionCantidad" min="0" step="1" placeholder="Cant. tripulantes">
      <button class="btn secondary" onclick="addDotacionMes()">+ Guardar</button>
    </div>`;
}
async function addDotacionMes(){
  const mesInp = document.getElementById('newDotacionMes');
  const cantInp = document.getElementById('newDotacionCantidad');
  const mes = mesInp.value;
  const cant = parseInt(cantInp.value, 10);
  if(!mes || isNaN(cant) || cant < 0){ showToast('Completá el mes y la cantidad de tripulantes'); return; }
  if(!DATA.catalogos.dotacionMensual) DATA.catalogos.dotacionMensual = {};
  DATA.catalogos.dotacionMensual[mes] = cant;
  await saveData();
  renderCatalogManager();
  renderOcimfKpi();
  showToast('Dotación guardada');
}
async function removeDotacionMes(mes){
  if(DATA.catalogos.dotacionMensual) delete DATA.catalogos.dotacionMensual[mes];
  await saveData();
  renderCatalogManager();
  renderOcimfKpi();
}
function sitiosSectionHtml(){
  const c = DATA.companies[0];
  if(!c) return '';
  return `
    <div class="section-title">${c.name} — Logo</div>
    <div class="field-row" style="align-items:center;">
      <div style="display:flex;align-items:center;gap:10px;">
        ${getCompanyLogo(c.id) ? `<img src="${getCompanyLogo(c.id)}" style="height:40px;max-width:90px;object-fit:contain;border:1px solid var(--line);border-radius:3px;padding:3px;background:#fff;">` : `<span style="font-size:11px;color:var(--graphite-light);">Sin logo cargado</span>`}
        <input type="file" accept="image/*" onchange="setCompanyLogo(0, this)">
      </div>
    </div>
    <div class="section-title">Sitios / Buques</div>
    <div style="font-size:11px;color:var(--graphite-light);margin:-4px 0 8px;">Se usan para filtrar la plataforma y para el reporte PDF por sitio.</div>
    <div class="badge-strip" style="margin-bottom:8px;">
      ${c.vessels.length===0 ? '<span style="font-size:12px;color:var(--graphite-light)">Sin sitios/buques cargados.</span>' :
        c.vessels.map((v,vi)=>`<span class="sev-tag" style="background:var(--paper-dark);color:var(--navy);">${v} <span style="cursor:pointer;color:var(--red)" onclick="removeVessel(0,${vi})">✕</span></span>`).join('')}
    </div>
    <div class="field-row">
      <input type="text" id="newVessel_0" placeholder="Nuevo sitio/buque">
      <button class="btn secondary" onclick="addVessel(0)">+ Agregar</button>
    </div>`;
}
function setCompanyLogo(ci, input){
  if(!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    DATA.companies[ci].logo = e.target.result;
    await saveData();
    renderCatalogManager();
    renderBrandLogo();
    showToast('Logo actualizado');
  };
  reader.readAsDataURL(input.files[0]);
}
async function addVessel(ci){
  const inp = document.getElementById('newVessel_'+ci);
  const v = inp.value.trim();
  if(!v) return;
  DATA.companies[ci].vessels.push(v);
  ordenarAlfa(DATA.companies[ci].vessels);
  await saveData(); renderCatalogManager(); renderAll();
}
async function removeVessel(ci,vi){
  DATA.companies[ci].vessels.splice(vi,1);
  await saveData(); renderCatalogManager(); renderAll();
}
function catalogSectionHtml(title, hint, listKey, list){
  return `
    <div class="section-title">${title}</div>
    ${hint ? `<div style="font-size:11px;color:var(--graphite-light);margin:-4px 0 8px;">${hint}</div>` : ''}
    <div class="badge-strip" style="margin-bottom:8px;">
      ${list.length===0 ? '<span style="font-size:12px;color:var(--graphite-light)">Sin elementos cargados.</span>' :
        list.map((v,vi)=>`<span class="sev-tag" style="background:var(--paper-dark);color:var(--navy);">${v} <span style="cursor:pointer;color:var(--red)" onclick="removeCatalogItem('${listKey}',${vi})">✕</span></span>`).join('')}
    </div>
    <div class="field-row">
      <input type="text" id="newItem_${listKey}" placeholder="Agregar nuevo...">
      <button class="btn secondary" onclick="addCatalogItem('${listKey}')">+ Agregar</button>
    </div>`;
}
function renderCatalogManager(){
  const body = document.getElementById('catalogManagerBody');
  const cat = DATA.catalogos;
  body.innerHTML =
    `<div class="section-title">Usuarios / Visadores (Responsable HSQE/DPA)</div>
     <div style="font-size:11px;color:var(--graphite-light);margin:-4px 0 8px;">Administrá qué usuarios pueden visar reportes como Responsable HSQE/DPA.</div>
     <div style="margin-bottom:14px;"><button class="btn secondary" onclick="openVisadoresManager()">👤 Gestionar visadores</button></div>` +
    sitiosSectionHtml() +
    dotacionSectionHtml() +
    catalogSectionHtml('Personas (Responsable / Reportado por)',
      'Se usan como sugerencia al escribir en los campos "Responsable" y "Reportado por". También se agregan solas cuando cargás un nombre nuevo.',
      'personas', cat.personas) +
    catalogSectionHtml('Tipificación — Incidente',
      'Opciones disponibles al reportar un Incidente (daño a la carga, al buque, derrame, etc.).',
      'tipificacionIncidente', cat.tipificacionIncidente) +
    catalogSectionHtml('Tipificación — Causa Raíz',
      'Opciones del campo "Tipificación de la causa raíz", disponible en todos los reportes con Causa Raíz y Acciones (NC, Observación, Oport. Mejora, Accidente Personal, Incidente, Cuasi Accidente, Acto Inseguro, Condición Insegura).',
      'tipificacionCausaRaiz', cat.tipificacionCausaRaiz.filter(c=>c)) +
    catalogSectionHtml('Clasificación — NC / Observación / Oport. Mejora / Lección Aprendida',
      'Opciones del campo "Clasificación" para estos cuatro tipos.',
      'clasifOrigen', cat.clasifOrigen.filter(c=>c));
}
async function addCatalogItem(listKey){
  const inp = document.getElementById('newItem_'+listKey);
  const v = inp.value.trim();
  if(!v) return;
  DATA.catalogos[listKey].push(v);
  ordenarAlfa(DATA.catalogos[listKey]);
  await saveData();
  renderCatalogManager();
  renderPersonasDatalist();
  showToast('Agregado');
}
async function removeCatalogItem(listKey, idx){
  // clasifOrigen y tipificacionCausaRaiz se muestran sin el "" inicial (placeholder); hay que ajustar el índice real
  const realIdx = (listKey === 'clasifOrigen' || listKey === 'tipificacionCausaRaiz') ? idx + 1 : idx;
  DATA.catalogos[listKey].splice(realIdx,1);
  await saveData();
  renderCatalogManager();
  renderPersonasDatalist();
}

/* ============ EXPORT ============ */
function exportData(){
  const blob = new Blob([JSON.stringify(DATA, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `hsqe_integra_export_${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exportación generada');
}

/* ============ REPORTE PDF DE GRÁFICOS ============ */
async function printChartsReport(){
  const container = document.getElementById('printReport');
  const now = new Date();
  const fechaHora = now.toLocaleDateString('es-AR') + ' ' + now.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'});
  const co = DATA.companies[0] || null;
  const logo = co ? getCompanyLogo(co.id) : null;
  const kpiMode = currentTypeFilter === 'KPI';
  const scopeLabel = kpiMode ? 'KPI HSQE' : document.getElementById('chartsSectionLabel').textContent;
  const scoreEl = document.getElementById('scoreCardTable');
  const scoreHtml = (kpiMode && scoreEl)
    ? `<div style="margin-top:18px;"><h3 style="font-family:'Saira';font-size:16px;color:#002247;border-bottom:2px solid #0A3A66;padding-bottom:4px;">Score Card</h3>${scoreEl.outerHTML}</div>`
    : '';

  // KPIs: se clona tal cual se ve en pantalla
  const kpiHtml = kpiMode ? '' : document.getElementById('kpiRow').outerHTML;

  // KPI OCIMF (solo si la vista actual es Accidente Personal): se clona con los valores ya calculados en pantalla
  let ocimfHtml = '';
  if(currentTypeFilter === 'KPI' && document.getElementById('ocimfKpiPanel').style.display !== 'none'){
    const desde = document.getElementById('ocimfDesde').value;
    const hasta = document.getElementById('ocimfHasta').value;
    const ocimfCardsHtml = document.getElementById('ocimfKpiRow').outerHTML;
    const ocimfInfoHtml = document.getElementById('ocimfExposureInfo').innerHTML;
    ocimfHtml = `
      <div style="margin:4px 0 18px;">
        <h3 style="font-family:'Saira';font-size:16px;color:#002247;border-bottom:2px solid #0A3A66;padding-bottom:4px;">KPI OCIMF — Frecuencia de Lesiones (${fmtDate(desde)} a ${fmtDate(hasta)})</h3>
        ${ocimfCardsHtml}
        <div style="font-size:11px;color:#5B6671;margin-top:6px;line-height:1.5;">${ocimfInfoHtml}</div>
      </div>`;
  }

  // KPI — No Conformidades en Auditorías ISM/ISO (solo si la vista actual es NC)
  let auditNcHtml = '';
  if(currentTypeFilter === 'KPI' && document.getElementById('auditNcKpiPanel').style.display !== 'none'){
    const auditDesde = document.getElementById('auditNcDesde').value;
    const auditHasta = document.getElementById('auditNcHasta').value;
    const auditNcCardsHtml = document.getElementById('auditNcKpiRow').outerHTML;
    const auditNcInfoHtml = document.getElementById('auditNcInfo').innerHTML;
    auditNcHtml = `
      <div style="margin:4px 0 18px;">
        <h3 style="font-family:'Saira';font-size:16px;color:#002247;border-bottom:2px solid #0A3A66;padding-bottom:4px;">KPI — No Conformidades en Auditorías ISM / ISO (${fmtDate(auditDesde)} a ${fmtDate(auditHasta)})</h3>
        ${auditNcCardsHtml}
        <div style="font-size:11px;color:#5B6671;margin-top:6px;line-height:1.5;">${auditNcInfoHtml}</div>
      </div>`;
  }

  // Gráficos: misma estructura chart-row / chart-card, canvas reemplazado por imagen
  const chartDefs = [
    {canvas:'chartTipo', titleEl:'chartTitle1', obj:charts.tipo},
    {canvas:'chartEstado', titleEl:'chartTitle2', obj:charts.estado},
    {canvas:'chartEmpresa', titleEl:'chartTitle3', obj:charts.empresa},
    {canvas:'chartCausa', titleEl:'chartTitle4', obj:charts.causa},
  ];
  let chartsHtml = '';
  if(!kpiMode){
    chartsHtml = '<div class="chart-row">';
    chartDefs.forEach(cd=>{
      const canvasEl = document.getElementById(cd.canvas);
      const title = document.getElementById(cd.titleEl).textContent;
      if(!canvasEl || !cd.obj) return;
      const img = canvasEl.toDataURL('image/png', 1.0);
      chartsHtml += `<div class="chart-card"><h3>${title}</h3><img src="${img}" style="width:100%;"></div>`;
    });
    chartsHtml += '</div>';
  }

  // Tabla: se clona la tabla tal cual se ve en pantalla (mismos filtros aplicados), sin la columna de acción de impresión
  let tableHtml = '';
  if(!kpiMode){
    tableHtml = document.getElementById('tableWrap').innerHTML;
    tableHtml = tableHtml.replace(/<th>\s*<\/th>\s*<\/tr>/, '</tr>');
    tableHtml = tableHtml.replace(/<td[^>]*>\s*<button[^>]*>📄<\/button>\s*<\/td>/g, '');
  }

  container.innerHTML = `<div class="pr-record">
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
      <tr>
        <td style="width:70%;vertical-align:middle;border-bottom:3px solid #002247;padding-bottom:8px;">
          <div class="pr-title">INTEGRA · MÓDULO HSQE — ${kpiMode ? 'KPI HSQE' : 'GRÁFICOS'}</div>
          <div class="pr-sub">${scopeLabel} · ${co?co.name:''}${currentSiteFilter!=='ALL' ? ' — '+currentSiteFilter : ''} · Generado el ${fechaHora}</div>
        </td>
        <td style="width:30%;text-align:right;">${logo?`<img src="${logo}" style="max-height:60px;max-width:160px;">`:''}</td>
      </tr>
    </table>
    ${kpiHtml}
    ${chartsHtml}
    ${ocimfHtml}
    ${auditNcHtml}
    ${scoreHtml}
    ${kpiMode ? '' : `<div style="margin-top:18px;">
      <h3 style="font-family:'Saira';font-size:16px;color:#002247;border-bottom:2px solid #0A3A66;padding-bottom:4px;">Registros incluidos</h3>
      ${tableHtml}
    </div>`}
  </div>`;

  // Esperar a que las imágenes (gráficos convertidos a PNG y logo) estén decodificadas
  // antes de imprimir; si no, en la primera impresión salen en blanco.
  const imgs = Array.from(container.querySelectorAll('img'));
  try{
    await Promise.all(imgs.map(img => {
      if(img.complete && img.naturalWidth > 0) return Promise.resolve();
      if(img.decode) return img.decode().catch(()=>{});
      return new Promise(res => { img.onload = res; img.onerror = res; });
    }));
  }catch(e){ /* seguimos igual con la impresión */ }
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.print();
}

function printCompanyReport(){
  const container = document.getElementById('printReport');
  const now = new Date();
  const fechaHora = now.toLocaleDateString('es-AR') + ' ' + now.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'});

  const empresa = DATA.companies[0];
  const todosLosSitios = (empresa && empresa.vessels) || [];
  const sitiosAImprimir = currentSiteFilter === 'ALL' ? todosLosSitios : [currentSiteFilter];

  const tituloAlcance = currentSiteFilter === 'ALL'
    ? `ESTADO POR SITIO — ${empresa ? empresa.name.toUpperCase() : ''}`
    : `ESTADO — ${currentSiteFilter.toUpperCase()}`;

  const logoPrincipal = empresa ? getCompanyLogo(empresa.id) : null;

  let html = `
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
      <tr>
        <td style="width:70%;vertical-align:middle;border-bottom:3px solid #002247;padding-bottom:8px;">
          <div class="pr-title">INTEGRA · MÓDULO HSQE — ${tituloAlcance}</div>
          <div class="pr-sub">Generado el ${fechaHora}</div>
        </td>
        <td style="width:30%;text-align:right;border-bottom:3px solid #002247;padding-bottom:8px;">
          ${logoPrincipal ? `<img src="${logoPrincipal}" style="max-height:60px;max-width:160px;">` : ''}
        </td>
      </tr>
    </table>`;

  sitiosAImprimir.forEach(sitio => {
    const recs = DATA.records.filter(r => r.instalacion === sitio);
    const abiertas = recs.filter(r => !esCerrado(r.estado));
    const vencidas = recs.filter(isOverdue);
    const cerradas = recs.filter(r => esCerrado(r.estado));

    html += `<div class="pr-company">
      <div style="font-family:'DM Mono';font-size:10px;color:var(--graphite-light);margin-bottom:4px;">INTEGRA · Módulo HSQE — Generado el ${fechaHora}</div>
      <h2>${sitio}</h2>
      <div class="pr-kpis">
        <div class="pr-kpi"><div class="n">${recs.length}</div><div class="l">Total registros</div></div>
        <div class="pr-kpi"><div class="n">${abiertas.length}</div><div class="l">Abiertas / en curso</div></div>
        <div class="pr-kpi"><div class="n ${vencidas.length>0?'alert':''}">${vencidas.length}</div><div class="l">Acciones vencidas</div></div>
        <div class="pr-kpi"><div class="n">${cerradas.length}</div><div class="l">Cerradas / verificadas</div></div>
      </div>`;

    if(recs.length === 0){
      html += `<div class="pr-empty">Sin registros cargados para este sitio.</div>`;
    } else {
      const sorted = [...recs].sort((a,b)=>{
        const wA = !esCerrado(a.estado) ? 0 : 1;
        const wB = !esCerrado(b.estado) ? 0 : 1;
        if(wA!==wB) return wA-wB;
        return (b.fecha||'').localeCompare(a.fecha||'');
      });
      html += `<table class="pr-table">
        <thead><tr>
          <th>ID</th><th>Tipo</th><th>Fecha</th><th>Descripción</th><th>Estado</th><th>Responsable</th><th>Vencimiento</th>
        </tr></thead><tbody>`;
      sorted.forEach(r=>{
        const resumen = accionesResumen(r);
        html += `<tr>
          <td>${r.id}</td>
          <td>${TYPES[r.tipo]?TYPES[r.tipo].label:r.tipo}</td>
          <td>${fmtDate(r.fecha)}</td>
          <td>${(r.descripcion||'').slice(0,90)}</td>
          <td>${r.estado}${isOverdue(r)?' ⚠ VENCIDA':''}</td>
          <td>${resumen.responsable}</td>
          <td>${resumen.vencimiento?fmtDate(resumen.vencimiento):'—'}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
    }
    html += `</div>`;
  });

  container.innerHTML = html;
  window.print();
}
window.addEventListener('afterprint', ()=>{ document.getElementById('printReport').innerHTML = ''; });

/* ============ IMPRESIÓN DE REGISTRO INDIVIDUAL ============ */
// Convierte el logo a base64 para incrustarlo dentro del .doc (autocontenido).
// Los logos subidos por el usuario ya vienen como data URI; los logos por
// defecto (/PL.png, /cleansea.png) se descargan y se convierten al vuelo.
async function logoToDataURL(src){
  if(!src) return null;
  if(src.startsWith('data:')) return src;
  try{
    const resp = await fetch(src);
    const blob = await resp.blob();
    return await new Promise((resolve, reject)=>{
      const fr = new FileReader();
      fr.onload  = ()=>resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  }catch(e){
    console.warn('No se pudo cargar el logo para el Word:', src, e);
    return null; // seguimos sin logo en vez de romper la descarga
  }
}

// Descarga un adjunto de Storage (vía URL firmada) y lo devuelve como data URL + mime,
// para poder incrustarlo dentro del PDF como anexo.
// Descarga un adjunto de Storage (vía URL firmada) y lo devuelve como bytes + tipo,
// para incrustarlo/fusionarlo en el PDF final con pdf-lib.
async function attachmentToBytes(path, nombre){
  if(!path) return null;
  const { data, error } = await supabase.storage.from('hsqe-adjuntos-cleansea').createSignedUrl(path, 300);
  if(error || !data || !data.signedUrl) throw (error || new Error('sin URL firmada'));
  const resp = await fetch(data.signedUrl);
  if(!resp.ok) throw new Error('HTTP ' + resp.status);
  const bytes = new Uint8Array(await resp.arrayBuffer());
  const mime = resp.headers.get('content-type') || '';
  const ext = (nombre || path || '').split('.').pop().toLowerCase();
  return { bytes, mime, ext };
}

// Compositor común del cuerpo del reporte (usado por Word y por PDF).
async function composeRecordBody(id){
  const r = DATA.records.find(x=>x.id===id);
  if(!r){ showToast('No se encontró el registro'); return null; }
  const co = DATA.companies.find(c=>c.id===r.empresa_id);
  const logo = await logoToDataURL(getCompanyLogo(r.empresa_id));
  const now = new Date();
  const fechaHora = now.toLocaleDateString('es-AR') + ' ' + now.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'});
  const tipoInfo = TYPES[r.tipo] || {label:r.tipo, color:'#333'};
  const NAVY='#002247', ORANGE='#0A3A66', GRAPH='#5B6671', LINE='#DBE0E6';

  const metaRow = (a,b) => `<tr>
    <td style="border:1px solid ${LINE};padding:6px 10px;width:33%;"><div style="font-size:8pt;text-transform:uppercase;color:${GRAPH};letter-spacing:0.5pt;">${a.l}</div><div style="font-size:10.5pt;color:${NAVY};font-weight:bold;">${a.v}</div></td>
    <td style="border:1px solid ${LINE};padding:6px 10px;width:33%;"><div style="font-size:8pt;text-transform:uppercase;color:${GRAPH};letter-spacing:0.5pt;">${b.l}</div><div style="font-size:10.5pt;color:${NAVY};font-weight:bold;">${b.v}</div></td>
  </tr>`;

  const resumenMeta = accionesResumen(r);
  let body = `
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
      <tr>
        <td style="width:70%;vertical-align:middle;border-bottom:3px solid ${NAVY};padding-bottom:8px;">
          <div style="font-family:Arial,sans-serif;font-size:18pt;font-weight:bold;color:${NAVY};letter-spacing:1pt;">INTEGRA · MÓDULO HSQE</div>
          <div style="font-size:11pt;color:${ORANGE};font-weight:bold;letter-spacing:0.5pt;">SOLICITUD DE ACCIÓN / RESPUESTA</div>
          <div style="font-size:8.5pt;color:${GRAPH};font-family:'Courier New',monospace;margin-top:2px;">Generado el ${fechaHora}</div>
        </td>
        <td style="width:30%;text-align:right;vertical-align:middle;border-bottom:3px solid ${NAVY};padding-bottom:8px;">
          ${logo ? `<img src="${logo}" style="max-height:60px;max-width:160px;">` : ''}
        </td>
      </tr>
    </table>

    <p style="margin:0 0 10px;">
      <span style="background:${tipoInfo.color};color:#fff;font-weight:bold;padding:3px 12px;border-radius:3px;font-size:10pt;">${tipoInfo.label}</span>
      &nbsp;&nbsp;<span style="font-family:'Courier New',monospace;font-size:10.5pt;color:${GRAPH};">${r.id}</span>
    </p>
    ${r.titulo ? `<div style="font-family:Arial;font-size:15pt;font-weight:bold;color:${NAVY};margin:0 0 12px;">${r.titulo}</div>` : ''}

    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
      ${metaRow({l:'Empresa', v:co?co.name:'—'}, {l:'Instalación / Área', v:(r.instalacion||'—')+(r.area?' · '+r.area:'')})}
      ${metaRow({l:'Fecha del evento', v:fmtDate(r.fecha)}, {l:'Severidad', v:r.severidad||'—'})}
      ${metaRow({l:'Estado actual', v:r.estado||'—'}, {l:'Responsable', v:resumenMeta.responsable})}
      ${metaRow({l:'Reportado por', v:r.reportado_por||'—'}, {l:'Fecha de vencimiento', v:(resumenMeta.vencimiento?fmtDate(resumenMeta.vencimiento):'—')+(isOverdue(r)?' ⚠ VENCIDA':'')})}
      ${metaRow({l:'Fecha de cierre', v:fmtDate(r.fecha_cierre)}, {l:'Referencia normativa', v:r.referencia_normativa||'—'})}
    </table>

    `;

  const secH3 = t => `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">${t}</h3>`;
  if(r.tipo==='INC'){
    // Investigadores
    if(r.investigador_lider || (Array.isArray(r.investigadores) && r.investigadores.length)){
      body += secH3('Investigadores');
      body += `<p style="font-size:10.5pt;margin:0 0 4px;"><b>Investigador líder:</b> ${r.investigador_lider||'—'}</p>`;
      if(Array.isArray(r.investigadores) && r.investigadores.length){
        body += `<p style="font-size:10.5pt;margin:0 0 2px;"><b>Investigadores adicionales:</b></p>` +
          r.investigadores.map(i=>`<p style="font-size:10pt;margin:0 0 2px 12px;">• ${i.nombre||'—'}${i.cargo?' — '+i.cargo:''}</p>`).join('');
      }
    }
    // Condiciones al momento del evento
    body += secH3('Datos del incidente (condiciones al momento del evento)');
    body += `<table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
      ${metaRow({l:'Fuerza del viento', v:r.fuerza_viento||'N/A'}, {l:'Estado del mar', v:r.estado_mar||'N/A'})}
      ${metaRow({l:'Fuente de luz', v:r.fuente_luz||'N/A'}, {l:'Temperatura exterior (°C)', v:r.temp_exterior||'N/A'})}
      ${metaRow({l:'Temperatura ambiente (°C)', v:r.temp_ambiente||'N/A'}, {l:'Rumbo (verdadero, °)', v:r.rumbo||'N/A'})}
      ${metaRow({l:'Velocidad (nudos)', v:r.velocidad||'N/A'}, {l:'', v:''})}
    </table>`;
  }

  // Descripción (guiada para Incidente; libre para el resto)
  body += secH3(r.tipo==='INC' ? 'Descripción del Incidente' : 'Descripción del Evento');
  body += r.tipo==='INC'
    ? INC_PREGUNTAS.map((q,i)=>{ const a = (r.inc_descripcion && r.inc_descripcion['q'+(i+1)]) ? r.inc_descripcion['q'+(i+1)] : ''; return `<p style="font-size:10.5pt;line-height:1.45;margin:0 0 7px;"><b>${i+1}. ${q}</b><br>${a || '—'}</p>`; }).join('')
    : `<p style="font-size:10.5pt;line-height:1.5;">${r.descripcion||'—'}</p>`;

  if(TIPOS_CON_OCIMF.includes(r.tipo) && r.clasificacion){
    body += `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">Clasificación OCIMF/TMSA</h3><p style="font-size:10.5pt;">${r.clasificacion}${r.incluir_kpi?' <i>(incluido en KPI OCIMF)</i>':''}</p>`;
  }
  if(r.tipo==='CUA' && (r.naturaleza_cuasi || r.dano_material_potencial)){
    body += `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">Detalle del Cuasi Accidente</h3>
      <p style="font-size:10.5pt;"><b>Naturaleza:</b> ${r.naturaleza_cuasi||'—'}</p>
      ${r.dano_material_potencial?`<p style="font-size:10.5pt;"><b>Daño material potencial:</b> ${r.dano_material_potencial}</p>`:''}`;
  }
  if(r.parte_cuerpo || r.tipo_lesion){
    body += `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">Datos de la Lesión</h3>
      <p style="font-size:10.5pt;"><b>Parte del cuerpo afectada:</b> ${r.parte_cuerpo||'—'} &nbsp;·&nbsp; <b>Tipo de lesión:</b> ${r.tipo_lesion||'—'}</p>`;
  }
  const consideraciones = [
    ['¿La persona estaba de guardia?', r.q_guardia],
    ['¿El lugar estaba autorizado para realizar el trabajo?', r.q_lugar_autorizado],
    ['¿La persona estaba autorizada para realizar el trabajo?', r.q_persona_autorizada],
    ['¿La persona estaba bajo la influencia de alcohol?', r.q_alcohol],
    ['¿Está incapacitado para trabajar?', r.q_incapacitado],
    ['¿Se realizó asiento en el libro de navegación?', r.q_asiento_libro],
  ];
  if(consideraciones.some(c=>c[1])){
    body += `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">Consideraciones del Evento</h3>
      <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:6px;">` +
      consideraciones.map(c=>`<tr>
        <td style="border:1px solid ${LINE};padding:5px 9px;">${c[0]}</td>
        <td style="border:1px solid ${LINE};padding:5px 9px;text-align:center;font-weight:bold;width:60px;">${c[1]||'—'}</td>
      </tr>`).join('') + `</table>`;
  }
  if((r.tipo==='AI' || r.tipo==='CI' || r.tipo==='INC') && r.categoria_evento){
    const tituloCat = r.tipo === 'INC' ? 'Tipificación' : 'Categorización';
    body += `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">${tituloCat}</h3>
      <p style="font-size:10.5pt;">${r.categoria_evento}${r.categoria_evento==='Otros' && r.categoria_otro_detalle ? ' — '+r.categoria_otro_detalle : ''}</p>`;
  }
  if(TIPOS_CON_CLASIF_ORIGEN.includes(r.tipo) && r.clasificacion_origen){
    body += `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">Clasificación</h3><p style="font-size:10.5pt;">${r.clasificacion_origen}</p>`;
    if(r.tipo === 'NC' && (r.tipo_auditoria || r.ambito_auditoria)){
      body += `<p style="font-size:10.5pt;"><b>Origen de auditoría:</b> ${r.tipo_auditoria||'—'} · ${r.ambito_auditoria||'—'}</p>`;
    }
  }
  if(!TIPOS_SIN_CAUSA_ACCION.includes(r.tipo) && (r.causa_raiz || r.tipificacion_causa || (r.acciones_correctivas||[]).length || (r.acciones_preventivas||[]).length)){
    body += `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">Análisis y Acción</h3>
      ${r.tipificacion_causa?`<p style="font-size:10.5pt;"><b>Tipificación de la causa raíz:</b> ${r.tipificacion_causa}${r.tipificacion_causa==='Otros' && r.tipificacion_causa_otro ? ' — '+r.tipificacion_causa_otro : ''}</p>`:''}
      ${r.causa_raiz?`<p style="font-size:10.5pt;"><b>Descripción de causas:</b> ${r.causa_raiz}</p>`:''}`;
    const accionRow = (titulo, lista) => {
      if(!lista || lista.length===0) return `<p style="font-size:10.5pt;"><b>${titulo}:</b> sin acciones cargadas.</p>`;
      return `<p style="font-size:10.5pt;margin-bottom:2px;"><b>${titulo}:</b></p>` + lista.map((a,i)=>
        `<p style="font-size:10pt;margin:0 0 6px 12px;">${i+1}. ${a.descripcion||'—'} <br>
          <span style="font-size:9pt;color:${GRAPH};">Responsable: ${a.responsable||'—'} · Vencimiento: ${fmtDate(a.vencimiento)} · Estado: ${a.estado||'—'}</span>
        </p>`).join('');
    };
    body += accionRow('Acciones Correctivas', r.acciones_correctivas);
    body += accionRow('Acciones Preventivas', r.acciones_preventivas);
  }
  if(TIPOS_SIN_CAUSA_ACCION.includes(r.tipo) && (r.comunicar_a || r.medio_comunicacion || r.plazo_comunicacion)){
    body += `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">Comunicación</h3>
      <p style="font-size:10.5pt;"><b>A quién comunicar:</b> ${r.comunicar_a||'—'}</p>
      <p style="font-size:10.5pt;"><b>Medio:</b> ${r.medio_comunicacion||'—'} &nbsp;·&nbsp; <b>Plazo:</b> ${r.plazo_comunicacion||'—'}</p>`;
  }
  if(Array.isArray(r.lecciones_aprendidas) && r.lecciones_aprendidas.length>0){
    body += `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">Lecciones Aprendidas</h3>` +
      r.lecciones_aprendidas.map(l=>`<p style="font-size:10.5pt;">💡 ${l.texto}${l.la_id?` <span style="font-family:'Courier New',monospace;font-size:9pt;color:${GRAPH};">(${l.la_id})</span>`:''}</p>`).join('');
  }
  if(Array.isArray(r.adjuntos) && r.adjuntos.length>0){
    // Listado resumen dentro del reporte (los archivos se incrustan luego como páginas de anexo)
    body += `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">Anexos al reporte</h3>` +
      r.adjuntos.map((a,i)=>`<p style="font-size:10.5pt;margin:0 0 3px;">${i+1}. 📎 ${a.nombre}${a.tamano&&a.tamano!=='—'?` <span style="color:${GRAPH};">(${a.tamano})</span>`:''}${a.fecha?` <span style="color:${GRAPH};font-size:9pt;">· ${fmtDate(a.fecha)}</span>`:''}${!a.path?` <span style="color:${GRAPH};font-size:9pt;">· referencia física/externa</span>`:''}</p>`).join('');
  }

  return { r, co, logo, tipoInfo, body };
}

// Printable en PDF, formato VERTICAL (A4 retrato). Imprime desde un iframe oculto
// (sin abrir una pestaña en blanco) y espera a que carguen la fuente y las imágenes
// antes de disparar la impresión. Si el reporte está visado, incluye la firma al pie.
let _firmaFontLoaded = false;
async function ensureFirmaFont(){
  if(_firmaFontLoaded) return;
  try{
    if(!document.getElementById('greatVibesLink')){
      const l = document.createElement('link');
      l.id = 'greatVibesLink'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap';
      document.head.appendChild(l);
    }
    if(document.fonts && document.fonts.load){
      await document.fonts.load('40px "Great Vibes"');
      await document.fonts.ready;
    }
  }catch(e){ /* sin conexión: cae a cursiva del sistema */ }
  _firmaFontLoaded = true;
}

// Texto seguro para las fuentes estándar de pdf-lib (WinAnsi): quita emojis/símbolos raros.
function pdfSafe(s){ return (s||'').replace(/[^\x00-\xFF]/g, ''); }
function drawAnexoHeader(page, font, num, nombre, nota){
  const { width, height } = page.getSize();
  const navy = rgb(0, 0.13, 0.28), gray = rgb(0.36, 0.4, 0.44);
  page.drawText('ANEXO ' + num, { x:36, y:height-48, size:9, font, color:gray });
  page.drawText(pdfSafe(nombre).slice(0,80), { x:36, y:height-66, size:13, font, color:navy });
  page.drawLine({ start:{x:36,y:height-74}, end:{x:width-36,y:height-74}, thickness:1.5, color:navy });
  if(nota) page.drawText(pdfSafe(nota).slice(0,110), { x:36, y:height-90, size:9, font, color:gray });
}

// Convierte una franja vertical de un canvas a bytes PNG (para pdf-lib).
function canvasRegionToPngBytes(srcCanvas, sy, sh){
  const c = document.createElement('canvas');
  c.width = srcCanvas.width; c.height = sh;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(srcCanvas, 0, sy, srcCanvas.width, sh, 0, 0, srcCanvas.width, sh);
  const b64 = c.toDataURL('image/png').split(',')[1];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for(let i=0; i<bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Genera un PDF real (A4 vertical), incrusta las imágenes como páginas y FUSIONA
// los PDF adjuntos (sus páginas se copian tal cual), y lo descarga.
async function printRecordPDF(id){
  const doc = await composeRecordBody(id);
  if(!doc) return;
  const { r, body } = doc;
  let holder = null;
  try{
    showToast('Generando PDF...');
    await ensureFirmaFont();

    const A4 = [595.28, 841.89];
    const M = 36;
    const contentW = A4[0] - M*2;   // 523.28 pt
    const contentH = A4[1] - M*2;   // 769.89 pt
    const HOLDER_W = 760;           // ancho de render en px

    // 1) Render del reporte (mismo HTML/estilos que en pantalla) a un canvas
    holder = document.createElement('div');
    holder.style.cssText = `position:fixed;left:-99999px;top:0;width:${HOLDER_W}px;background:#ffffff;color:#222;font-family:Calibri,Arial,sans-serif;font-size:11pt;padding:0;`;
    holder.innerHTML = `${body}${firmaVisadoHtml(r)}`;
    document.body.appendChild(holder);

    const canvas = await html2canvas(holder, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    holder.remove(); holder = null;

    // 2) Documento final: se corta el canvas en páginas A4
    const outDoc = await PDFDocument.create();
    const helv = await outDoc.embedFont(StandardFonts.Helvetica);
    const cw = canvas.width;
    const pageSlicePx = Math.max(1, Math.floor(contentH * cw / contentW));
    let sy = 0;
    while(sy < canvas.height){
      const sh = Math.min(pageSlicePx, canvas.height - sy);
      const png = canvasRegionToPngBytes(canvas, sy, sh);
      const img = await outDoc.embedPng(png);
      const hPt = sh * (contentW / cw);
      const pg = outDoc.addPage(A4);
      pg.drawImage(img, { x: M, y: A4[1] - M - hPt, width: contentW, height: hPt });
      sy += sh;
    }

    // 3) Fusionar anexos
    const adj = (r.adjuntos || []).filter(a => a.path);
    if(adj.length){
      showToast('Incrustando anexos...');
      for(let i=0; i<adj.length; i++){
        const a = adj[i];
        let file = null;
        try{ file = await attachmentToBytes(a.path, a.nombre); }catch(e){ file = null; }
        if(!file){
          drawAnexoHeader(outDoc.addPage(A4), helv, i+1, a.nombre, 'No se pudo recuperar el archivo desde el sistema.');
          continue;
        }
        const esPdf = file.ext === 'pdf' || (file.mime||'').indexOf('pdf') !== -1;
        const esPng = file.ext === 'png' || (file.mime||'').indexOf('png') !== -1;
        const esJpg = ['jpg','jpeg'].includes(file.ext) || (file.mime||'').indexOf('jpeg') !== -1;
        try{
          if(esPdf){
            const src = await PDFDocument.load(file.bytes, { ignoreEncryption: true });
            const pages = await outDoc.copyPages(src, src.getPageIndices());
            pages.forEach(p => outDoc.addPage(p));
          } else if(esPng || esJpg){
            const img = esPng ? await outDoc.embedPng(file.bytes) : await outDoc.embedJpg(file.bytes);
            const pg = outDoc.addPage(A4);
            drawAnexoHeader(pg, helv, i+1, a.nombre, '');
            const top = 780, maxW = A4[0] - M*2, maxH = top - M;
            const s = Math.min(maxW / img.width, maxH / img.height, 1);
            const w = img.width * s, h = img.height * s;
            pg.drawImage(img, { x:(A4[0]-w)/2, y:(top - h), width:w, height:h });
          } else {
            drawAnexoHeader(outDoc.addPage(A4), helv, i+1, a.nombre, 'Formato no soportado como anexo (solo PDF, JPG o PNG).');
          }
        }catch(e){
          drawAnexoHeader(outDoc.addPage(A4), helv, i+1, a.nombre, 'No se pudo incrustar el anexo (' + ((e&&e.message)||'error') + ').');
        }
      }
    }

    // 4) Descargar
    const outBytes = await outDoc.save();
    const blob = new Blob([outBytes], { type:'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${r.id}_${r.tipo}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('PDF generado' + (adj.length ? ' con anexos' : ''));
  }catch(e){
    console.error('Error generando PDF:', e);
    showToast('Error al generar el PDF: ' + ((e && e.message) || e));
    if(holder) holder.remove();
  }
}

/* ============ INIT ============ */
Object.assign(window, { addAccion, addAttachmentFile, addAttachmentManual, addCatalogItem, addDotacionMes, addInvestigador, addLeccion, addVessel, addVisador, clearFilters, closeModal, deleteRecord, exportData, printRecordPDF, openAttachment, openCatalogManager, openRecordForm, openVisadoresManager, printChartsReport, printCompanyReport, removeAccion, removeAttachment, removeCatalogItem, removeDotacionMes, removeInvestigador, removeLeccion, removeVessel, removeVisador, renderAuditNcKpi, renderOcimfKpi, renderScoreCard, setScoreCardYear, setScoreCardTarget, renderTable, saveRecord, setCompanyLogo, setSiteFilter, setTypeFilter, toggleCategoriaOtro, toggleTipificacionCausaOtro, toggleVisado, updateAccionField, updateInvestigadorField, updateVesselOptions, validateEstadoCierre, refreshData, logoutHsqe });

async function logoutHsqe(){
  await supabase.auth.signOut();
  window.location.reload();
}

export function initApp(session){
  CURRENT_USER = (session && session.user) ? session.user.email : null;
  const emailEl = document.getElementById('sessionEmail');
  if(emailEl && session && session.user) emailEl.textContent = session.user.email;
  document.querySelector('.app').style.display = 'flex';
  fixSidebarLayout();
  loadData();
}
