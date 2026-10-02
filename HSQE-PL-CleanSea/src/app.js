import Chart from 'chart.js/auto';
import { supabase } from './lib/supabase.js';
import html2canvas from 'html2canvas';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';


/* ============ CONFIG ============ */
const TYPES = {
  NC:  {label:'No Conformidad',      color:'#E67E22'},
  OBS: {label:'Observación',         color:'#2C7FB8'},
  OM:  {label:'Oportunidad de Mejora', color:'#4C8C4A'},
  LA:  {label:'Lección Aprendida',   color:'#2C8C6B'},
  ACC: {label:'Accidente Personal',  color:'#C0392B'},
  INC: {label:'Incidente',           color:'#0A3A66'},
  CUA: {label:'Cuasi Accidente',     color:'#B07D0A'},
  AI:  {label:'Acto Inseguro',       color:'#B07D0A'},
  CI:  {label:'Condición Insegura',  color:'#B07D0A'},
  SUG: {label:'Sugerencia de Mejora', color:'#0E7C86'},
  RP:  {label:'Reporte Positivo',    color:'#3FA34D'},
  CAP: {label:'Capacitación',        color:'#7A4FA0'},
  AUD: {label:'Auditoría',           color:'#3E6B8C'},
  INSP:{label:'Inspección',          color:'#2F8F83'},
  TISO:{label:'Tareas ISO/ISM',      color:'#146C5E'},
  PROG:{label:'Programado',          color:'#4A5FBF'},
};
// Frase para personalizar etiquetas por tipo: "Fecha del incidente", "Título de la sugerencia de mejora", etc.
const TIPO_DESCRIPTOR = {
  NC:  'de la no conformidad',
  OBS: 'de la observación',
  OM:  'de la oportunidad de mejora',
  LA:  'de la lección aprendida',
  ACC: 'del accidente personal',
  INC: 'del incidente',
  CUA: 'del cuasi accidente',
  AI:  'del acto inseguro',
  CI:  'de la condición insegura',
  SUG: 'de la sugerencia de mejora',
  RP:  'del reporte positivo',
  CAP: 'de la capacitación',
  AUD: 'de la auditoría',
  INSP: 'de la inspección',
  TISO: 'de la tarea ISO/ISM',
  PROG: 'de la tarea programada',
};
function tipoDescriptor(tipo){ return TIPO_DESCRIPTOR[tipo] || 'del evento'; }

/* ============ TRADUCCIÓN BILINGÜE (para printables enviados a clientes) ============ */
const EN = {
  // Tipos
  'No Conformidad':'Non-Conformity','Observación':'Observation','Oportunidad de Mejora':'Improvement Opportunity',
  'Lección Aprendida':'Lesson Learned','Accidente Personal':'Personal Accident','Incidente':'Incident',
  'Cuasi Accidente':'Near Miss','Acto Inseguro':'Unsafe Act','Condición Insegura':'Unsafe Condition',
  'Sugerencia de Mejora':'Improvement Suggestion',
  'Reporte Positivo':'Positive Report',
  'Capacitación':'Training',
  'Tareas ISO/ISM':'ISO/ISM Tasks','Recurrencia':'Recurrence','Título de la tarea':'Task title',
  'Programado':'Scheduled','Registro madre':'Source record',
  'Auditoría':'Audit','Datos de la auditoría':'Audit data','Tipo de auditoría':'Audit type',
  'Auditor':'Auditor','Hallazgos':'Findings','Tipo':'Type','Fecha de la auditoría':'Audit date',
  'Interna / Externa':'Internal / External','Norma / Tipo':'Standard / Type','Responsable':'Responsible','Estado':'Status',
  'Descripción de la auditoría':'Audit Description',
  'Datos de la capacitación':'Training data','Evaluación de la capacitación':'Training evaluation',
  'Participantes':'Participants','Instructor':'Instructor','Duración':'Duration',
  'Parte del plan anual':'Part of annual plan','Fecha de la capacitación':'Training date',
  'Tipo de capacitación':'Training type','Firma':'Signature',
  'Nombre y apellido':'Full name','Cargo':'Position',
  'Descripción de la capacitación':'Training Description','Tema de la capacitación':'Training topic',
  // Encabezados de sección (PDF de registro)
  'Investigadores':'Investigators',
  'Datos del incidente (condiciones al momento del evento)':'Incident data (conditions at the time of the event)',
  'Notificación':'Notification','Clasificación OCIMF/TMSA':'OCIMF/TMSA Classification',
  'Observación del seguimiento':'Follow-up remarks',
  'Detalle del Cuasi Accidente':'Near Miss Details','Datos de la Lesión':'Injury Data',
  'Consideraciones del Evento':'Event Considerations','Clasificación':'Classification',
  'Análisis y Acción':'Analysis and Action','Comunicación':'Communication',
  'Lecciones Aprendidas':'Lessons Learned','Anexos al reporte':'Report Annexes',
  // Descripción por tipo
  'Descripción del evento':'Event Description','Descripción del incidente':'Incident Description',
  'Descripción del accidente personal':'Personal Accident Description','Descripción del cuasi accidente':'Near Miss Description',
  'Descripción de la no conformidad':'Non-Conformity Description','Descripción de la observación':'Observation Description',
  'Descripción de la oportunidad de mejora':'Improvement Opportunity Description','Descripción de la lección aprendida':'Lesson Learned Description',
  'Descripción del acto inseguro':'Unsafe Act Description','Descripción de la condición insegura':'Unsafe Condition Description',
  'Descripción de la sugerencia de mejora':'Improvement Suggestion Description',
  'Descripción del reporte positivo':'Positive Report Description',
  // Portada / gráficos
  'Registros por tipo':'Records by type','Por estado':'By status','Por instalación':'By site',
  'Por severidad':'By severity','Por causa raíz':'By root cause','¿Se llevará a cabo?':'Will it be carried out?',
  'Registros incluidos':'Included records','GRÁFICOS':'CHARTS',
  // KPIs
  'Registros totales':'Total records','Abiertas / en curso':'Open / in progress',
  'Acciones vencidas':'Overdue actions','Acciones por vencer (30 días)':'Actions due (30 days)',
  // Firma
  'Visado por Responsable HSQE / DPA':'Approved by HSQE/DPA Manager',
  // Rótulos de la tabla superior (datos)
  'Cliente / Operación':'Client / Operation','Instalación / Área':'Site / Area','Severidad':'Severity',
  'Estado actual':'Current status','Responsable':'Responsible','Reportado por':'Reported by',
  'Fecha de vencimiento':'Due date','Fecha de cierre':'Closing date','Referencia normativa':'Regulatory reference',
  'Área responsable':'Responsible area',
  '¿Informado a las gerencias?':'Reported to management?','Fecha de información a gerencias':'Management notification date',
  // Fecha por tipo
  'Fecha del evento':'Event date','Fecha del incidente':'Incident date','Fecha del accidente personal':'Personal accident date',
  'Fecha del cuasi accidente':'Near miss date','Fecha de la no conformidad':'Non-conformity date','Fecha de la observación':'Observation date',
  'Fecha de la oportunidad de mejora':'Improvement opportunity date','Fecha de la lección aprendida':'Lesson learned date',
  'Fecha del acto inseguro':'Unsafe act date','Fecha de la condición insegura':'Unsafe condition date','Fecha de la sugerencia de mejora':'Improvement suggestion date',
  'Fecha del reporte positivo':'Positive Report date',
  // Condiciones del incidente
  'Fuerza del viento':'Wind force','Estado del mar':'Sea state','Fuente de luz':'Light source',
  'Temperatura exterior (°C)':'Outside temperature (°C)','Temperatura ambiente (°C)':'Ambient temperature (°C)',
  'Rumbo (verdadero, °)':'Heading (true, °)','Velocidad (nudos)':'Speed (knots)',
  // Acciones
  'Acciones Correctivas':'Corrective Actions','Acciones Preventivas':'Preventive Actions',
};
// Devuelve "Español <i>English</i>" si hay traducción; si no, solo el español.
function bilingual(es){
  const k = (es||'').trim();
  const en = EN[k];
  return en ? `${es} <span style="font-style:italic;color:#9AA6B2;font-weight:normal;font-size:0.82em;">${en}</span>` : (es||'');
}
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
  cleansea: "/brand/CleanSea_Color.png", // versión color — para fondos claros (sidebar blanco y PDF)
};
// Versión BLANCA del logo, para fondos oscuros (barra lateral azul)
const DEFAULT_LOGOS_WHITE = {
  cleansea: "/brand/CleanSea_Blanco.webp",
};
function guessDefaultLogo(companyName){
  const n = (companyName||'').toLowerCase();
  if(n.includes('clean')) return DEFAULT_LOGOS.cleansea;
  return null;
}
function guessWhiteLogo(companyName){
  const n = (companyName||'').toLowerCase();
  if(n.includes('clean')) return DEFAULT_LOGOS_WHITE.cleansea;
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
const TIPOS_SIN_CAUSA_ACCION = ['LA','SUG','RP','CAP','AUD','INSP','TISO','PROG'];
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

// Cargos disponibles en el campo "Reportado por" (editable desde Gestionar catálogos)
let CARGOS = ['','Capitán','Primer Oficial de Cubierta','Segundo Oficial de Cubierta','Tercer Oficial de Cubierta',
  'Jefe de Máquinas','Primer Oficial de Máquinas','Oficial de Máquinas','Contramaestre','Marinero','Engrasador',
  'Electricista','Cocinero','Camarero','Oficial de Seguridad / HSQE','Superintendente','DPA','Personal de tierra','Otros'];

// Cargos ahora son {cargo, email}. Tolera entradas viejas (strings).
function normCargo(c){
  if(typeof c === 'string') return { cargo: c.trim(), email: '' };
  return { cargo: ((c&&c.cargo)||'').trim(), email: ((c&&c.email)||'').trim() };
}
function cargosList(){
  const raw = (DATA.catalogos && Array.isArray(DATA.catalogos.cargos)) ? DATA.catalogos.cargos : CARGOS;
  return raw.map(normCargo).filter(c => c.cargo);
}
function cargoEmail(cargo){
  const n = (cargo||'').trim().toLowerCase();
  if(!n) return '';
  const f = cargosList().find(c => c.cargo.toLowerCase() === n);
  return f ? f.email : '';
}
// Opciones del desplegable de cargos (para Cargo del reportado/investigador y para Responsable)
function cargoOptionsHtml(selected){
  const sel = (selected||'').trim();
  const names = cargosList().map(c => c.cargo);
  if(sel && !names.some(n => n.toLowerCase() === sel.toLowerCase())) names.push(sel);
  names.sort((a,b) => a.localeCompare(b,'es'));
  let html = `<option value="">— Seleccionar —</option>`;
  html += names.map(c => `<option value="${c.replace(/"/g,'&quot;')}" ${sel.toLowerCase()===c.toLowerCase()?'selected':''}>${c}</option>`).join('');
  return html;
}

// Cliente / Operación (catálogo editable)
let CLIENTES = ['','No Asignado a Cliente','Operación propia','N/A'];
function clientesDisponibles(){
  return (DATA.catalogos && Array.isArray(DATA.catalogos.clientes)) ? DATA.catalogos.clientes.slice() : CLIENTES.slice();
}
function clienteOptionsHtml(selected){
  const list = clientesDisponibles();
  const sel = selected || '';
  if(sel && !list.includes(sel)) list.push(sel);
  return list.map(c=>`<option value="${(c||'').replace(/"/g,'&quot;')}" ${sel===c?'selected':''}>${c||'— Seleccionar —'}</option>`).join('');
}

// Tipo de capacitación (catálogo editable): HSQE, Operaciones, Salud, etc.
let TIPOS_CAPACITACION = ['','HSQE','Operaciones','Salud','Seguridad','Medio Ambiente'];
function tiposCapDisponibles(){
  return (DATA.catalogos && Array.isArray(DATA.catalogos.tiposCapacitacion)) ? DATA.catalogos.tiposCapacitacion.slice() : TIPOS_CAPACITACION.slice();
}
function tiposCapOptionsHtml(selected){
  const list = tiposCapDisponibles();
  const sel = selected || '';
  if(sel && !list.includes(sel)) list.push(sel);
  return list.map(c=>`<option value="${(c||'').replace(/"/g,'&quot;')}" ${sel===c?'selected':''}>${c||'— Seleccionar —'}</option>`).join('');
}

// Título de tarea ISO/ISM (catálogo editable): Revisión del Sistema, FODA, Plan Anual de Capacitación, etc.
let TAREAS_ISO = ['','Revisión del Sistema por la Compañía','Evaluación de Contexto','FODA','Plan Anual de Capacitación','Plan Anual de Zafarranchos'];
function tareasIsoDisponibles(){
  return (DATA.catalogos && Array.isArray(DATA.catalogos.tareasIso)) ? DATA.catalogos.tareasIso.slice() : TAREAS_ISO.slice();
}
function tareasIsoOptionsHtml(selected){
  const list = tareasIsoDisponibles();
  const sel = selected || '';
  if(sel && !list.includes(sel)) list.push(sel);
  return list.map(c=>`<option value="${(c||'').replace(/"/g,'&quot;')}" ${sel===c?'selected':''}>${c||'— Seleccionar —'}</option>`).join('');
}
// Recurrencia (Tareas ISO/ISM y Auditoría): define cada cuánto se espera repetir el registro.
const RECURRENCIA_OPCIONES = { '':'No se repite', anual:'Anual', semestral:'Cada 6 meses', '30m':'Cada 2 años y medio' };
const RECURRENCIA_MESES = { anual:12, semestral:6, '30m':30 };
function recurrenciaLabel(v){ return RECURRENCIA_OPCIONES[v||''] || RECURRENCIA_OPCIONES['']; }
function recurrenciaOptionsHtml(selected){
  const sel = selected || '';
  return Object.keys(RECURRENCIA_OPCIONES).map(k=>`<option value="${k}" ${sel===k?'selected':''}>${RECURRENCIA_OPCIONES[k]}</option>`).join('');
}
// Próximo vencimiento = fecha del registro + intervalo de recurrencia.
function addMeses(fechaISO, meses){
  const d = new Date(fechaISO+'T00:00:00');
  d.setMonth(d.getMonth()+meses);
  return d.toISOString().slice(0,10);
}
function computeVencimientoRecurrente(fechaISO, recurrencia){
  if(!fechaISO || !RECURRENCIA_MESES[recurrencia]) return '';
  return addMeses(fechaISO, RECURRENCIA_MESES[recurrencia]);
}
// Recurrencia configurada en el registro "madre" (Tarea ISO/ISM o Auditoría) — define si y cada
// cuánto se genera un registro "Programado" (ver manageProgramados).
function recurrenciaDeRegistro(r){
  if(r.tipo==='TISO') return r.tiso_recurrencia||'';
  if(r.tipo==='AUD') return r.aud_recurrencia||'';
  return '';
}


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
let accCharts = { venc:null, resp:null };
let modalHallazgos = [];
let modalObservaciones = [];
let modalInvestigadores = [];
let modalCapParticipantes = [];
let modalAccionesCorrectivas = [];
let modalAccionesPreventivas = [];
let presetCategoriaEvento = null;

let DATA = { companies: [], records: [], visadores: [] };
let currentTypeFilter = 'ALL';
let currentSiteFilter = 'ALL';
let currentClienteFilter = 'ALL';
let currentSearch = '';

/* ============ USUARIO ACTUAL Y VISADO (Responsable HSQE/DPA) ============ */
let CURRENT_USER = null; // email de la sesión activa (se setea en initApp)

// Visador por defecto (se puede administrar desde "Gestionar usuarios / visadores").
const VISADOR_DEFAULT = { email: 'emartinez@paranalogistica.com.ar', nombre: 'Emmanuel Martinez', cargo: 'Gte. HSQE/DPA' };
const VISADORES_DEFAULT = [
  { email: 'emartinez@paranalogistica.com.ar', nombre: 'Emmanuel Martinez', cargo: 'Gte. HSQE/DPA' },
];

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
    if(DATA.visadores.length === 0){ DATA.visadores = VISADORES_DEFAULT.map(v=>({...v})); await saveConfig(); }
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
  c.personas = c.personas.map(p => (typeof p === 'string' ? { nombre: p.split('/')[0].trim(), email: '' } : { nombre: ((p&&p.nombre)||'').trim(), email: ((p&&p.email)||'').trim() })).filter(p => p.nombre);
  c.personas.sort((a,b) => a.nombre.localeCompare(b.nombre, 'es'));
  if(!Array.isArray(c.clasifOrigen)) c.clasifOrigen = CLASIF_ORIGEN.slice();
  if(!Array.isArray(c.categoriasActoInseguro)) c.categoriasActoInseguro = CATEGORIAS_ACTO_INSEGURO.slice();
  if(!Array.isArray(c.categoriasCondicionInsegura)) c.categoriasCondicionInsegura = CATEGORIAS_CONDICION_INSEGURA.slice();
  if(!Array.isArray(c.tipificacionIncidente)) c.tipificacionIncidente = TIPIFICACION_INCIDENTE.slice();
  if(!Array.isArray(c.tipificacionCausaRaiz)) c.tipificacionCausaRaiz = TIPIFICACION_CAUSA_RAIZ.slice();
  if(!Array.isArray(c.cargos)) c.cargos = CARGOS.slice();
  c.cargos = c.cargos.map(x => (typeof x === 'string' ? { cargo: x.trim(), email: '' } : { cargo: ((x&&x.cargo)||'').trim(), email: ((x&&x.email)||'').trim() })).filter(x => x.cargo);
  c.cargos.sort((a,b) => a.cargo.localeCompare(b.cargo, 'es'));
  if(!Array.isArray(c.clientes)) c.clientes = CLIENTES.slice();
  if(!Array.isArray(c.tiposCapacitacion)) c.tiposCapacitacion = TIPOS_CAPACITACION.slice();
  if(!Array.isArray(c.tareasIso)) c.tareasIso = TAREAS_ISO.slice();
  if(!c.clientes.includes('No Asignado a Cliente')) c.clientes.push('No Asignado a Cliente');
  if(!c.dotacionMensual || typeof c.dotacionMensual !== 'object' || Array.isArray(c.dotacionMensual)) c.dotacionMensual = {};
  ordenarAlfa(c.clasifOrigen);
  ordenarAlfa(c.categoriasActoInseguro);
  ordenarAlfa(c.categoriasCondicionInsegura);
  ordenarAlfa(c.tipificacionIncidente);
  ordenarAlfa(c.tipificacionCausaRaiz);
  ordenarAlfa(c.clientes);
  ordenarAlfa(c.tiposCapacitacion);
  ordenarAlfa(c.tareasIso);
  if(DATA.companies[0]) ordenarAlfa(DATA.companies[0].vessels);
  CLASIF_ORIGEN = c.clasifOrigen;
  CATEGORIAS_ACTO_INSEGURO = c.categoriasActoInseguro;
  CATEGORIAS_CONDICION_INSEGURA = c.categoriasCondicionInsegura;
  TIPIFICACION_INCIDENTE = c.tipificacionIncidente;
  TIPIFICACION_CAUSA_RAIZ = c.tipificacionCausaRaiz;
  CARGOS = c.cargos;
  CLIENTES = c.clientes;
  TIPOS_CAPACITACION = c.tiposCapacitacion;
  TAREAS_ISO = c.tareasIso;
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
// Código MOSTRADO: se numera por orden de fecha dentro del mismo tipo y año (001 = el más antiguo).
// El id interno del registro no cambia; esto solo afecta lo que se ve en tabla y PDF.
function codigoMostrado(r){
  if(!r) return '';
  if(!r.fecha) return r.id;
  const year = new Date(r.fecha+'T00:00:00').getFullYear();
  const mismos = DATA.records
    .filter(x => x.tipo === r.tipo && x.fecha && new Date(x.fecha+'T00:00:00').getFullYear() === year)
    .sort((a,b) => (a.fecha||'').localeCompare(b.fecha||'') || (a.id||'').localeCompare(b.id||''));
  const pos = mismos.findIndex(x => x.id === r.id);
  const num = String((pos < 0 ? mismos.length : pos) + 1).padStart(3,'0');
  return `${r.tipo}-${num}-${year}`;
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
// Programados (próxima repetición de una Tarea ISO/ISM o Auditoría) que siguen abiertos —
// alimenta el contador del ítem "Programados" del menú (mismo total que ve el panel).
function programadosAbiertos(){ return DATA.records.filter(r => r.tipo === 'PROG' && !esCerrado(r.estado)); }
function countProgramadosAlerta(){ return programadosAbiertos().length; }
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
function renderClienteSelect(){
  const sel = document.getElementById('clienteFilter');
  if(!sel) return;
  // Clientes: los del catálogo + los que ya aparecen en registros (por si alguno quedó fuera del catálogo)
  const cat = clientesDisponibles().filter(c=>c);
  const enUso = [...new Set(DATA.records.map(r=>r.cliente_operacion).filter(Boolean))];
  const todos = [...new Set([...cat, ...enUso])].sort((a,b)=>a.localeCompare(b,'es'));
  sel.innerHTML = `<option value="ALL">Todos los clientes / operaciones</option>` +
    todos.map(v=>`<option value="${v.replace(/"/g,'&quot;')}">${v}</option>`).join('');
  sel.value = currentClienteFilter;
}
function setClienteFilter(v){ currentClienteFilter = v; renderAll(); }
function setSiteFilter(v){ currentSiteFilter = v; renderAll(); }

// Orden y agrupación del menú lateral de categorías
const NAV_GROUP_HALLAZGOS = ['NC','OBS','OM'];
const NAV_GROUP_EVENTOS = ['INC','ACC','CUA','LA'];
const NAV_ORDER_PROACTIVOS = ['AI','CI','SUG','RP'];
const NAV_GROUP_CAPACITACION = ['CAP'];
const NAV_GROUP_AUDITORIAS = ['AUD','INSP'];
const NAV_GROUP_TAREAS_ISO = ['TISO'];
// Tareas ISO/ISM queda fuera de "Registros por tipo" a propósito: es una sección aparte,
// no se mezcla con el gráfico ni los totales de la vista general ("Todos los registros").
const NAV_ORDER_ALL_TYPES = [...NAV_GROUP_AUDITORIAS, ...NAV_GROUP_HALLAZGOS, ...NAV_GROUP_EVENTOS, ...NAV_ORDER_PROACTIVOS, ...NAV_GROUP_CAPACITACION];
// Color del punto/bullet en el menú (independiente del color del tipo en tablas/gráficos)
const NAV_DOT_COLORS = {
  ALL:'#1C3666',
  AUD:'#3E6B8C', INSP:'#2F8F83',                       // auditorías / inspecciones
  NC:'#E67E22', OBS:'#E67E22', OM:'#E67E22',            // naranja
  INC:'#C0392B', ACC:'#C0392B', CUA:'#C0392B', LA:'#C0392B', // rojo
  AI:'#8FC1E8', CI:'#8FC1E8', SUG:'#8FC1E8', RP:'#8FC1E8', // celeste claro
  CAP:'#B39DDB',                                        // violeta claro
};
function navDotColor(k){ return NAV_DOT_COLORS[k] || (TYPES[k] && TYPES[k].color) || '#B7C4CE'; }

function renderTypeNav(){
  const wrap = document.getElementById('typeNav');
  const filtered = filteredRecords(true);
  const count = k => filtered.filter(r=>r.tipo===k).length;
  const group = arr => arr.filter(k=>TYPES[k]).map(k=>navItem(k, TYPES[k].label, navDotColor(k), count(k))).join('');
  const label = (t, mt) => `<div class="nav-label" style="margin-top:${mt||0}px;">${t}</div>`;
  let html = label('Categorías');
  // Tareas ISO/ISM no se mezcla en el total de "Todos los registros" (queda solo en su sección).
  html += navItem('ALL', 'Todos los registros', navDotColor('ALL'), filtered.filter(r=>r.tipo!=='TISO' && r.tipo!=='PROG').length);
  html += label('Auditorías / Inspecciones', 12) + group(NAV_GROUP_AUDITORIAS);
  html += label('Hallazgos', 12) + group(NAV_GROUP_HALLAZGOS);
  html += label('Reporte de Eventos', 12) + group(NAV_GROUP_EVENTOS);
  html += label('Reportes Proactivos', 12) + group(NAV_ORDER_PROACTIVOS);
  html += label('Capacitación', 12) + group(NAV_GROUP_CAPACITACION);
  // Tareas ISO/ISM y su panel de Programados son de uso exclusivo del Responsable HSQE/DPA (visador).
  if(usuarioActualPuedeVisar()){
    html += label('Tareas ISO/ISM', 12) + group(NAV_GROUP_TAREAS_ISO);
    html += `<div class="nav-item ${currentTypeFilter==='PROGRAMADOS'?'active':''}" onclick="setTypeFilter('PROGRAMADOS')">
      <span class="nav-dot" style="background:${STATUS['Abierto']}"></span>Programados
      <span class="nav-count">${countProgramadosAlerta()}</span>
    </div>`;
  }
  html += label('Objetivos', 12);
  html += `<div class="nav-item ${currentTypeFilter==='KPI'?'active':''}" onclick="setTypeFilter('KPI')">
    <span class="nav-dot" style="background:#2ECC71"></span>KPI HSQE
  </div>`;
  // Cuenta solo acciones abiertas / en proceso (mismo criterio que el panel de Plan de acciones);
  // antes contaba también las ya cerradas, inflando el número del menú.
  const accionPendiente = a => (a.descripcion||'').trim() && !esCerrado(a.estado);
  const totalAcciones = DATA.records.reduce((n,r)=> n + (r.acciones_correctivas||[]).filter(accionPendiente).length + (r.acciones_preventivas||[]).filter(accionPendiente).length, 0);
  html += `<div class="nav-item ${currentTypeFilter==='ACCIONES'?'active':''}" onclick="setTypeFilter('ACCIONES')">
    <span class="nav-dot" style="background:#5B6671"></span>Plan de acciones
    <span class="nav-count">${totalAcciones}</span>
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
function setTypeFilter(k){
  const cambioTipo = (k !== currentTypeFilter);
  currentTypeFilter = k;
  // El filtro por norma/tipo es específico de cada sección: se resetea al cambiar de sección.
  if(cambioTipo){ const el = document.getElementById('tipoAudFilter'); if(el) el.value = ''; }
  // "Todos los registros" limpia los filtros para traer todo
  if(k === 'ALL'){
    const setVal = (id, v='') => { const el = document.getElementById(id); if(el) el.value = v; };
    currentSearch = ''; setVal('topbarSearchInput'); setVal('statusFilter'); setVal('sevFilter'); setVal('overdueFilter'); setVal('dateFrom'); setVal('dateTo');
    currentClienteFilter = 'ALL';
  }
  renderAll();
}
function clearFilters(){
  const setVal = (id, v='') => { const el = document.getElementById(id); if(el) el.value = v; };
  currentSearch = ''; setVal('topbarSearchInput');
  setVal('statusFilter');
  setVal('sevFilter');
  setVal('overdueFilter');
  setVal('tipoAudFilter');
  setVal('dateFrom');
  setVal('dateTo');
  currentClienteFilter = 'ALL';   // el filtro de cliente es variable de estado; hay que resetearlo aquí
  renderAll();
}

/* ============ FILTERING ============ */
function filteredRecords(bySiteOnly){
  let r = DATA.records.filter(x => currentSiteFilter==='ALL' || x.instalacion===currentSiteFilter);
  if(currentClienteFilter!=='ALL') r = r.filter(x => (x.cliente_operacion||'') === currentClienteFilter);
  if(!bySiteOnly){
    if(currentTypeFilter==='ALL') r = r.filter(x=>x.tipo!=='TISO' && x.tipo!=='PROG'); // Tareas ISO/ISM y Programados solo se ven en su propia sección
    else r = r.filter(x=>x.tipo===currentTypeFilter);
  }
  return r;
}
// Filtro por rango de fechas (Desde/Hasta). Afecta KPIs, gráficos y tabla del panel.
function applyDateFilter(list){
  const from = document.getElementById('dateFrom')?.value || '';
  const to   = document.getElementById('dateTo')?.value || '';
  if(!from && !to) return list;
  return list.filter(r=>{
    const f = r.fecha || '';
    if(!f) return false;
    if(from && f < from) return false;
    if(to && f > to) return false;
    return true;
  });
}
function applyTableFilters(list){
  const q = currentSearch || '';
  const st = document.getElementById('statusFilter')?.value||'';
  const sv = document.getElementById('sevFilter')?.value||'';
  const ov = document.getElementById('overdueFilter')?.value||'';
  const tf = document.getElementById('tipoAudFilter')?.value||'';
  return list.filter(r=>{
    if(q && !(`${r.titulo} ${r.descripcion} ${r.area} ${accionesResumen(r).responsable} ${r.reportado_por}`.toLowerCase().includes(q))) return false;
    if(st && r.estado!==st) return false;
    if(sv && r.severidad!==sv) return false;
    if(ov==='overdue' && !isOverdue(r)) return false;
    if(tf){
      if(r.tipo==='AUD' && r.aud_norma!==tf) return false;
      if(r.tipo==='INSP' && r.insp_tipo!==tf) return false;
    }
    return true;
  });
}

/* ============ RENDER: KPI ============ */
function renderKPIs(){
  // Capacitación y Tareas ISO/ISM no muestran esta fila (Registros totales / Abiertas / Vencidas /
  // Por vencer): no aporta información relevante en esas secciones.
  const kpiRowEl = document.getElementById('kpiRow');
  if(currentTypeFilter === 'CAP' || currentTypeFilter === 'TISO'){
    if(kpiRowEl) kpiRowEl.style.display = 'none';
    return;
  }
  if(kpiRowEl) kpiRowEl.style.display = '';
  const list = applyDateFilter(filteredRecords(false));
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
const SCORECARD_DEFAULT_TARGETS = { trcf:20, ltif:20, nnc_cia_ext:4, nnc_cia_int:4, nnc_buq_ext:4, nnc_buq_int:4, cap_hsqe_buq:4, aci:20 };
// Tipificación de sitios: cuáles son buques (para KPIs por ámbito). Se define en el catálogo.
function ensureSitiosTipo(){
  const co = DATA.companies[0];
  if(!co) return;
  if(!co.sitiosTipo || typeof co.sitiosTipo !== 'object') co.sitiosTipo = {};
  (co.vessels||[]).forEach(v => {
    if(!(v in co.sitiosTipo)) co.sitiosTipo[v] = 'Oficina';
  });
}
function sitioTipo(nombre){ const co = DATA.companies[0]; return (co && co.sitiosTipo && co.sitiosTipo[nombre]) || 'Oficina'; }
function sitioEsBuque(nombre){ return sitioTipo(nombre) === 'Buque'; }
async function updateSitioTipo(nombre, tipo){
  const co = DATA.companies[0];
  if(!co) return;
  if(!co.sitiosTipo) co.sitiosTipo = {};
  co.sitiosTipo[nombre] = tipo;
  await saveData();
  renderCatalogManager();
  renderAll();
  showToast('Guardado');
}

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
  const ok = await saveConfig();   // persiste en Supabase (hsqe_cs_config) y confirma
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
  const capAll = filteredRecords(true).filter(r => r.tipo==='CAP');
  const aciAll = filteredRecords(true).filter(r => r.tipo==='AI' || r.tipo==='CI');
  ensureSitiosTipo();
  const capCount = (tipoCap, ini, fin) => (fin < ini) ? 0 : capAll.filter(r =>
    r.fecha>=ini && r.fecha<=fin && (r.cap_tipo||'') === tipoCap && sitioEsBuque(r.instalacion)
  ).length;

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
  const aciCount = (ini, fin) => (fin < ini) ? 0 : aciAll.filter(r => r.fecha>=ini && r.fecha<=fin).length;

  const rows = [
    { key:'trcf',        kpi:'Accidentes personales TRCF',         kind:'rate',  fn:(i,f)=>rate(['LTI','MTI','RWC'],i,f) },
    { key:'ltif',        kpi:'Accidentes personales LTIF',         kind:'rate',  fn:(i,f)=>rate(['LTI'],i,f) },
    { key:'nnc_cia_ext', kpi:'NNC Cia en Aud. Externas ISM - ISO', kind:'count', fn:(i,f)=>ncCount(['ISM','ISO'],'Externa','Oficina',i,f) },
    { key:'nnc_cia_int', kpi:'NNC Cia en Aud. Internas ISM - ISO', kind:'count', fn:(i,f)=>ncCount(['ISM','ISO'],'Interna','Oficina',i,f) },
    { key:'nnc_buq_ext', kpi:'NNC Buques en Aud. Externas ISM',    kind:'count', fn:(i,f)=>ncCount(['ISM'],'Externa','Buques',i,f) },
    { key:'nnc_buq_int', kpi:'NNC Buques en Aud. Internas ISM',    kind:'count', fn:(i,f)=>ncCount(['ISM'],'Interna','Buques',i,f) },
    { key:'cap_hsqe_buq', kpi:'Capacitaciones HSQE en buques',     kind:'count', dir:'max', fn:(i,f)=>capCount('HSQE',i,f) },
    { key:'aci',         kpi:'Actos y Condiciones Inseguras',      kind:'count', dir:'max', fn:(i,f)=>aciCount(i,f) },
  ];

  const fmt = v => v===null ? 's/d' : (Number.isInteger(v) ? String(v) : v.toFixed(2));
  const dmy = iso => { const [Y,M,D]=iso.split('-'); return `${D}/${M}/${Y}`; };

  const bodyHtml = rows.map(row=>{
    const target = (typeof T[row.key]==='number') ? T[row.key] : (SCORECARD_DEFAULT_TARGETS[row.key] || 0);
    // Conteos (NNC): valor propio de cada trimestre (no acumulado). El acumulado va en TOTAL.
    // Tasas (TRCF/LTIF): acumulado año-a-la-fecha hasta el cierre de cada trimestre.
    const qv = quarters.map(q => row.kind === 'count' ? row.fn(q.ini, q.fin) : row.fn(yIni, q.fin));
    // Conteos (NNC): el TOTAL es la suma de los 4 trimestres. Tasas: acumulado hasta hoy.
    const total = row.kind === 'count'
      ? qv.reduce((a,b)=> a + (b||0), 0)
      : row.fn(yIni, effFin(yFin));

    // Semáforo. dir 'min' (NNC/tasas): menos es mejor. dir 'max' (capacitaciones): más es mejor.
    // Verde=ok · Amarillo=atención · Rojo=no cumple.
    const semaforo = (val, tgt, dir) => {
      if(val === null) return { bg:'#E9EDF1', dot:'#8B96A1' };
      if(dir === 'max'){
        if(val >= tgt) return { bg:'#CDE9CE', dot:'#1E7A4A' };   // llega al target
        if(val > 0)    return { bg:'#FCE9A6', dot:'#B07D0A' };   // hay algunas pero faltan
        return { bg:'#F3C9C9', dot:'#C0392B' };                  // ninguna
      }
      if(val > tgt)  return { bg:'#F3C9C9', dot:'#C0392B' };      // supera el máximo admisible
      if(val > 0)    return { bg:'#FCE9A6', dot:'#B07D0A' };      // hay registros pero cumple
      return { bg:'#CDE9CE', dot:'#1E7A4A' };                     // sin registros
    };
    const { bg, dot } = semaforo(total, target, row.dir);

    // Resultado del ano anterior (ano completo) + semaforo contra el target de ESE ano.
    const py = y - 1;
    const prevTotal = row.fn(`${py}-01-01`, effFin(`${py}-12-31`));
    const prevT = DATA.scorecardTargets[String(py)] || SCORECARD_DEFAULT_TARGETS;
    const prevTarget = (typeof prevT[row.key]==='number') ? prevT[row.key] : (SCORECARD_DEFAULT_TARGETS[row.key] || 0);
    const { bg: pbg, dot: pdot } = semaforo(prevTotal, prevTarget, row.dir);

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
      <div style="display:flex;justify-content:space-between;align-items:center;background:#1C3666;color:#fff;padding:10px 14px;">
        <div style="font-family:'IBM Plex Sans',sans-serif;font-weight:700;letter-spacing:0.06em;font-size:16px;">SCORE CARD</div>
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;">
          <span style="opacity:.85;">Año</span>
          <select onchange="setScoreCardYear(this.value)" style="width:auto;background:#0A3A66;color:#fff;border:1px solid rgba(255,255,255,0.25);padding:4px 8px;">${yearOpts.join('')}</select>
        </div>
      </div>
      <table id="scoreCardTable" style="width:100%;border-collapse:collapse;font-size:12.5px;background:#fff;">
        <thead>
          <tr>
            <th style="background:#E9EDF1;color:var(--navy);text-align:left;padding:6px 10px;border:1px solid #DBE0E6;">KPI</th>
            <th style="background:#E9EDF1;color:var(--navy);text-align:center;padding:6px 8px;border:1px solid #DBE0E6;">Resultado ${y-1}</th>
            <th style="background:#FFF3B0;color:#5B4C00;text-align:center;padding:6px 8px;border:1px solid #DBE0E6;">Target ${y}</th>
            ${thQ}
            <th style="background:#1E7A4A;color:#fff;text-align:center;padding:6px 8px;border:1px solid #DBE0E6;">TOTAL</th>
          </tr>
        </thead>
        <tbody>${bodyHtml}</tbody>
      </table>
      <div style="padding:8px 14px;font-size:11px;color:#5B6671;background:#F7F9FB;border-top:1px solid #DBE0E6;">
        🟢 sin registros &nbsp;·&nbsp; 🟡 cumple el target pero hay registros (atención) &nbsp;·&nbsp; 🔴 no cumple (valor mayor al target) &nbsp;·&nbsp; el Target es editable por fila &nbsp;·&nbsp; s/d = sin exposición cargada
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
    data: sitios.map(v=>list.filter(r=>r.instalacion===v).length), colors:['#1C3666'] };

  const sevLabels = ['Baja','Media','Alta','Crítica'];
  const specSeveridad = { title:'Por severidad', kind:'doughnut', labels: sevLabels,
    data: sevLabels.map(s=>list.filter(r=>r.severidad===s).length), colors: sevLabels.map(s=>SEV_COLORS[s]) };

  // Distribución por tipificación de causa raíz — aplica a todos los tipos con bloque de Causa Raíz / Acciones.
  const causaCats = TIPIFICACION_CAUSA_RAIZ.filter(c=>c);
  const causaPairs = nonZeroPairs(causaCats, list, 'tipificacion_causa');
  const specCausaRaiz = { title:'Por causa raíz', kind:'bar', indexAxis:'y', labels: causaPairs.labels, data: causaPairs.data, colors:['#7A3B9E'] };

  if(tipo === 'ALL'){
    const tipoLabels = NAV_ORDER_ALL_TYPES.filter(k=>TYPES[k]);
    return { scope:'Todos los registros — diversidad de categorías', specs: [
      { title:'Registros por tipo', kind:'bar', labels: tipoLabels.map(k=>TYPES[k].label),
        data: tipoLabels.map(k=>list.filter(r=>r.tipo===k).length), colors: tipoLabels.map(k=>navDotColor(k)),
        valMax: 30, valStep: 5, clickKeys: tipoLabels },
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
      { title:'Por tipo de lesión', kind:'bar', indexAxis:'y', labels: tl.labels, data: tl.data, colors:['#1C3666'] },
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
        data: nat.map(n=>list.filter(r=>r.naturaleza_cuasi===n).length), colors:['#C0392B','#1C3666','#B07D0A'] },
      specEstado,
      specCausaRaiz,
    ]};
  }
  // Acto Inseguro / Condición Insegura — ya no llevan categorización/tipificación propia,
  // la causa raíz cubre esa necesidad de clasificación.
  if(tipo === 'AI' || tipo === 'CI'){
    return { scope: TYPES[tipo].label, specs: [ specSeveridad, specEstado, specCausaRaiz ] };
  }
  // Sugerencia de Mejora: no lleva severidad ni causa raíz.
  if(tipo === 'SUG'){
    return { scope: TYPES[tipo].label, specs: [
      { title:'¿Se llevará a cabo?', kind:'doughnut', labels:['Sí','No','Sin definir'],
        data:[ list.filter(r=>r.sug_realiza==='Sí').length, list.filter(r=>r.sug_realiza==='No').length, list.filter(r=>!r.sug_realiza).length ],
        colors:['#1E7A4A','#C0392B','#8B96A1'] },
      specEstado, specInstalacion,
    ]};
  }
  // Reporte Positivo: no lleva severidad ni causa raíz; se sigue por si fue informado a gerencias.
  if(tipo === 'RP'){
    return { scope: TYPES[tipo].label, specs: [
      { title:'¿Informado a las gerencias?', kind:'doughnut', labels:['Sí','No','Sin definir'],
        data:[ list.filter(r=>r.rp_informado==='Sí').length, list.filter(r=>r.rp_informado==='No').length, list.filter(r=>!r.rp_informado).length ],
        colors:['#1E7A4A','#C0392B','#8B96A1'] },
      specEstado, specInstalacion,
    ]};
  }
  if(tipo === 'INSP'){
    const contarObsHall = (t) => list.reduce((n,r)=> n + (Array.isArray(r.observaciones)? r.observaciones.filter(o=>o.genera==='Sí' && o.tipo===t && (o.descripcion||'').trim()).length : 0), 0);
    return { scope: TYPES[tipo].label, specs: [
      { title:'Hallazgos por tipo', kind:'doughnut', labels:['Observación','No Conformidad','Oportunidad de Mejora'],
        data:[ contarObsHall('OBS'), contarObsHall('NC'), contarObsHall('OM') ],
        colors:['#E67E22','#C0392B','#2C7FB8'] },
      specEstado, specInstalacion,
    ]};
  }
  if(tipo === 'AUD'){
    const contarHall = (t) => list.reduce((n,r)=> n + (Array.isArray(r.hallazgos)? r.hallazgos.filter(h=>h.tipo===t && (h.descripcion||'').trim()).length : 0), 0);
    return { scope: TYPES[tipo].label, specs: [
      { title:'Hallazgos por tipo', kind:'doughnut', labels:['Observación','No Conformidad','Oportunidad de Mejora'],
        data:[ contarHall('OBS'), contarHall('NC'), contarHall('OM') ],
        colors:['#E67E22','#C0392B','#2C7FB8'] },
      specEstado, specInstalacion,
    ]};
  }
  if(tipo === 'CAP'){
    const doughSiNo = (title, campo) => ({ title, kind:'doughnut', labels:['Sí','No','Sin definir'],
      data:[ list.filter(r=>r[campo]==='Sí').length, list.filter(r=>r[campo]==='No').length, list.filter(r=>!r[campo]).length ],
      colors:['#1E7A4A','#C0392B','#8B96A1'] });
    const tiposCap = [...new Set(list.map(r=>r.cap_tipo).filter(Boolean))];
    const capPalette = ['#7A4FA0','#2C7FB8','#4C8C4A','#C0392B','#B07D0A','#0E7C86','#5B4B8A','#8B96A1'];
    const specTipoCap = { title:'Por tipo de capacitación', kind:'doughnut',
      labels: tiposCap.length ? tiposCap : ['Sin tipo'],
      data: tiposCap.length ? tiposCap.map(t => list.filter(r=>r.cap_tipo===t).length) : [list.length],
      colors: tiposCap.length ? tiposCap.map((_,i)=>capPalette[i%capPalette.length]) : ['#8B96A1'] };
    return { scope: TYPES[tipo].label, specs: [
      specTipoCap,
      doughSiNo('Parte del plan anual', 'cap_plan_anual'),
      specInstalacion,
    ]};
  }
  if(tipo === 'TISO'){
    const titulos = [...new Set(list.map(r=>r.titulo).filter(Boolean))];
    const tisoPalette = ['#146C5E','#2C7FB8','#7A4FA0','#B07D0A','#C0392B','#4C8C4A','#5B4B8A','#8B96A1'];
    const specTitulo = { title:'Por tarea', kind:'doughnut',
      labels: titulos.length ? titulos : ['Sin título'],
      data: titulos.length ? titulos.map(t => list.filter(r=>r.titulo===t).length) : [list.length],
      colors: titulos.length ? titulos.map((_,i)=>tisoPalette[i%tisoPalette.length]) : ['#8B96A1'] };
    return { scope: TYPES[tipo].label, specs: [ specTitulo, specEstado, specInstalacion ] };
  }
  // Fallback: la severidad solo se muestra en los tipos que la usan.
  const finalSpecs = TIPOS_CON_SEVERIDAD.includes(tipo)
    ? [ specSeveridad, specEstado, specInstalacion ]
    : [ specEstado, specInstalacion ];
  return { scope: TYPES[tipo].label, specs: finalSpecs };
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
  const list = applyDateFilter(filteredRecords(false));
  Object.values(charts).forEach(c=>c && c.destroy());
  charts = {};

  const { scope, specs } = getChartSpecs(list, currentTypeFilter);
  document.getElementById('chartsSectionLabel').textContent = `Gráficos — ${scope}`;
  const chartsRow = document.getElementById('chartsMainRow');
  if(chartsRow) chartsRow.classList.toggle('charts-all', currentTypeFilter === 'ALL');

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
          [valAxis]:{ beginAtZero:true, ticks:{precision:0, ...(spec.valStep?{stepSize:spec.valStep}:{})}, ...(spec.valMax?{max:spec.valMax}:{}) },
          [catAxis]:{ ticks:{
            autoSkip:false,
            font:{size:10},
            callback:function(value){ return wrapChartLabel(this.getLabelForValue(value)); }
          } },
        },
      };
    }

    if(spec.clickKeys){
      opts.onClick = (evt, elements) => {
        if(elements && elements.length){
          const key = spec.clickKeys[elements[0].index];
          if(key && TYPES[key]) setTypeFilter(key);
        }
      };
      opts.onHover = (evt, elements) => {
        const c = evt && evt.native && evt.native.target;
        if(c) c.style.cursor = (elements && elements.length) ? 'pointer' : 'default';
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
  let list = applyDateFilter(filteredRecords(false));
  list = applyTableFilters(list);
  list.sort((a,b)=> (b.fecha||'').localeCompare(a.fecha||'') || (b.id||'').localeCompare(a.id||''));

  const title = currentTypeFilter==='ALL' ? 'Todos los registros' : TYPES[currentTypeFilter].label;
  document.getElementById('viewTitle').textContent = currentTypeFilter==='ALL' ? 'Clean Sea - HSQE Control Panel' : title;
  const siteName = currentSiteFilter==='ALL' ? 'Todos los sitios' : currentSiteFilter;
  document.getElementById('viewMeta').textContent = `${siteName} · ${list.length} registro(s)`;

  const mostrarSeveridad = currentTypeFilter === 'ALL' || TIPOS_CON_SEVERIDAD.includes(currentTypeFilter);
  const sevFilterEl = document.getElementById('sevFilter');
  if(sevFilterEl){
    sevFilterEl.style.display = mostrarSeveridad ? '' : 'none';
    if(!mostrarSeveridad) sevFilterEl.value = '';
  }
  // Capacitación no maneja estado: se oculta el filtro de estado en esa sección.
  const mostrarEstado = currentTypeFilter !== 'CAP';
  const mostrarResponsable = mostrarEstado && currentTypeFilter !== 'AUD' && currentTypeFilter !== 'INSP';
  const mostrarAlcance = currentTypeFilter === 'AUD';
  const statusFilterEl = document.getElementById('statusFilter');
  if(statusFilterEl){
    statusFilterEl.style.display = mostrarEstado ? '' : 'none';
    if(!mostrarEstado) statusFilterEl.value = '';
  }
  const overdueFilterEl = document.getElementById('overdueFilter');
  if(overdueFilterEl){
    overdueFilterEl.style.display = mostrarEstado ? '' : 'none';
    if(!mostrarEstado) overdueFilterEl.value = '';
  }
  // Filtro por tipo (solo en Auditorías / Inspecciones): agrupa por norma/tipo.
  const tipoAudEl = document.getElementById('tipoAudFilter');
  if(tipoAudEl){
    const esAudInsp = currentTypeFilter==='AUD' || currentTypeFilter==='INSP';
    if(esAudInsp){
      const campo = currentTypeFilter==='AUD' ? 'aud_norma' : 'insp_tipo';
      const etiqueta = currentTypeFilter==='AUD' ? 'Todas las normas' : 'Todos los tipos';
      const valores = [...new Set(DATA.records.filter(r=>r.tipo===currentTypeFilter).map(r=>r[campo]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
      const prev = tipoAudEl.value;
      tipoAudEl.innerHTML = `<option value="">${etiqueta}</option>` + valores.map(v=>`<option value="${v.replace(/"/g,'&quot;')}" ${prev===v?'selected':''}>${v}</option>`).join('');
      tipoAudEl.style.display = '';
    } else {
      tipoAudEl.style.display = 'none';
      tipoAudEl.value = '';
    }
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
      <td><span class="id-tag">${codigoMostrado(r)}</span></td>
      <td><span class="type-tag" style="background:${TYPES[r.tipo].color}20;color:${TYPES[r.tipo].color}">${TYPES[r.tipo].label}</span></td>
      <td>${r.instalacion||'—'}</td>
      <td class="mono" style="font-size:12px;white-space:nowrap;">${fmtDate(r.fecha)}</td>
      <td class="desc-cell" style="font-size:11.5px;">${((r.titulo||r.descripcion)||'').slice(0,80)}${((r.titulo||r.descripcion)||'').length>80?'…':''}</td>
      ${mostrarAlcance ? `<td>${r.aud_alcance==='Interna'?'INT':(r.aud_alcance==='Externa'?'EXT':'—')}</td>` : ''}
      ${mostrarEstado ? `<td>${r.tipo==='CAP' ? '<span style="color:var(--graphite-light)">—</span>' : `<div class="status-cell" style="white-space:nowrap;"><span class="status-dot" style="background:${STATUS[r.estado]}"></span>${r.estado}${r.visado ? ' <span title="Visado por Responsable HSQE/DPA" style="color:#1E7A4A;font-weight:bold;">✔</span>' : ''}</div>`}</td>
      <td class="mono ${isOverdue(r)?'overdue':''}" style="font-size:12px;white-space:nowrap;">${isOverdue(r)?'⚠ ':''}${resumen.vencimiento?fmtDate(resumen.vencimiento):'—'}</td>` : ''}
      ${mostrarResponsable ? `<td>${resumen.responsable}</td>` : ''}
      <td style="text-align:center">${nAdj>0 ? '📎 '+nAdj : '—'}</td>
      <td style="text-align:center;white-space:nowrap;">
        <button class="btn secondary" style="padding:4px 8px;font-size:11px;" title="Previsualizar / Imprimir PDF" onclick="event.stopPropagation();previewRecordPDF('${r.id}')">👁 Ver</button>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('tableWrap').innerHTML = `
    <table style="font-size:12.5px;">
      <thead><tr>
        <th>ID</th><th>Tipo</th><th>Instalación</th><th>Fecha</th>
        <th>Título</th>${mostrarAlcance ? '<th>INT / EXT</th>' : ''}${mostrarEstado ? '<th>Estado</th><th>Vencimiento</th>' : ''}${mostrarResponsable ? '<th>Responsable</th>' : ''}<th>Adj.</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// Barra superior (estilo portal): usuario, iniciales y búsqueda
function renderTopbar(){
  const email = CURRENT_USER || '';
  const userEl = document.getElementById('topbarUser');
  const avEl = document.getElementById('topbarAvatar');
  if(userEl) userEl.textContent = email;
  if(avEl){
    const base = (email.split('@')[0] || '').replace(/[._-]/g,' ').trim();
    const parts = base.split(' ').filter(Boolean);
    const ini = (parts.length >= 2 ? (parts[0][0] + parts[1][0]) : base.slice(0,2)).toUpperCase();
    avEl.textContent = ini || '—';
  }
}
function topbarSearch(v){
  currentSearch = (v||'').toLowerCase();
  renderTable();
}

function renderBrandLogo(){
  const el = document.getElementById('brandLogo');
  if(!el) return;
  const co = DATA.companies[0];
  if(!co){ el.innerHTML = ''; return; }
  // Barra lateral ahora es blanca (estilo portal): se usa el logo azul, sin caja.
  const logo = getCompanyLogo(co.id);
  el.innerHTML = logo ? `<img src="${logo}" onclick="setTypeFilter('ALL')" title="Ir a todos los registros" style="display:block;max-height:48px;max-width:190px;margin-bottom:10px;cursor:pointer;">` : '';
}
// Alterna entre el panel normal (KPIs, graficos, tabla) y la vista dedicada "KPI HSQE".
// El encabezado con el boton de impresion queda SIEMPRE visible; solo cambian sus textos.
function renderAccionesPanel(){
  let panel = document.getElementById('accionesPanel');
  if(!panel){
    panel = document.createElement('div');
    panel.id = 'accionesPanel';
    panel.style.marginBottom = '22px';
    document.querySelector('.main').appendChild(panel);
  }
  const site = currentSiteFilter;
  const filas = [];
  DATA.records.forEach(r=>{
    if(site !== 'ALL' && r.instalacion !== site) return;
    const push = (a, tipoAcc) => {
      if(!a || !(a.descripcion||'').trim()) return;
      if(esCerrado(a.estado)) return; // solo abiertas / en proceso
      filas.push({ id:r.id, cod:codigoMostrado(r), tipoAcc, desc:a.descripcion, resp:a.responsable||'—', venc:a.vencimiento||'', estado:a.estado||'—' });
    };
    (r.acciones_correctivas||[]).forEach(a=>push(a,'Correctiva'));
    (r.acciones_preventivas||[]).forEach(a=>push(a,'Preventiva'));
  });
  filas.sort((a,b)=>(a.venc||'9999-99-99').localeCompare(b.venc||'9999-99-99'));
  const hoy = todayISO();
  const limite = new Date(); limite.setDate(limite.getDate()+30); const limiteISO = limite.toISOString().slice(0,10);
  // Datos para gráficos
  let venc=0, porVencer=0, enPlazo=0;
  const porResp = {};
  filas.forEach(f=>{
    if(f.venc && f.venc < hoy) venc++;
    else if(f.venc && f.venc <= limiteISO) porVencer++;
    else enPlazo++;
    const k = (f.resp||'—').trim() || '—';
    porResp[k] = (porResp[k]||0) + 1;
  });
  const respLabels = Object.keys(porResp).sort((a,b)=>porResp[b]-porResp[a]);
  const dotColor = (e) => esCerrado(e) ? '#1E7A4A' : (normalizeEstado(e)==='En Proceso' ? '#B07D0A' : '#C0392B');
  const rows = filas.map(f=>{
    const vencida = f.venc && f.venc < hoy;
    return `<tr style="cursor:pointer;" onclick="openRecordForm('${f.id}')" title="Abrir registro para editar">
      <td><span class="id-tag">${f.cod}</span></td>
      <td>${f.tipoAcc}</td>
      <td class="desc-cell" style="font-size:11.5px;">${(f.desc||'').slice(0,120)}${(f.desc||'').length>120?'…':''}</td>
      <td>${f.resp}</td>
      <td class="mono ${vencida?'overdue':''}" style="font-size:12px;white-space:nowrap;">${vencida?'⚠ ':''}${f.venc?fmtDate(f.venc):'—'}</td>
      <td><div class="status-cell" style="white-space:nowrap;"><span class="status-dot" style="background:${dotColor(f.estado)}"></span>${f.estado}</div></td>
    </tr>`;
  }).join('');
  panel.innerHTML = `
    <div class="chart-row" style="grid-template-columns:1fr 1fr;">
      <div class="chart-card"><h3>Acciones por vencimiento</h3><div style="height:220px;"><canvas id="accChartVenc"></canvas></div></div>
      <div class="chart-card"><h3>Acciones por responsable</h3><div style="height:${Math.max(220, respLabels.length*30+40)}px;"><canvas id="accChartResp"></canvas></div></div>
    </div>
    <div style="font-size:12px;color:var(--graphite);margin-bottom:10px;">${filas.length} acción(es) abiertas / en proceso — solo consulta. Tocá una fila para abrir el registro y tratarla.</div>
    <div id="tableWrapAcciones"><table>
      <thead><tr><th>Registro</th><th>Tipo</th><th>Descripción</th><th>Responsable</th><th>Vencimiento</th><th>Estado</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:var(--graphite-light);padding:20px;">No hay acciones abiertas ni en proceso.</td></tr>'}</tbody>
    </table></div>`;

  // Gráficos (se destruyen los previos para evitar duplicados)
  if(accCharts.venc){ accCharts.venc.destroy(); accCharts.venc = null; }
  if(accCharts.resp){ accCharts.resp.destroy(); accCharts.resp = null; }
  const cVenc = document.getElementById('accChartVenc');
  if(cVenc){
    accCharts.venc = new Chart(cVenc, {
      type:'doughnut',
      data:{ labels:['Vencidas','Por vencer (30 días)','En plazo'], datasets:[{ data:[venc, porVencer, enPlazo], backgroundColor:['#C0392B','#B07D0A','#1E7A4A'], borderWidth:0 }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ font:{ size:11 } } } } }
    });
  }
  const cResp = document.getElementById('accChartResp');
  if(cResp){
    accCharts.resp = new Chart(cResp, {
      type:'bar',
      data:{ labels:respLabels, datasets:[{ data:respLabels.map(k=>porResp[k]), backgroundColor:'#1C3666', borderRadius:3 }] },
      options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:{ x:{ beginAtZero:true, ticks:{ precision:0 } } } }
    });
  }
}

// Panel de Programados: lista los registros "Programado" abiertos (la próxima repetición
// pendiente de cada Tarea ISO/ISM o Auditoría con recurrencia). Al cerrar un Programado se genera
// automáticamente el siguiente (ver manageProgramados) — por eso acá solo importan los abiertos.
function renderProgramadosPanel(){
  let panel = document.getElementById('programadosPanel');
  if(!panel){
    panel = document.createElement('div');
    panel.id = 'programadosPanel';
    panel.style.marginBottom = '22px';
    document.querySelector('.main').appendChild(panel);
  }
  const site = currentSiteFilter;
  let list = DATA.records.filter(r => r.tipo === 'PROG' && !esCerrado(r.estado) && (site==='ALL' || r.instalacion===site));
  list.sort((a,b) => (a.fecha_vencimiento||'9999-99-99').localeCompare(b.fecha_vencimiento||'9999-99-99'));
  let vencidos=0, porVencer=0;
  list.forEach(r=>{
    if(isOverdue(r)) vencidos++;
    else if(isDueSoon(r)) porVencer++;
  });
  const rows = list.map(r=>{
    const vencido = isOverdue(r);
    const porVenc = isDueSoon(r);
    const estadoTxt = vencido ? 'Vencido' : (porVenc ? 'Por vencer' : 'En plazo');
    const estadoColor = vencido ? '#C0392B' : (porVenc ? '#B07D0A' : '#1E7A4A');
    const origen = DATA.records.find(x=>x.id===r.origen_registro_id);
    const origenTxt = origen ? `${TYPES[origen.tipo] ? TYPES[origen.tipo].label : origen.tipo} ${codigoMostrado(origen)}` : (r.origen_registro_tipo||'—');
    return `<tr style="cursor:pointer;" onclick="openRecordForm('${r.id}')" title="Abrir registro para atenderlo">
      <td><span class="id-tag">${codigoMostrado(r)}</span></td>
      <td class="desc-cell" style="font-size:11.5px;">${r.titulo||'—'}</td>
      <td style="font-size:11px;color:var(--graphite-light);">${origenTxt}</td>
      <td>${r.instalacion||'—'}</td>
      <td>${recurrenciaLabel(r.prog_recurrencia)}</td>
      <td>${r.responsable||'—'}</td>
      <td class="mono ${vencido?'overdue':''}" style="font-size:12px;white-space:nowrap;">${vencido?'⚠ ':''}${r.fecha_vencimiento?fmtDate(r.fecha_vencimiento):'—'}</td>
      <td><div class="status-cell" style="white-space:nowrap;"><span class="status-dot" style="background:${estadoColor}"></span>${estadoTxt}</div></td>
    </tr>`;
  }).join('');
  panel.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
      <button class="btn" onclick="openRecordForm(null,'PROG')">+ Nueva tarea programada</button>
    </div>
    <div class="kpi-row" style="margin-bottom:18px;">
      <div class="kpi-card alert"><div class="val">${vencidos}</div><div class="lbl">Vencidos</div></div>
      <div class="kpi-card"><div class="val">${porVencer}</div><div class="lbl">Por vencer (30 días)</div></div>
      <div class="kpi-card"><div class="val">${list.length}</div><div class="lbl">Programados pendientes</div></div>
    </div>
    <div style="font-size:12px;color:var(--graphite);margin-bottom:10px;">Cada fila es la próxima repetición pendiente de una Tarea ISO/ISM o Auditoría, o una tarea puntual cargada manualmente. Abrila para atenderla; al marcarla "Cerrado" se genera automáticamente el siguiente Programado (si tiene recurrencia) y esta desaparece de esta lista.</div>
    <div id="tableWrapProgramados"><table>
      <thead><tr><th>ID</th><th>Título</th><th>Registro madre</th><th>Sitio</th><th>Recurrencia</th><th>Responsable</th><th>Vencimiento</th><th>Estado</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:var(--graphite-light);padding:20px;">No hay Programados pendientes.</td></tr>'}</tbody>
    </table></div>`;
}

function setKpiViewMode(kpiMode){
  const accMode = currentTypeFilter === 'ACCIONES';
  const progMode = currentTypeFilter === 'PROGRAMADOS';
  const especial = kpiMode || accMode || progMode;
  const toggles = [
    document.getElementById('kpiRow'),
    document.querySelector('.chart-row'),
    document.querySelector('.filters'),
    document.getElementById('tableWrap'),
    document.querySelector('.topbar button.btn'),
  ];
  toggles.forEach(el=>{ if(el) el.style.display = especial ? 'none' : ''; });
  const sc = document.getElementById('scoreCardPanel');
  if(sc) sc.style.display = kpiMode ? 'block' : 'none';
  // Los paneles KPI OCIMF y KPI Auditorías ISM/ISO son exclusivos de "KPI HSQE". Se ocultan acá
  // de forma centralizada para que no queden pegados (visibles) al saltar directo desde KPI HSQE
  // a Plan de acciones o Programados — antes solo se ocultaban al pasar por una sección normal.
  const ocp = document.getElementById('ocimfKpiPanel');
  if(ocp && !kpiMode) ocp.style.display = 'none';
  const ancp = document.getElementById('auditNcKpiPanel');
  if(ancp && !kpiMode) ancp.style.display = 'none';
  const ap = document.getElementById('accionesPanel');
  if(ap) ap.style.display = accMode ? 'block' : 'none';
  const iap = document.getElementById('programadosPanel');
  if(iap) iap.style.display = progMode ? 'block' : 'none';

  const label = document.getElementById('chartsSectionLabel');
  const header = label ? label.parentElement : null;
  const printBtn = header ? header.querySelector('button') : null;
  if(kpiMode){
    if(label) label.textContent = 'Indicadores KPI';
    if(printBtn) printBtn.textContent = '\uD83D\uDDA8 Imprimir KPI (PDF)';
  } else if(accMode){
    if(label) label.textContent = 'Plan de acciones';
    if(printBtn) printBtn.textContent = '\uD83D\uDDA8 Imprimir plan de acciones (PDF)';
  } else if(progMode){
    if(label) label.textContent = 'Programados';
    if(printBtn) printBtn.textContent = '\uD83D\uDDA8 Imprimir programados (PDF)';
  } else if(printBtn){
    printBtn.textContent = '\uD83D\uDDA8 Imprimir graficos (PDF)';
  }
}

function renderAll(){
  renderBrandLogo();
  renderTopbar();
  renderSiteSelect();
  renderClienteSelect();
  renderTypeNav();

  // Solo un Responsable HSQE/DPA habilitado (visador) ve la sección Configuración completa
  const puedeConfig = usuarioActualPuedeVisar();
  const navCfg = document.getElementById('navConfigSection');
  if(navCfg) navCfg.style.display = puedeConfig ? '' : 'none';
  const navCat = document.getElementById('navCatalogos');
  if(navCat) navCat.style.display = puedeConfig ? '' : 'none';

  const kpiMode = currentTypeFilter === 'KPI';
  const accMode = currentTypeFilter === 'ACCIONES';
  const progMode = currentTypeFilter === 'PROGRAMADOS';
  setKpiViewMode(kpiMode);

  if(accMode){
    document.getElementById('viewTitle').textContent = 'Plan de acciones';
    document.getElementById('viewMeta').textContent = 'Acciones correctivas y preventivas de todos los registros (solo consulta)';
    renderAccionesPanel();
  } else if(progMode){
    document.getElementById('viewTitle').textContent = 'Programados';
    document.getElementById('viewMeta').textContent = 'Próxima repetición pendiente de cada Tarea ISO/ISM o Auditoría recurrente';
    renderProgramadosPanel();
  } else if(kpiMode){
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
function openRecordForm(id, forceTipo){
  editingId = id || null;
  const r = id ? DATA.records.find(x=>x.id===id) : null;
  const co = r ? r.empresa_id : (DATA.companies[0]?.id || '');
  // forceTipo: abre el formulario "Nuevo registro" ya en un tipo puntual (ej. Programado manual
  // desde el panel de Programados), aunque ese tipo no sea el filtro de sección actual.
  const tipo = r ? r.tipo : (forceTipo && TYPES[forceTipo] ? forceTipo : (TYPES[currentTypeFilter] ? currentTypeFilter : 'OBS'));

  // Reportado por (nombre + cargo). Compatibilidad con registros viejos que guardaban "Nombre / Cargo".
  const repNombre = r ? (r.reportado_nombre != null ? r.reportado_nombre : ((r.reportado_por||'').split('/')[0]||'').trim()) : '';
  const repCargo  = r ? (r.reportado_cargo  != null ? r.reportado_cargo  : ((r.reportado_por||'').split('/').slice(1).join('/')||'').trim()) : '';
  const cargoOptions = cargoOptionsHtml(repCargo);
  // Investigador líder (Incidente): nombre + cargo, con compatibilidad "Nombre / Cargo" heredado
  const liderNombre = r ? (r.investigador_lider_nombre != null ? r.investigador_lider_nombre : ((r.investigador_lider||'').split('/')[0]||'').trim()) : '';
  const liderCargo  = r ? (r.investigador_lider_cargo  != null ? r.investigador_lider_cargo  : ((r.investigador_lider||'').split('/').slice(1).join('/')||'').trim()) : '';

  const overlay = document.createElement('div');
  overlay.className='modal-overlay';
  overlay.id='modalOverlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <h2>${r? 'Editar registro '+codigoMostrado(r) : 'Nuevo registro'}</h2>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="section-title">Clasificación</div>
        <div class="field-row">
          <div class="field"><label>Tipo de evento</label>
            <select id="f_tipo">${Object.keys(TYPES).filter(k=>(k!=='PROG' || tipo==='PROG') && (k!=='TISO' || usuarioActualPuedeVisar())).map(k=>`<option value="${k}" ${k===tipo?'selected':''}>${TYPES[k].label}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Cliente / Operación</label>
            <select id="f_cliente">${clienteOptionsHtml(r ? r.cliente_operacion : 'No Asignado a Cliente')}</select>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label>Buque / Instalación</label>
            <select id="f_instalacion"></select>
          </div>
          <div class="field"><label id="label_fecha">Fecha ${tipoDescriptor(tipo)}</label>
            <input type="date" id="f_fecha" value="${r?r.fecha:todayISO()}">
          </div>
        </div>

        <div id="block_reportado">
        <div class="section-title" style="border-top:none;padding-top:0;margin-top:14px;">Reportado por <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--graphite-light);">(informativo)</span></div>
        <div class="field">
          <label>Nombre y apellido</label>
          <input type="text" id="f_reportado_nombre" value="${repNombre.replace(/"/g,'&quot;')}" placeholder="Ej: Daniel Pugliesi">
        </div>
        </div>

        <div id="block_investigadores">
          <div class="section-title" style="margin-top:14px;">Investigadores</div>
          <div class="field-row">
            <div class="field"><label>Investigador líder — Nombre</label>
              <input type="text" id="f_investigador_lider_nombre" value="${liderNombre.replace(/"/g,'&quot;')}" placeholder="Ej: María Gómez">
            </div>
            <div class="field"><label>Cargo</label>
              <select id="f_investigador_lider_cargo">${cargoOptionsHtml(liderCargo)}</select>
            </div>
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
        <div class="field" id="block_titulo_libre"><label id="label_titulo">Título ${tipoDescriptor(tipo)}</label>
          <input type="text" id="f_titulo" value="${r?r.titulo||'':''}" placeholder="Título breve y descriptivo" maxlength="120">
        </div>
        <div id="block_tiso">
          <div class="field"><label>Título</label>
            <select id="f_tiso_titulo">${tareasIsoOptionsHtml(r?r.titulo||'':'')}</select>
          </div>
          <div class="field-row">
            <div class="field"><label>Recurrencia</label>
              <select id="f_tiso_recurrencia">${recurrenciaOptionsHtml(r?r.tiso_recurrencia||'':'')}</select>
            </div>
            <div class="field"><label>Responsable</label>
              <select id="f_tiso_responsable">${cargoOptionsHtml(r?r.responsable||'':'')}</select>
            </div>
          </div>
        </div>
        <div id="block_prog">
          ${(() => {
            // Manual = cargado directo desde el panel de Programados (no viene de cerrar una
            // Tarea ISO/ISM, Auditoría, u otro Programado con recurrencia).
            const esManual = !(r && r.origen_registro_id);
            if(esManual){
              return `<div style="font-size:11px;color:var(--graphite-light);margin:-8px 0 10px;">Tarea programada cargada manualmente. La fecha de arriba es su vencimiento: cuando falten 30 días o menos la vas a ver marcada "Por vencer" en este panel y en el contador del menú.</div>`;
            }
            const origen = DATA.records.find(x=>x.id===r.origen_registro_id);
            const origenTxt = origen ? `${TYPES[origen.tipo] ? TYPES[origen.tipo].label : origen.tipo} ${codigoMostrado(origen)}` : (r.origen_registro_tipo||'—');
            return `<div style="font-size:11px;color:var(--graphite-light);margin:-8px 0 10px;">Generado automáticamente desde <b>${origenTxt}</b> · Recurrencia: <b>${recurrenciaLabel(r.prog_recurrencia||'')}</b>. Al marcar este registro como "Cerrado" se genera automáticamente el siguiente Programado.<br>¿Necesitás atenderlo con el formulario completo (por ej. cargar los hallazgos de la auditoría)? Cambiá "Tipo de evento" arriba por el tipo que corresponda y completalo — se va a guardar como un registro nuevo y este Programado va a quedar cerrado como historial.</div>`;
          })()}
          ${!(r && r.origen_registro_id) ? `<div class="field-row">
            <div class="field"><label>Recurrencia (opcional)</label>
              <select id="f_prog_manual_recurrencia">${recurrenciaOptionsHtml(r?r.prog_recurrencia||'':'')}</select>
            </div>
          </div>` : ''}
          <div class="field"><label>Responsable</label>
            <select id="f_prog_responsable">${cargoOptionsHtml(r?r.responsable||'':'')}</select>
          </div>
        </div>
        <div class="field" id="block_area"><label>Área / Departamento</label>
          <input type="text" id="f_area" value="${r?r.area||'':''}" placeholder="Ej: Cubierta, Sala de Máquinas, Puente">
        </div>
        <div class="field" id="block_desc_simple"><label id="label_descripcion">Descripción ${tipoDescriptor(tipo)}</label>
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
            <div class="field">
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
            <input type="text" id="f_comunicar_a" value="${r?r.comunicar_a||'':''}" placeholder="Ej: Tripulación, Jefes de Departamento">
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
            <select id="f_responsable">${cargoOptionsHtml(r?r.responsable||'':'')}</select>
          </div>
          <div class="field"><label>Fecha de vencimiento</label>
            <input type="date" id="f_vencimiento" value="${r?r.fecha_vencimiento||'':''}">
          </div>
        </div>

        <div id="block_sug_seguimiento">
          <div class="section-title" style="margin-top:18px;padding-top:10px;border-top:1px dashed var(--line);">Seguimiento</div>
          <div class="field-row">
            <div class="field"><label>Área responsable</label>
              <input type="text" id="f_sug_area" value="${r?(r.sug_area||'').replace(/"/g,'&quot;'):''}" placeholder="Ej: Cubierta, HSQE, Operaciones">
            </div>
            <div class="field"><label>¿Se llevará a cabo?</label>
              <select id="f_sug_realiza">${['','Sí','No'].map(o=>`<option value="${o}" ${r&&r.sug_realiza===o?'selected':''}>${o||'Seleccionar...'}</option>`).join('')}</select>
            </div>
          </div>
          <div class="field-row-3">
            <div class="field"><label>Responsable</label>
              <select id="f_sug_resp">${cargoOptionsHtml(r?(r.responsable||''):'')}</select>
            </div>
            <div class="field"><label>Plazo (fecha límite)</label>
              <input type="date" id="f_sug_plazo_seg" value="${r?r.fecha_vencimiento||'':''}">
            </div>
            <div class="field"><label>Estado de cierre</label>
              <select id="f_sug_estado">${Object.keys(STATUS).map(s=>`<option ${r&&r.estado===s?'selected':''}>${s}</option>`).join('')}</select>
            </div>
          </div>
          <div class="field"><label>Observación (motivo por el que se realiza o no)</label>
            <textarea id="f_sug_observacion" placeholder="Ej: Se aprueba y se ejecutará en la próxima parada / No se realiza por...">${r?(r.sug_observacion||''):''}</textarea>
          </div>
          <div class="field"><label>Fecha de cierre</label>
            <input type="date" id="f_sug_cierre" value="${r?r.fecha_cierre||'':''}">
          </div>
        </div>

        <div id="block_rp">
          <div class="section-title" style="margin-top:18px;padding-top:10px;border-top:1px dashed var(--line);">Comunicación a gerencias</div>
          <div style="font-size:11px;color:var(--graphite-light);margin:-6px 0 10px;">El cierre de este reporte queda sujeto a que haya sido informado a las gerencias.</div>
          <div class="field-row">
            <div class="field"><label>¿Informado a las gerencias?</label>
              <select id="f_rp_informado" onchange="validateEstadoCierre(document.getElementById('f_estado'))">${['','Sí','No'].map(o=>`<option value="${o}" ${r&&r.rp_informado===o?'selected':''}>${o||'Seleccionar...'}</option>`).join('')}</select>
            </div>
            <div class="field"><label>Fecha en que se informó</label>
              <input type="date" id="f_rp_fecha_informado" value="${r?r.rp_fecha_informado||'':''}">
            </div>
          </div>
        </div>

        <div id="block_cap">
          <div class="section-title">Datos de la capacitación</div>
          <div class="field-row">
            <div class="field"><label>Tipo de capacitación</label>
              <select id="f_cap_tipo">${tiposCapOptionsHtml(r?(r.cap_tipo||''):'')}</select>
            </div>
            <div class="field"><label>Duración</label>
              <input type="text" id="f_cap_duracion" value="${r?(r.cap_duracion||'').replace(/"/g,'&quot;'):''}" placeholder="Ej: 2 horas, 90 min">
            </div>
          </div>
          <div class="field-row">
            <div class="field"><label>Instructor — Nombre</label>
              <input type="text" id="f_cap_instructor" value="${r?(r.cap_instructor_nombre||'').replace(/"/g,'&quot;'):''}" placeholder="Ej: Juan Pérez">
            </div>
            <div class="field"><label>Instructor — Cargo</label>
              <input type="text" id="f_cap_instructor_cargo" value="${r?(r.cap_instructor_cargo||'').replace(/"/g,'&quot;'):''}" placeholder="Ej: Oficial de Seguridad">
            </div>
          </div>
          <div class="field">
            <label>¿Parte del plan anual de capacitación?</label>
            <select id="f_cap_plan_anual">${['','Sí','No'].map(o=>`<option value="${o}" ${r&&r.cap_plan_anual===o?'selected':''}>${o||'Seleccionar...'}</option>`).join('')}</select>
          </div>
          <div class="section-title with-btn" style="margin-top:8px;">
            <span style="font-size:12.5px;">Participantes</span>
            <button type="button" class="btn secondary" style="padding:5px 10px;" onclick="addCapParticipante()">+ Agregar participante</button>
          </div>
          <div id="capParticipantesList"></div>
          <div class="field-row" style="margin-top:10px;">
            <div class="field"><label>¿Fue efectiva?</label>
              <select id="f_cap_efectiva">${['','Sí','No'].map(o=>`<option value="${o}" ${r&&r.cap_efectiva===o?'selected':''}>${o||'Seleccionar...'}</option>`).join('')}</select>
            </div>
            <div class="field"><label>¿Se realizó evaluación / actividad posterior?</label>
              <select id="f_cap_evaluacion">${['','Sí','No'].map(o=>`<option value="${o}" ${r&&r.cap_evaluacion===o?'selected':''}>${o||'Seleccionar...'}</option>`).join('')}</select>
            </div>
          </div>
          <div class="field"><label>Detalle de la evaluación / actividad posterior</label>
            <textarea id="f_cap_evaluacion_detalle" placeholder="Ej: Cuestionario escrito, ejercicio práctico, evaluación oral...">${r?(r.cap_evaluacion_detalle||''):''}</textarea>
          </div>
        </div>

        <div id="block_aud">
          <div class="section-title">Datos de la auditoría / inspección</div>
          <div class="field-row">
            <div class="field"><label>Interna / Externa</label>
              <select id="f_aud_alcance">${['','Interna','Externa'].map(o=>`<option value="${o}" ${r&&r.aud_alcance===o?'selected':''}>${o||'Seleccionar...'}</option>`).join('')}</select>
            </div>
            <div class="field"><label>Norma / Tipo</label>
              <select id="f_aud_norma">${['','ISM','ISO','Cliente'].map(o=>`<option value="${o}" ${r&&r.aud_norma===o?'selected':''}>${o||'Seleccionar...'}</option>`).join('')}</select>
            </div>
          </div>
          <div class="field"><label>Auditor</label>
            <input type="text" id="f_aud_auditor" value="${r?(r.aud_auditor||'').replace(/"/g,'&quot;'):''}" placeholder="Nombre del auditor">
          </div>
          <div class="field"><label>¿Se repite?</label>
            <select id="f_aud_recurrencia">${recurrenciaOptionsHtml(r?r.aud_recurrencia||'':'')}</select>
          </div>
          <div style="font-size:11px;color:var(--graphite-light);margin:-6px 0 10px;">Si se repite, la próxima auditoría se va a ver en "Programados" — no en este registro.</div>
          <div class="section-title with-btn" style="margin-top:8px;">
            <span style="font-size:12.5px;">Hallazgos</span>
            <button type="button" class="btn secondary" style="padding:5px 10px;" onclick="addHallazgo()">+ Agregar hallazgo</button>
          </div>
          <div style="font-size:11px;color:var(--graphite-light);margin:-2px 0 8px;">Cada hallazgo (Observación / No Conformidad / Oportunidad de Mejora) crea automáticamente su propio registro, para seguirlo desde su sección.</div>
          <div id="hallazgosList"></div>
        </div>

        <div id="block_insp">
          <div class="section-title">Datos de la inspección</div>
          <div class="field-row">
            <div class="field"><label>Interna / Externa</label>
              <select id="f_insp_alcance">${['','Interna','Externa'].map(o=>`<option value="${o}" ${r&&r.insp_alcance===o?'selected':''}>${o||'Seleccionar...'}</option>`).join('')}</select>
            </div>
            <div class="field"><label>Tipo</label>
              <select id="f_insp_tipo">${['','OVID','IMCA','Seguridad','PSC','Inspección Extraordinaria'].map(o=>`<option value="${o}" ${r&&r.insp_tipo===o?'selected':''}>${o||'Seleccionar...'}</option>`).join('')}</select>
            </div>
          </div>
          <div class="field"><label>Inspector</label>
            <input type="text" id="f_insp_inspector" value="${r?(r.insp_inspector||'').replace(/"/g,'&quot;'):''}" placeholder="Nombre del inspector">
          </div>
          <div class="section-title with-btn" style="margin-top:8px;">
            <span style="font-size:12.5px;">Hallazgos</span>
            <button type="button" class="btn secondary" style="padding:5px 10px;" onclick="addObservacion()">+ Agregar hallazgo</button>
          </div>
          <div style="font-size:11px;color:var(--graphite-light);margin:-2px 0 8px;">Cada hallazgo se registra con su responsable, vencimiento y estado. Opcionalmente podés abrir un registro de seguimiento (NC / Observación / OM), que se crea automáticamente en su sección.</div>
          <div id="observacionesList"></div>
        </div>

        <div id="block_gestion">
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
            ${r && usuarioActualPuedeVisar() ? `<button class="btn danger" onclick="deleteRecord('${r.id}')">Eliminar</button>` : ''}
            ${r? `<button class="btn secondary" onclick="previewRecordPDF('${r.id}')">👁 Previsualizar / Imprimir PDF</button>` : ''}
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
  modalCapParticipantes = participantesFromRecord(r);
  modalHallazgos = hallazgosFromRecord(r);
  modalObservaciones = observacionesFromRecord(r);
  renderInvestigadoresList();
  renderCapParticipantesList();
  renderHallazgosList();
  renderObservacionesList();
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
// Personas ahora son {nombre, email}. Esta capa tolera entradas viejas (strings).
function normPersona(p){
  if(typeof p === 'string') return { nombre: p.split('/')[0].trim(), email: '' };
  return { nombre: ((p && p.nombre) || '').trim(), email: ((p && p.email) || '').trim() };
}
function personasList(){
  const raw = (DATA.catalogos && DATA.catalogos.personas) || [];
  return raw.map(normPersona).filter(p => p.nombre);
}
function personaEmail(nombre){
  const n = (nombre||'').trim().toLowerCase();
  if(!n) return '';
  const found = personasList().find(p => p.nombre.toLowerCase() === n);
  return found ? found.email : '';
}
function renderPersonasDatalist(){
  const dl = document.getElementById('personasDatalist');
  if(!dl) return;
  const nombres = [...new Set(personasList().map(p => p.nombre))];
  nombres.sort((a,b) => a.localeCompare(b, 'es'));
  dl.innerHTML = nombres.map(p => `<option value="${p.replace(/"/g,'&quot;')}">`).join('');
}
function registrarPersonaSiEsNueva(nombre){
  if(!nombre) return;
  const n = nombre.trim();
  if(!n) return;
  if(!DATA.catalogos) ensureCatalogos();
  if(!Array.isArray(DATA.catalogos.personas)) DATA.catalogos.personas = [];
  const existe = personasList().some(p => p.nombre.toLowerCase() === n.toLowerCase());
  if(!existe){ DATA.catalogos.personas.push({ nombre: n, email: '' }); }
}
function leccionesFromRecord(r){
  if(!r || !r.lecciones_aprendidas) return [];
  if(Array.isArray(r.lecciones_aprendidas)) return JSON.parse(JSON.stringify(r.lecciones_aprendidas));
  // compatibilidad con registros previos donde era un único texto
  return [{texto: r.lecciones_aprendidas, la_id: r.leccion_generada_id || null}];
}
/* ============ HALLAZGOS (Auditoría) ============ */
const HALLAZGO_TIPOS = [['OBS','Observación'],['NC','No Conformidad'],['OM','Oportunidad de Mejora']];
function hallazgosFromRecord(r){
  if(r && Array.isArray(r.hallazgos)) return JSON.parse(JSON.stringify(r.hallazgos));
  return [];
}
function addHallazgo(){
  modalHallazgos.push({ tipo:'OBS', descripcion:'', responsable:'', rec_id:null });
  renderHallazgosList();
}
function removeHallazgo(i){
  modalHallazgos.splice(i,1);
  renderHallazgosList();
}
function updateHallazgoField(i, campo, val){
  if(modalHallazgos[i]) modalHallazgos[i][campo] = val;
}
function renderHallazgosList(){
  const wrap = document.getElementById('hallazgosList');
  if(!wrap) return;
  if(modalHallazgos.length===0){ wrap.innerHTML = '<span style="font-size:12px;color:var(--graphite-light)">Sin hallazgos cargados. Cada hallazgo crea automáticamente su registro para seguirlo.</span>'; return; }
  wrap.innerHTML = modalHallazgos.map((h,i)=>`
    <div style="border:1px solid var(--line);border-radius:var(--radius);padding:10px 12px;margin-bottom:8px;background:#F7F9FB;">
      <div style="display:flex;gap:10px;align-items:flex-end;">
        <div class="field" style="flex:0 0 170px;margin-bottom:0;"><label style="font-size:11px;">Tipo de hallazgo</label>
          <select onchange="updateHallazgoField(${i},'tipo',this.value)">${HALLAZGO_TIPOS.map(([v,l])=>`<option value="${v}" ${h.tipo===v?'selected':''}>${l}</option>`).join('')}</select>
        </div>
        <div class="field" style="flex:1;margin-bottom:0;"><label style="font-size:11px;">Responsable ${h.rec_id?`<span class="mono" style="color:var(--graphite-light);font-size:10px;font-weight:400;">(registro ${h.rec_id})</span>`:''}</label>
          <select onchange="updateHallazgoField(${i},'responsable',this.value)">${cargoOptionsHtml(h.responsable)}</select>
        </div>
        <button class="btn secondary" style="padding:8px 12px;color:var(--red);flex:0 0 auto;" onclick="removeHallazgo(${i})">✕</button>
      </div>
      <div class="field" style="margin:8px 0 0;"><label style="font-size:11px;">Descripción del hallazgo</label>
        <textarea rows="2" style="min-height:52px;resize:vertical;" placeholder="Descripción del hallazgo" oninput="updateHallazgoField(${i},'descripcion',this.value)">${h.descripcion||''}</textarea>
      </div>
    </div>`).join('');
}

/* ============ OBSERVACIONES (Inspección) ============ */
function observacionesFromRecord(r){
  if(r && Array.isArray(r.observaciones)) return JSON.parse(JSON.stringify(r.observaciones));
  return [];
}
function addObservacion(){
  modalObservaciones.push({ descripcion:'', comentario_operador:'', responsable:'', vencimiento:'', estado:'Abierto', genera:'No', tipo:'OBS', rec_id:null });
  renderObservacionesList();
}
function removeObservacion(i){
  modalObservaciones.splice(i,1);
  renderObservacionesList();
}
function updateObservacionField(i, campo, val){
  if(!modalObservaciones[i]) return;
  modalObservaciones[i][campo] = val;
  if(campo === 'genera') renderObservacionesList(); // muestra/oculta tipo + responsable
}
function renderObservacionesList(){
  const wrap = document.getElementById('observacionesList');
  if(!wrap) return;
  if(modalObservaciones.length===0){ wrap.innerHTML = '<span style="font-size:12px;color:var(--graphite-light)">Sin hallazgos cargados.</span>'; return; }
  const ESTADOS = ['Abierto','En Proceso','Cerrado'];
  wrap.innerHTML = modalObservaciones.map((o,i)=>{
    const abre = o.genera === 'Sí';
    return `
    <div style="border:1px solid var(--line);border-radius:var(--radius);padding:10px 12px;margin-bottom:8px;background:#F7F9FB;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
        <span class="mono" style="font-size:10px;color:var(--graphite-light);text-transform:uppercase;letter-spacing:0.06em;">Hallazgo ${i+1}${o.rec_id?` · <span style="color:var(--navy);">registro ${o.rec_id}</span>`:''}</span>
        <button class="btn secondary" style="padding:5px 10px;color:var(--red);" onclick="removeObservacion(${i})">✕</button>
      </div>
      <div class="field" style="margin:0 0 8px;"><label style="font-size:11px;">Hallazgo</label>
        <textarea rows="2" style="min-height:52px;resize:vertical;" placeholder="Descripción del hallazgo" oninput="updateObservacionField(${i},'descripcion',this.value)">${o.descripcion||''}</textarea>
      </div>
      <div class="field" style="margin:0 0 8px;"><label style="font-size:11px;">Comentarios del Operador</label>
        <textarea rows="2" style="min-height:52px;resize:vertical;" placeholder="Comentarios del Operador" oninput="updateObservacionField(${i},'comentario_operador',this.value)">${o.comentario_operador||''}</textarea>
      </div>
      <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
        <div class="field" style="flex:1 1 160px;margin-bottom:0;"><label style="font-size:11px;">Responsable</label>
          <select onchange="updateObservacionField(${i},'responsable',this.value)">${cargoOptionsHtml(o.responsable)}</select>
        </div>
        <div class="field" style="flex:0 0 150px;margin-bottom:0;"><label style="font-size:11px;">Vencimiento</label>
          <input type="date" value="${o.vencimiento||''}" onchange="updateObservacionField(${i},'vencimiento',this.value)">
        </div>
        <div class="field" style="flex:0 0 150px;margin-bottom:0;"><label style="font-size:11px;">Estado</label>
          <select onchange="updateObservacionField(${i},'estado',this.value)">${ESTADOS.map(e=>`<option value="${e}" ${o.estado===e?'selected':''}>${e}</option>`).join('')}</select>
        </div>
      </div>
      <div class="field" style="margin:8px 0 0;max-width:340px;"><label style="font-size:11px;">¿Abrir registro de hallazgo para seguimiento?</label>
        <select onchange="updateObservacionField(${i},'genera',this.value)">${['No','Sí'].map(v=>`<option value="${v}" ${o.genera===v?'selected':''}>${v}</option>`).join('')}</select>
      </div>
      ${abre ? `
      <div class="field" style="margin:8px 0 0;flex:0 0 200px;max-width:240px;"><label style="font-size:11px;">Tipo de registro</label>
        <select onchange="updateObservacionField(${i},'tipo',this.value)">${HALLAZGO_TIPOS.map(([v,l])=>`<option value="${v}" ${o.tipo===v?'selected':''}>${l}</option>`).join('')}</select>
      </div>` : ''}
    </div>`;
  }).join('');
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

/* ============ PARTICIPANTES (Capacitación) ============ */
function participantesFromRecord(r){
  if(r && Array.isArray(r.cap_participantes)) return JSON.parse(JSON.stringify(r.cap_participantes));
  return [];
}
function addCapParticipante(){
  modalCapParticipantes.push({ nombre:'', cargo:'' });
  renderCapParticipantesList();
}
function removeCapParticipante(i){
  modalCapParticipantes.splice(i,1);
  renderCapParticipantesList();
}
function updateCapParticipanteField(i, campo, val){
  if(modalCapParticipantes[i]) modalCapParticipantes[i][campo] = val;
}
function renderCapParticipantesList(){
  const wrap = document.getElementById('capParticipantesList');
  if(!wrap) return;
  if(modalCapParticipantes.length===0){ wrap.innerHTML = '<span style="font-size:12px;color:var(--graphite-light)">Sin participantes cargados.</span>'; return; }
  wrap.innerHTML = modalCapParticipantes.map((p,i)=>`
    <div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:8px;">
      <div class="field" style="flex:1;margin-bottom:0;"><label style="font-size:11px;">Nombre y apellido</label>
        <input type="text" value="${(p.nombre||'').replace(/"/g,'&quot;')}" placeholder="Nombre" oninput="updateCapParticipanteField(${i},'nombre',this.value)">
      </div>
      <div class="field" style="flex:1;margin-bottom:0;"><label style="font-size:11px;">Cargo</label>
        <input type="text" value="${(p.cargo||'').replace(/"/g,'&quot;')}" placeholder="Cargo" oninput="updateCapParticipanteField(${i},'cargo',this.value)">
      </div>
      <button class="btn secondary" style="padding:8px 12px;color:var(--red);flex:0 0 auto;" onclick="removeCapParticipante(${i})">✕</button>
    </div>`).join('');
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
    <div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:8px;">
      <div class="field" style="flex:1;margin-bottom:0;"><label style="font-size:11px;">Nombre</label>
        <input type="text" value="${(inv.nombre||'').replace(/"/g,'&quot;')}" placeholder="Nombre" oninput="updateInvestigadorField(${i},'nombre',this.value)">
      </div>
      <div class="field" style="flex:1;margin-bottom:0;"><label style="font-size:11px;">Cargo</label>
        <select onchange="updateInvestigadorField(${i},'cargo',this.value)">${cargoOptionsHtml(inv.cargo)}</select>
      </div>
      <button class="btn secondary" style="padding:8px 12px;color:var(--red);flex:0 0 auto;" onclick="removeInvestigador(${i})">✕</button>
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
  if(field === 'estado'){
    if(value === 'Cerrado' && !arr[i].fecha_cierre) arr[i].fecha_cierre = todayISO();
    renderAccionesBlock(tipoAccion);
  }
}
function validateEstadoCierre(sel){
  const tipo = document.getElementById('f_tipo').value;
  if(tipo === 'RP'){
    if(sel.value !== 'Cerrado') return;
    const informadoEl = document.getElementById('f_rp_informado');
    if(!informadoEl || informadoEl.value !== 'Sí'){
      showToast('No se puede cerrar un Reporte Positivo sin indicar que fue informado a las gerencias');
      sel.value = 'En Proceso';
    }
    return;
  }
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
          <select onchange="updateAccionField('${tipoAccion}',${i},'responsable',this.value)">${cargoOptionsHtml(a.responsable)}</select>
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
      ${a.estado==='Cerrado' ? `<div class="field"><label>Fecha de cierre</label>
        <input type="date" value="${a.fecha_cierre||''}" oninput="updateAccionField('${tipoAccion}',${i},'fecha_cierre',this.value)">
      </div>` : ''}
    </div>`).join('');
}
function toggleConditionalFields(){
  const tipo = document.getElementById('f_tipo').value;
  const desc = tipoDescriptor(tipo);
  const setLbl = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
  setLbl('label_fecha', 'Fecha ' + desc);
  setLbl('label_titulo', 'Título ' + desc);
  setLbl('label_descripcion', 'Descripción ' + desc);
  document.getElementById('block_ocimf').style.display = TIPOS_CON_OCIMF.includes(tipo) ? 'block' : 'none';
  // Registros generados automáticamente desde una INSPECCIÓN: no aplican Clasificación ni Origen de Auditoría.
  const origenInsp = editingId ? ((DATA.records.find(x=>x.id===editingId)||{}).origen_registro_tipo === 'INSP') : false;
  document.getElementById('block_clasif_origen').style.display = (TIPOS_CON_CLASIF_ORIGEN.includes(tipo) && !origenInsp) ? 'block' : 'none';
  document.getElementById('block_auditoria_nc').style.display = (tipo === 'NC' && !origenInsp) ? 'block' : 'none';
  const esSug = (tipo === 'SUG');
  const esRp = (tipo === 'RP');
  const esCap = (tipo === 'CAP');
  const esAud = (tipo === 'AUD');
  const esInsp = (tipo === 'INSP');
  const esTiso = (tipo === 'TISO');
  const esProg = (tipo === 'PROG');
  if(esCap) setLbl('label_titulo', 'Tema de la capacitación');
  document.getElementById('block_titulo_libre').style.display = esTiso ? 'none' : 'block';
  document.getElementById('block_tiso').style.display = esTiso ? 'block' : 'none';
  document.getElementById('block_prog').style.display = esProg ? 'block' : 'none';
  document.getElementById('block_area').style.display = (esAud || esInsp || esTiso || esProg) ? 'none' : 'block';
  document.getElementById('block_causa_accion').style.display = TIPOS_SIN_CAUSA_ACCION.includes(tipo) ? 'none' : 'block';
  document.getElementById('block_responsable_simple').style.display = (TIPOS_SIN_CAUSA_ACCION.includes(tipo) && !esSug && !esRp && !esCap && !esAud && !esInsp && !esTiso && !esProg) ? 'grid' : 'none';
  document.getElementById('block_comunicacion').style.display = (TIPOS_SIN_CAUSA_ACCION.includes(tipo) && !esSug && !esRp && !esCap && !esAud && !esInsp && !esTiso && !esProg) ? 'block' : 'none';
  document.getElementById('block_sug_seguimiento').style.display = esSug ? 'block' : 'none';
  document.getElementById('block_rp').style.display = esRp ? 'block' : 'none';
  document.getElementById('block_cap').style.display = esCap ? 'block' : 'none';
  document.getElementById('block_aud').style.display = esAud ? 'block' : 'none';
  document.getElementById('block_insp').style.display = esInsp ? 'block' : 'none';
  document.getElementById('block_reportado').style.display = (esCap || esAud || esInsp || esTiso || esProg) ? 'none' : 'block';
  document.getElementById('block_gestion').style.display = (esSug || esCap) ? 'none' : 'block';
  document.getElementById('block_cuasi').style.display = (tipo === 'CUA') ? 'block' : 'none';
  document.getElementById('block_categoria_aici').style.display = (tipo === 'INC') ? 'block' : 'none';
  // Bloques exclusivos de Incidente: investigadores, condiciones ambientales y descripción guiada
  const esInc = (tipo === 'INC');
  document.getElementById('block_investigadores').style.display = esInc ? 'block' : 'none';
  document.getElementById('block_condiciones_inc').style.display = esInc ? 'block' : 'none';
  document.getElementById('block_desc_inc').style.display = esInc ? 'block' : 'none';
  document.getElementById('block_desc_simple').style.display = (esInc || esAud || esInsp) ? 'none' : 'block';
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
function getIfVal(id){ const el = document.getElementById(id); return el ? el.value : ''; }
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
  const co = DATA.companies[0];
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
  const NAVY='#1C3666', GRAPH='#5B6671';
  const nombre = r.visado_por || 'Emmanuel Martinez';
  const cargo  = r.visado_cargo || 'Gte. HSQE/DPA';
  return `
    <table style="width:100%;margin-top:26px;border-collapse:collapse;">
      <tr><td style="text-align:center;padding-top:6px;">
        <div class="firma-manuscrita" style="font-family:'Great Vibes','Segoe Script','Bradley Hand',cursive;font-size:34pt;color:${NAVY};line-height:1;">${nombre}</div>
        <div style="border-top:1px solid #555;width:280px;margin:2px auto 0;"></div>
        <div style="font-size:8.5pt;color:${GRAPH};margin-top:5px;text-transform:uppercase;letter-spacing:0.6pt;">Visado por Responsable HSQE / DPA <span style="font-style:italic;text-transform:none;">· Approved by HSQE/DPA Manager</span></div>
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
  const prevVisado = { visado:r.visado, visado_por:r.visado_por, visado_cargo:r.visado_cargo, visado_email:r.visado_email, visado_fecha:r.visado_fecha };
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
  if(!ok){ Object.assign(r, prevVisado); return; } // el guardado falló: se revierte el cambio en memoria
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
  const esSug = (tipoSel === 'SUG');
  const esRp = (tipoSel === 'RP');
  const esCap = (tipoSel === 'CAP');
  const esAud = (tipoSel === 'AUD');
  const esInsp = (tipoSel === 'INSP');
  const esTiso = (tipoSel === 'TISO');
  const esProg = (tipoSel === 'PROG');
  const estadoSel = esCap ? 'Cerrado' : (esSug ? getIf('f_sug_estado') : get('f_estado'));
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

  const accionCerradaSinFecha = [...modalAccionesCorrectivas, ...modalAccionesPreventivas]
    .find(a => a.estado === 'Cerrado' && !a.fecha_cierre);
  if(accionCerradaSinFecha){
    showToast('Indicá la fecha de cierre de las acciones en estado "Cerrado"');
    return;
  }

  if(esSug && estadoSel === 'Cerrado' && !getIf('f_sug_cierre')){
    showToast('Indicá la fecha de cierre de la sugerencia (estado "Cerrado")');
    return;
  }

  if(esRp && estadoSel === 'Cerrado' && getIf('f_rp_informado') !== 'Sí'){
    showToast('No se puede cerrar un Reporte Positivo sin indicar que fue informado a las gerencias');
    return;
  }
  if(esRp && estadoSel === 'Cerrado' && !getIf('f_rp_fecha_informado')){
    showToast('Indicá la fecha en que se informó a las gerencias');
    return;
  }

  // Responsable obligatorio (nombre y apellido) donde se dispara notificación:
  // cada acción correctiva/preventiva con contenido, y el responsable de la sugerencia.
  if(!tipoSinAcciones){
    const accionSinResp = [...modalAccionesCorrectivas, ...modalAccionesPreventivas]
      .find(a => (a.descripcion||'').trim() && !(a.responsable||'').trim());
    if(accionSinResp){
      showToast('Cada acción correctiva/preventiva debe tener un responsable asignado (nombre y apellido)');
      return;
    }
  }
  if(esSug && !getIf('f_sug_resp').trim()){
    showToast('La sugerencia debe tener un responsable asignado (nombre y apellido)');
    return;
  }

  // Aviso (no bloquea) si algún cargo responsable asignado todavía no tiene correo cargado.
  const respAsignados = [
    ...(tipoSinAcciones ? [] : [...modalAccionesCorrectivas, ...modalAccionesPreventivas].map(a => (a.responsable||'').trim())),
    esSug ? getIf('f_sug_resp').trim() : '',
    esTiso ? getIf('f_tiso_responsable').trim() : '',
  ].filter(Boolean);
  const sinMail = [...new Set(respAsignados)].filter(c => !cargoEmail(c));

  const rec = {
    id: editingId || generateRecordId(tipoSel, fechaSel),
    tipo: tipoSel,
    empresa_id: (DATA.companies[0] ? DATA.companies[0].id : ''),
    cliente_operacion: getIf('f_cliente'),
    instalacion: get('f_instalacion'),
    fecha: fechaSel,
    area: get('f_area'),
    titulo: esTiso ? getIf('f_tiso_titulo') : get('f_titulo'),
    tiso_recurrencia: esTiso ? getIf('f_tiso_recurrencia') : '',
    // Recurrencia de un Programado cargado manualmente (sin registro madre). Para uno vinculado a
    // una Tarea ISO/ISM o Auditoría, se pisa más abajo con la del vínculo — ver bloque editingId+esProg.
    prog_recurrencia: esProg ? getIf('f_prog_manual_recurrencia') : '',
    origen_automatico: false,
    origen_registro_id: '',
    origen_registro_tipo: '',
    descripcion: descripcionPrincipal,
    inc_descripcion: esInc ? incDescripcion : null,
    reportado_nombre: get('f_reportado_nombre').trim(),
    reportado_cargo: '',
    reportado_por: get('f_reportado_nombre').trim(),
    investigador_lider_nombre: esInc ? getIf('f_investigador_lider_nombre').trim() : '',
    investigador_lider_cargo: esInc ? getIf('f_investigador_lider_cargo') : '',
    investigador_lider: esInc ? (getIf('f_investigador_lider_nombre').trim() + (getIf('f_investigador_lider_cargo') ? ' / ' + getIf('f_investigador_lider_cargo') : '')) : '',
    investigadores: esInc ? JSON.parse(JSON.stringify(modalInvestigadores.filter(i => (i.nombre||'').trim() || (i.cargo||'').trim()))) : [],
    cap_instructor_nombre: esCap ? getIf('f_cap_instructor').trim() : '',
    cap_tipo: esCap ? getIf('f_cap_tipo') : '',
    cap_instructor_cargo: esCap ? getIf('f_cap_instructor_cargo') : '',
    cap_duracion: esCap ? getIf('f_cap_duracion').trim() : '',
    cap_efectiva: esCap ? getIf('f_cap_efectiva') : '',
    cap_evaluacion: esCap ? getIf('f_cap_evaluacion') : '',
    cap_evaluacion_detalle: esCap ? getIf('f_cap_evaluacion_detalle').trim() : '',
    cap_plan_anual: esCap ? getIf('f_cap_plan_anual') : '',
    cap_participantes: esCap ? JSON.parse(JSON.stringify(modalCapParticipantes.filter(p => (p.nombre||'').trim() || (p.cargo||'').trim()))) : [],
    aud_alcance: esAud ? getIf('f_aud_alcance') : '',
    aud_norma: esAud ? getIf('f_aud_norma') : '',
    aud_auditor: esAud ? getIf('f_aud_auditor').trim() : '',
    hallazgos: esAud ? JSON.parse(JSON.stringify(modalHallazgos.filter(h => (h.descripcion||'').trim()))) : [],
    insp_alcance: esInsp ? getIf('f_insp_alcance') : '',
    insp_tipo: esInsp ? getIf('f_insp_tipo') : '',
    insp_inspector: esInsp ? getIf('f_insp_inspector').trim() : '',
    observaciones: esInsp ? JSON.parse(JSON.stringify(modalObservaciones.filter(o => (o.descripcion||'').trim()))) : [],
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
    responsable: esSug ? getIf('f_sug_resp') : ((esTiso || esProg) ? getIf(esTiso ? 'f_tiso_responsable' : 'f_prog_responsable') : (tipoSinAcciones ? get('f_responsable') : '')),
    fecha_vencimiento: esSug ? getIf('f_sug_plazo_seg') : ((esAud || esInsp) ? '' : (esProg ? fechaSel : (tipoSinAcciones ? get('f_vencimiento') : ''))),
    aud_recurrencia: esAud ? getIf('f_aud_recurrencia') : '',
    fecha_cierre: esSug ? getIf('f_sug_cierre') : get('f_cierre'),
    referencia_normativa: get('f_referencia'),
    sug_area: esSug ? getIf('f_sug_area') : '',
    sug_realiza: esSug ? getIf('f_sug_realiza') : '',
    sug_observacion: esSug ? getIf('f_sug_observacion') : '',
    rp_informado: esRp ? getIf('f_rp_informado') : '',
    rp_fecha_informado: esRp ? getIf('f_rp_fecha_informado') : '',
    adjuntos: JSON.parse(JSON.stringify(modalAttachments)),
  };
  const requiereDescripcion = !esCap && !esAud && !esInsp && !esTiso && !esProg; // estos tipos no tienen campo descripción propio
  if(!rec.fecha || !rec.titulo || (requiereDescripcion && !rec.descripcion)){
    showToast(esInc ? 'Completá al menos fecha, título y la pregunta 1 (Describa qué pasó)' : (requiereDescripcion ? 'Completá al menos fecha, título y descripción' : 'Completá al menos fecha y título'));
    return;
  }

  let estadoAnteriorProg = null;
  let prevRecord = null;
  if(editingId){
    prevRecord = DATA.records.find(x=>x.id===editingId);
    if(prevRecord){
      estadoAnteriorProg = prevRecord.estado;
      if(prevRecord.visado){
        // Se conserva el visado existente. Nota de auditoría: si el contenido cambió,
        // el visado sigue vigente; ver recomendación de invalidar visado tras edición.
        rec.visado = prevRecord.visado;
        rec.visado_por = prevRecord.visado_por;
        rec.visado_cargo = prevRecord.visado_cargo;
        rec.visado_email = prevRecord.visado_email;
        rec.visado_fecha = prevRecord.visado_fecha;
      }
      if(esProg){
        // Vínculo con el registro madre: no hay campo de formulario para esto, se conserva tal cual.
        rec.origen_automatico = prevRecord.origen_automatico || false;
        rec.origen_registro_id = prevRecord.origen_registro_id || '';
        rec.origen_registro_tipo = prevRecord.origen_registro_tipo || '';
        rec.prog_recurrencia = prevRecord.prog_recurrencia || '';
      }
    }
  }

  // Atender un Programado cambiándole la Clasificación: se guarda como un registro NUEVO
  // (con numeración propia del tipo elegido, no el ID del Programado) y el Programado original
  // queda cerrado como historial, vinculado al registro que generó. Si el registro nuevo tiene
  // recurrencia, más abajo se genera su propio Programado — no un duplicado del que se cierra acá.
  const promoviendoProgramado = !!(prevRecord && prevRecord.tipo === 'PROG' && tipoSel !== 'PROG');
  const cambiados = [];
  if(promoviendoProgramado){
    rec.id = generateRecordId(tipoSel, fechaSel);
    prevRecord.estado = 'Cerrado';
    prevRecord.fecha_cierre = todayISO();
    prevRecord.referencia_normativa = `Atendido — convertido en ${TYPES[tipoSel] ? TYPES[tipoSel].label : tipoSel} ${rec.id}`;
    DATA.records.push(rec);
    cambiados.push(prevRecord, rec);
  } else if(editingId){
    const idx = DATA.records.findIndex(x=>x.id===editingId);
    DATA.records[idx] = rec;
    cambiados.push(rec);
  } else {
    DATA.records.push(rec);
    cambiados.push(rec);
  }
  const nuevasLA = manageLeccionesAprendidas(rec);
  const nuevosHall = manageHallazgosAuditoria(rec);
  const nuevosObs = manageObservacionesInspeccion(rec);
  const progResult = manageProgramados(rec, promoviendoProgramado ? null : estadoAnteriorProg);
  cambiados.push(...progResult.upsert);
  (rec.lecciones_aprendidas || []).forEach(item => {
    if(item.la_id){
      const la = DATA.records.find(x => x.id === item.la_id);
      if(la) cambiados.push(la);
    }
  });
  (rec.hallazgos || []).forEach(item => {
    if(item.rec_id){
      const hijo = DATA.records.find(x => x.id === item.rec_id);
      if(hijo) cambiados.push(hijo);
    }
  });
  (rec.observaciones || []).forEach(item => {
    if(item.rec_id){
      const hijo = DATA.records.find(x => x.id === item.rec_id);
      if(hijo) cambiados.push(hijo);
    }
  });
  const resultados = await Promise.all(cambiados.map(r => upsertRegistro(r)));
  if(progResult.deleteIds.length) await Promise.all(progResult.deleteIds.map(id => deleteRegistroRow(id)));
  await saveCatalogos(); // personas nuevas registradas
  if(resultados.some(ok => !ok)){ return; } // error ya notificado; el modal queda abierto
  closeModal();
  renderAll();
  const generadosTotal = nuevosHall + nuevosObs;
  showToast(promoviendoProgramado ? `Programado atendido — se creó ${TYPES[tipoSel]?TYPES[tipoSel].label:tipoSel} ${rec.id}${progResult.nuevos>0?' y se generó el próximo Programado':''}`
    : generadosTotal>0 ? `Guardado — se ${generadosTotal===1?'creó 1 hallazgo':'crearon '+generadosTotal+' hallazgos'} para seguimiento`
    : (nuevasLA>0 ? `Registro guardado — se ${nuevasLA===1?'generó 1 Lección Aprendida':'generaron '+nuevasLA+' Lecciones Aprendidas'} para seguimiento`
    : (progResult.nuevos>0 ? `Registro guardado — se generó 1 Programado para la próxima repetición` : (editingId? 'Registro actualizado' : 'Registro creado'))));
  if(sinMail.length){
    setTimeout(() => showToast('Ojo: sin correo cargado (no recibirán aviso): ' + sinMail.join(', ') + '. Cargalo en Gestionar catálogos → Cargos.'), 2600);
  }
}
function manageObservacionesInspeccion(rec){
  if(rec.tipo !== 'INSP' || !Array.isArray(rec.observaciones)) return 0;
  let nuevos = 0;
  rec.observaciones.forEach(item=>{
    const abre = item.genera === 'Sí';
    const tipoH = item.tipo;
    const desc = (item.descripcion||'').trim();
    if(!abre || !tipoH || !desc) return;
    const descHijo = desc + (item.comentario_operador ? `\nComentarios del Operador: ${item.comentario_operador}` : '');
    if(item.rec_id){
      const hijo = DATA.records.find(x => x.id === item.rec_id && x.tipo === tipoH);
      if(hijo){
        hijo.descripcion = descHijo;
        hijo.responsable = item.responsable || '';
        hijo.fecha_vencimiento = item.vencimiento || '';
        hijo.estado = item.estado || 'Abierto';
        return;
      }
    }
    const hijo = {
      id: generateRecordId(tipoH, rec.fecha),
      tipo: tipoH,
      empresa_id: rec.empresa_id,
      cliente_operacion: rec.cliente_operacion,
      instalacion: rec.instalacion,
      fecha: rec.fecha,
      area: rec.area,
      titulo: `Hallazgo de inspección ${rec.id}`,
      descripcion: descHijo,
      reportado_por: rec.insp_inspector || '',
      clasificacion_origen: '',
      severidad: '',
      estado: item.estado || 'Abierto',
      comunicar_a: '', medio_comunicacion: '', plazo_comunicacion: '',
      responsable: item.responsable || '', fecha_vencimiento: item.vencimiento || '', fecha_cierre: '',
      referencia_normativa: `Generada automáticamente desde ${rec.id}`,
      acciones_correctivas: [], acciones_preventivas: [],
      adjuntos: [], lecciones_aprendidas: [],
      origen_automatico: true,
      origen_registro_id: rec.id,
      origen_registro_tipo: rec.tipo,
    };
    DATA.records.push(hijo);
    item.rec_id = hijo.id;
    nuevos++;
  });
  return nuevos;
}

function manageHallazgosAuditoria(rec){
  if(rec.tipo !== 'AUD' || !Array.isArray(rec.hallazgos)) return 0;
  let nuevos = 0;
  rec.hallazgos.forEach(item=>{
    const tipoH = item.tipo;
    const desc = (item.descripcion||'').trim();
    if(!tipoH || !desc) return;
    if(item.rec_id){
      const hijo = DATA.records.find(x => x.id === item.rec_id && x.tipo === tipoH);
      if(hijo){ hijo.descripcion = desc; hijo.responsable = item.responsable || ''; return; } // ya existe y coincide el tipo: actualiza
    }
    const hijo = {
      id: generateRecordId(tipoH, rec.fecha),
      tipo: tipoH,
      empresa_id: rec.empresa_id,
      cliente_operacion: rec.cliente_operacion,
      instalacion: rec.instalacion,
      fecha: rec.fecha,
      area: rec.area,
      titulo: `Hallazgo de auditoría ${rec.id}`,
      descripcion: desc,
      reportado_por: rec.aud_auditor || '',
      clasificacion_origen: '',
      severidad: '',
      estado: 'Abierto',
      comunicar_a: '', medio_comunicacion: '', plazo_comunicacion: '',
      responsable: item.responsable || '', fecha_vencimiento: '', fecha_cierre: '',
      referencia_normativa: `Generada automáticamente desde ${rec.id}`,
      acciones_correctivas: [], acciones_preventivas: [],
      adjuntos: [], lecciones_aprendidas: [],
      origen_automatico: true,
      origen_registro_id: rec.id,
      origen_registro_tipo: rec.tipo,
    };
    DATA.records.push(hijo);
    item.rec_id = hijo.id;
    nuevos++;
  });
  return nuevos;
}

// Genera y mantiene los registros "Programado" (la próxima repetición de una Tarea ISO/ISM o
// Auditoría con recurrencia). Reglas:
//  - Al guardar una madre (TISO/AUD) con recurrencia y sin un Programado abierto vinculado, crea uno.
//  - Si ya tiene uno abierto, sincroniza título/sitio/responsable (no toca la fecha ya programada).
//  - Si la recurrencia se saca ("No se repite"), cancela (elimina) el Programado abierto pendiente.
//  - Al cerrar un Programado (transición de estado a "Cerrado"), genera el siguiente, con vencimiento
//    = vencimiento actual + recurrencia (no desde hoy, para no correr el calendario).
// Devuelve { upsert:[...registros a guardar en Supabase...], deleteIds:[...], nuevos } para que
// saveRecord sincronice y avise al usuario.
function manageProgramados(rec, estadoAnterior){
  const upsert = [];
  const deleteIds = [];
  let nuevos = 0;

  const crearProgramado = (origen, vencimiento) => {
    if(!vencimiento) return null;
    const madreId = origen.tipo === 'PROG' ? origen.origen_registro_id : origen.id;
    const madreTipo = origen.tipo === 'PROG' ? origen.origen_registro_tipo : origen.tipo;
    const recurrencia = origen.tipo === 'PROG' ? origen.prog_recurrencia : recurrenciaDeRegistro(origen);
    const prog = {
      id: generateRecordId('PROG', vencimiento),
      tipo: 'PROG',
      empresa_id: origen.empresa_id,
      cliente_operacion: origen.cliente_operacion,
      instalacion: origen.instalacion,
      fecha: vencimiento,
      area: '',
      titulo: origen.titulo,
      descripcion: '',
      responsable: origen.responsable || '',
      estado: 'Abierto',
      fecha_vencimiento: vencimiento,
      fecha_cierre: '',
      referencia_normativa: madreId ? `Generado automáticamente desde ${madreTipo} ${madreId}` : 'Generado automáticamente al cerrar el Programado manual anterior (misma recurrencia)',
      acciones_correctivas: [], acciones_preventivas: [],
      adjuntos: [], lecciones_aprendidas: [],
      origen_automatico: true,
      origen_registro_id: madreId,
      origen_registro_tipo: madreTipo,
      prog_recurrencia: recurrencia,
    };
    DATA.records.push(prog);
    upsert.push(prog);
    nuevos++;
    return prog;
  };

  if(rec.tipo === 'TISO' || rec.tipo === 'AUD'){
    const recurrencia = recurrenciaDeRegistro(rec);
    const existente = DATA.records.find(x => x.tipo==='PROG' && x.origen_registro_id===rec.id && x.origen_registro_tipo===rec.tipo && !esCerrado(x.estado));
    if(!recurrencia){
      if(existente){ deleteIds.push(existente.id); DATA.records = DATA.records.filter(x=>x.id!==existente.id); }
      return { upsert, deleteIds, nuevos };
    }
    if(existente){
      existente.titulo = rec.titulo;
      existente.instalacion = rec.instalacion;
      existente.cliente_operacion = rec.cliente_operacion;
      existente.responsable = rec.responsable || existente.responsable;
      existente.prog_recurrencia = recurrencia;
      upsert.push(existente);
    } else {
      crearProgramado(rec, computeVencimientoRecurrente(rec.fecha, recurrencia));
    }
  }

  if(rec.tipo === 'PROG' && estadoAnterior !== 'Cerrado' && esCerrado(rec.estado) && rec.prog_recurrencia){
    crearProgramado(rec, computeVencimientoRecurrente(rec.fecha_vencimiento, rec.prog_recurrencia));
  }

  return { upsert, deleteIds, nuevos };
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
  if(!usuarioActualPuedeVisar()){
    showToast('Solo el Responsable HSQE/DPA autorizado puede eliminar registros');
    return;
  }
  if(!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
  const ok = await deleteRegistroRow(id);
  if(!ok) return;
  // Si era una Tarea ISO/ISM o Auditoría madre, se cancela también su Programado pendiente (si lo tenía).
  const progHuerfano = DATA.records.find(x => x.tipo==='PROG' && x.origen_registro_id===id && !esCerrado(x.estado));
  if(progHuerfano) await deleteRegistroRow(progHuerfano.id);
  DATA.records = DATA.records.filter(r=>r.id!==id && (!progHuerfano || r.id!==progHuerfano.id));
  closeModal();
  renderAll();
  showToast('Registro eliminado');
}

/* ============ COMPANY MANAGER ============ */
/* ============ GESTIÓN DE CATÁLOGOS (SITIOS, PERSONAS Y CATEGORÍAS) ============ */
function openCatalogManager(){
  if(!usuarioActualPuedeVisar()){
    showToast('Solo el Responsable HSQE/DPA autorizado puede gestionar los catálogos');
    return;
  }
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
    <div style="font-size:11px;color:var(--graphite-light);margin:-4px 0 8px;">Se usan para filtrar la plataforma y para el reporte PDF por sitio. Marcá cuáles son <b>Buque</b> para los KPI por ámbito (ej. Capacitaciones HSQE en buques).</div>
    ${(ensureSitiosTipo(),'')}
    <div style="margin-bottom:8px;">
      ${c.vessels.length===0 ? '<span style="font-size:12px;color:var(--graphite-light)">Sin sitios/buques cargados.</span>' :
        c.vessels.map((v,vi)=>`
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:6px;">
          <span style="flex:1;font-size:13px;color:var(--navy);">${v}</span>
          <select onchange="updateSitioTipo('${v.replace(/'/g,"\\'")}', this.value)" style="width:auto;flex:0 0 110px;">
            ${['Oficina','Buque'].map(t=>`<option value="${t}" ${sitioTipo(v)===t?'selected':''}>${t}</option>`).join('')}
          </select>
          <button class="btn secondary" style="padding:6px 10px;color:var(--red);" onclick="removeVessel(0,${vi})">✕</button>
        </div>`).join('')}
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
    cargosSectionHtml() +
    catalogSectionHtml('Cliente / Operación',
      'Opciones del desplegable "Cliente / Operación" de cada registro. También sirve como filtro en todas las secciones.',
      'clientes', (cat.clientes||[]).filter(c=>c)) +
    catalogSectionHtml('Tipo de capacitación',
      'Opciones del desplegable "Tipo de capacitación" (ej: HSQE, Operaciones, Salud). Se usa en la sección Capacitación y en su gráfico.',
      'tiposCapacitacion', (cat.tiposCapacitacion||[]).filter(c=>c)) +
    catalogSectionHtml('Tareas ISO/ISM (título)',
      'Opciones del desplegable "Título" en Tareas ISO/ISM (ej: Revisión del Sistema por la Compañía, Evaluación de Contexto, FODA, Plan Anual de Capacitación, Plan Anual de Zafarranchos).',
      'tareasIso', (cat.tareasIso||[]).filter(c=>c)) +
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
/* ============ CATÁLOGO DE PERSONAS (nombre + email) ============ */
function cargosSectionHtml(){
  const list = cargosList();
  const rows = list.length ? list.map((c,i)=>`
    <div style="display:grid;grid-template-columns:1.2fr 1.4fr auto;gap:8px;align-items:end;margin-bottom:6px;">
      <div class="field" style="margin-bottom:0;"><input type="text" value="${c.cargo.replace(/"/g,'&quot;')}" placeholder="Cargo" onchange="updateCargoField(${i},'cargo',this.value)"></div>
      <div class="field" style="margin-bottom:0;"><input type="email" value="${(c.email||'').replace(/"/g,'&quot;')}" placeholder="correo@cleansea.com.ar" onchange="updateCargoField(${i},'email',this.value)"></div>
      <button class="btn secondary" style="padding:6px 10px;color:var(--red);" onclick="removeCargo(${i})">✕</button>
    </div>`).join('') : '<div style="font-size:12px;color:var(--graphite-light);margin-bottom:6px;">Sin cargos cargados.</div>';
  return `<div class="section-title" style="margin-top:16px;">Cargos (Responsables · con correo)</div>
    <div style="font-size:11px;color:var(--graphite-light);margin:-4px 0 8px;">Cada cargo con su correo. Estos cargos son los que se eligen como Responsable en acciones y sugerencias; el correo se usa para notificar. También son las opciones del "Cargo" en investigadores.</div>
    <div style="display:grid;grid-template-columns:1.2fr 1.4fr auto;gap:8px;margin-bottom:4px;font-size:10px;color:var(--graphite-light);text-transform:uppercase;letter-spacing:0.04em;">
      <div>Cargo</div><div>Correo</div><div></div>
    </div>
    ${rows}
    <div style="display:grid;grid-template-columns:1.2fr 1.4fr auto;gap:8px;align-items:end;margin-top:4px;">
      <div class="field" style="margin-bottom:0;"><input type="text" id="newCargoNombre" placeholder="Cargo"></div>
      <div class="field" style="margin-bottom:0;"><input type="email" id="newCargoEmail" placeholder="correo@cleansea.com.ar"></div>
      <button class="btn" style="padding:6px 12px;" onclick="addCargo()">+ Agregar</button>
    </div>`;
}
async function updateCargoField(i, field, val){
  const arr = cargosList();
  if(!arr[i]) return;
  arr[i][field] = (val||'').trim();
  DATA.catalogos.cargos = arr;
  await saveData();
  showToast('Guardado');
}
async function addCargo(){
  const cargo = (document.getElementById('newCargoNombre').value||'').trim();
  const email = (document.getElementById('newCargoEmail').value||'').trim();
  if(!cargo){ showToast('Ingresá el cargo'); return; }
  if(cargosList().some(c=>c.cargo.toLowerCase()===cargo.toLowerCase())){ showToast('Ese cargo ya existe'); return; }
  const arr = cargosList();
  arr.push({ cargo, email });
  arr.sort((a,b)=>a.cargo.localeCompare(b.cargo,'es'));
  DATA.catalogos.cargos = arr;
  await saveData();
  renderCatalogManager();
  showToast('Cargo agregado');
}
async function removeCargo(i){
  const arr = cargosList();
  if(!arr[i]) return;
  if(!confirm(`¿Quitar el cargo "${arr[i].cargo}"?`)) return;
  arr.splice(i,1);
  DATA.catalogos.cargos = arr;
  await saveData();
  renderCatalogManager();
  showToast('Cargo quitado');
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
  const realIdx = (listKey === 'clasifOrigen' || listKey === 'tipificacionCausaRaiz' || listKey === 'tareasIso') ? idx + 1 : idx;
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

  if(currentTypeFilter === 'ACCIONES'){
    const site = currentSiteFilter;
    const filas = [];
    DATA.records.forEach(r=>{
      if(site!=='ALL' && r.instalacion!==site) return;
      const push=(a,t)=>{ if(a&&(a.descripcion||'').trim() && !esCerrado(a.estado)) filas.push({cod:codigoMostrado(r),t,desc:a.descripcion,resp:a.responsable||'—',venc:a.vencimiento||'',estado:a.estado||'—'}); };
      (r.acciones_correctivas||[]).forEach(a=>push(a,'Correctiva'));
      (r.acciones_preventivas||[]).forEach(a=>push(a,'Preventiva'));
    });
    filas.sort((a,b)=>(a.venc||'9999-99-99').localeCompare(b.venc||'9999-99-99'));
    const hoy = todayISO();
    const th = (t) => `<th style="border:1px solid #DBE0E6;padding:5px 7px;background:#F2F5F8;text-align:left;">${t}</th>`;
    const filasHtml = filas.map(f=>{
      const vencida = f.venc && f.venc<hoy;
      return `<tr>
        <td style="border:1px solid #DBE0E6;padding:5px 7px;font-family:'IBM Plex Mono',monospace;font-size:8.5pt;">${f.cod}</td>
        <td style="border:1px solid #DBE0E6;padding:5px 7px;">${f.t}</td>
        <td style="border:1px solid #DBE0E6;padding:5px 7px;">${f.desc||'—'}</td>
        <td style="border:1px solid #DBE0E6;padding:5px 7px;">${f.resp}</td>
        <td style="border:1px solid #DBE0E6;padding:5px 7px;white-space:nowrap;color:${vencida?'#C0392B':'#333'};">${vencida?'⚠ ':''}${f.venc?fmtDate(f.venc):'—'}</td>
        <td style="border:1px solid #DBE0E6;padding:5px 7px;">${f.estado}</td>
      </tr>`;
    }).join('');
    container.innerHTML = `<div class="pr-record">
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
        <tr>
          <td style="width:70%;vertical-align:middle;border-bottom:3px solid #1C3666;padding-bottom:8px;">
            <div class="pr-title">INTEGRA · MÓDULO HSQE — PLAN DE ACCIONES <span style="font-style:italic;color:#9AA6B2;font-weight:normal;font-size:13px;">· Action plan</span></div>
            <div class="pr-sub">${co?co.name:''}${currentSiteFilter!=='ALL' ? ' — '+currentSiteFilter : ''} · ${filas.length} acción(es) · Generado el ${fechaHora}</div>
          </td>
          <td style="width:30%;text-align:right;">${logo?`<img src="${logo}" style="max-height:60px;max-width:160px;">`:''}</td>
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:9pt;">
        <tr>${th('Registro')}${th('Tipo')}${th('Descripción')}${th('Responsable')}${th('Vencimiento')}${th('Estado')}</tr>
        ${filasHtml || '<tr><td colspan="6" style="border:1px solid #DBE0E6;padding:12px;text-align:center;color:#8B96A1;">Sin acciones cargadas.</td></tr>'}
      </table>
    </div>`;
    const imgs = Array.from(container.querySelectorAll('img'));
    try{ await Promise.all(imgs.map(img => (img.complete && img.naturalWidth>0) ? Promise.resolve() : (img.decode ? img.decode().catch(()=>{}) : new Promise(res=>{img.onload=res;img.onerror=res;})))); }catch(e){}
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    let orient = document.getElementById('__pageOrient');
    if(!orient){ orient = document.createElement('style'); orient.id='__pageOrient'; document.head.appendChild(orient); }
    orient.textContent = '@page{ size: A4 landscape; margin: 14mm 12mm; }';
    window.print();
    return;
  }

  if(currentTypeFilter === 'PROGRAMADOS'){
    const site = currentSiteFilter;
    const list = DATA.records.filter(r => r.tipo === 'PROG' && !esCerrado(r.estado) && (site==='ALL' || r.instalacion===site));
    list.sort((a,b) => (a.fecha_vencimiento||'9999-99-99').localeCompare(b.fecha_vencimiento||'9999-99-99'));
    const th = (t) => `<th style="border:1px solid #DBE0E6;padding:5px 7px;background:#F2F5F8;text-align:left;">${t}</th>`;
    const filasHtml = list.map(r=>{
      const vencido = isOverdue(r);
      const estadoTxt = vencido ? 'Vencido' : (isDueSoon(r) ? 'Por vencer' : 'En plazo');
      const origen = DATA.records.find(x=>x.id===r.origen_registro_id);
      const origenTxt = origen ? `${TYPES[origen.tipo] ? TYPES[origen.tipo].label : origen.tipo} ${codigoMostrado(origen)}` : (r.origen_registro_tipo||'—');
      return `<tr>
        <td style="border:1px solid #DBE0E6;padding:5px 7px;font-family:'IBM Plex Mono',monospace;font-size:8.5pt;">${codigoMostrado(r)}</td>
        <td style="border:1px solid #DBE0E6;padding:5px 7px;">${r.titulo||'—'}</td>
        <td style="border:1px solid #DBE0E6;padding:5px 7px;">${origenTxt}</td>
        <td style="border:1px solid #DBE0E6;padding:5px 7px;">${r.instalacion||'—'}</td>
        <td style="border:1px solid #DBE0E6;padding:5px 7px;">${recurrenciaLabel(r.prog_recurrencia)}</td>
        <td style="border:1px solid #DBE0E6;padding:5px 7px;">${r.responsable||'—'}</td>
        <td style="border:1px solid #DBE0E6;padding:5px 7px;white-space:nowrap;color:${vencido?'#C0392B':'#333'};">${vencido?'⚠ ':''}${r.fecha_vencimiento?fmtDate(r.fecha_vencimiento):'—'}</td>
        <td style="border:1px solid #DBE0E6;padding:5px 7px;">${estadoTxt}</td>
      </tr>`;
    }).join('');
    container.innerHTML = `<div class="pr-record">
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
        <tr>
          <td style="width:70%;vertical-align:middle;border-bottom:3px solid #1C3666;padding-bottom:8px;">
            <div class="pr-title">INTEGRA · MÓDULO HSQE — PROGRAMADOS</div>
            <div class="pr-sub">${co?co.name:''}${currentSiteFilter!=='ALL' ? ' — '+currentSiteFilter : ''} · ${list.length} pendiente(s) · Generado el ${fechaHora}</div>
          </td>
          <td style="width:30%;text-align:right;">${logo?`<img src="${logo}" style="max-height:60px;max-width:160px;">`:''}</td>
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:9pt;">
        <tr>${th('ID')}${th('Título')}${th('Registro madre')}${th('Sitio')}${th('Recurrencia')}${th('Responsable')}${th('Vencimiento')}${th('Estado')}</tr>
        ${filasHtml || '<tr><td colspan="8" style="border:1px solid #DBE0E6;padding:12px;text-align:center;color:#8B96A1;">Sin Programados pendientes.</td></tr>'}
      </table>
    </div>`;
    const imgs = Array.from(container.querySelectorAll('img'));
    try{ await Promise.all(imgs.map(img => (img.complete && img.naturalWidth>0) ? Promise.resolve() : (img.decode ? img.decode().catch(()=>{}) : new Promise(res=>{img.onload=res;img.onerror=res;})))); }catch(e){}
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    let orient = document.getElementById('__pageOrient');
    if(!orient){ orient = document.createElement('style'); orient.id='__pageOrient'; document.head.appendChild(orient); }
    orient.textContent = '@page{ size: A4 landscape; margin: 14mm 12mm; }';
    window.print();
    return;
  }

  const kpiMode = currentTypeFilter === 'KPI';
  const scopeLabel = kpiMode ? 'KPI HSQE' : document.getElementById('chartsSectionLabel').textContent;
  const scoreEl = document.getElementById('scoreCardTable');
  const scoreHtml = (kpiMode && scoreEl)
    ? `<div style="margin-top:18px;"><h3 style="font-family:'IBM Plex Sans';font-size:16px;color:#1C3666;border-bottom:2px solid #0A3A66;padding-bottom:4px;">Score Card</h3>${scoreEl.outerHTML}</div>`
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
        <h3 style="font-family:'IBM Plex Sans';font-size:16px;color:#1C3666;border-bottom:2px solid #0A3A66;padding-bottom:4px;">KPI OCIMF — Frecuencia de Lesiones (${fmtDate(desde)} a ${fmtDate(hasta)})</h3>
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
        <h3 style="font-family:'IBM Plex Sans';font-size:16px;color:#1C3666;border-bottom:2px solid #0A3A66;padding-bottom:4px;">KPI — No Conformidades en Auditorías ISM / ISO (${fmtDate(auditDesde)} a ${fmtDate(auditHasta)})</h3>
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
    chartsHtml = `<div class="chart-row${currentTypeFilter === 'ALL' ? ' charts-all' : ''}">`;
    chartDefs.forEach(cd=>{
      const canvasEl = document.getElementById(cd.canvas);
      const title = document.getElementById(cd.titleEl).textContent;
      if(!canvasEl || !cd.obj) return;
      const img = canvasEl.toDataURL('image/png', 1.0);
      chartsHtml += `<div class="chart-card"><h3>${bilingual(title)}</h3><img src="${img}" style="width:100%;"></div>`;
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
  // Traducción bilingüe de KPIs y encabezados de tabla (solo para el printable)
  let kpiHtmlBil = kpiHtml;
  const KPI_TR = {'Registros totales':'Total records','Abiertas / en curso':'Open / in progress','Acciones vencidas':'Overdue actions','Acciones por vencer (30 días)':'Actions due (30 days)'};
  Object.keys(KPI_TR).forEach(es=>{ kpiHtmlBil = kpiHtmlBil.split(es).join(`${es} <span style="font-style:italic;color:#9AA6B2;font-weight:normal;">${KPI_TR[es]}</span>`); });
  const TH_TR = {'Tipo':'Type','Instalación':'Site','Fecha':'Date','Título':'Title','Estado':'Status','Vencimiento':'Due date','Responsable':'Responsible','Adj.':'Att.'};
  Object.keys(TH_TR).forEach(es=>{ tableHtml = tableHtml.replace(new RegExp('<th([^>]*)>\\s*'+es+'\\s*</th>','g'), `<th$1>${es} <span style="font-style:italic;color:#9AA6B2;font-weight:normal;">${TH_TR[es]}</span></th>`); });

  container.innerHTML = `<div class="pr-record">
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
      <tr>
        <td style="width:70%;vertical-align:middle;border-bottom:3px solid #1C3666;padding-bottom:8px;">
          <div class="pr-title">INTEGRA · MÓDULO HSQE — ${kpiMode ? 'KPI HSQE' : bilingual('GRÁFICOS')}</div>
          <div class="pr-sub">${scopeLabel} · ${co?co.name:''}${currentSiteFilter!=='ALL' ? ' — '+currentSiteFilter : ''} · Generado el ${fechaHora}</div>
        </td>
        <td style="width:30%;text-align:right;">${logo?`<img src="${logo}" style="max-height:60px;max-width:160px;">`:''}</td>
      </tr>
    </table>
    ${currentClienteFilter!=='ALL' ? `<div style="background:#EAF1F8;border-left:4px solid #1C3666;padding:9px 14px;margin-bottom:14px;">
      <div style="font-family:'IBM Plex Sans';font-size:15px;font-weight:700;color:#1C3666;letter-spacing:0.02em;">${currentClienteFilter==='No Asignado a Cliente' ? 'Registros sin cliente / operación asignado' : 'Registros durante la operación: '+currentClienteFilter}
        <span style="font-style:italic;font-weight:400;color:#9AA6B2;font-size:12px;">· ${currentClienteFilter==='No Asignado a Cliente' ? 'Records with no client / operation assigned' : 'Records for operation: '+currentClienteFilter}</span></div>
    </div>` : ''}
    ${kpiHtmlBil}
    ${chartsHtml}
    ${ocimfHtml}
    ${auditNcHtml}
    ${scoreHtml}
    ${kpiMode ? '' : `<div class="pr-registros">
      <h3 style="font-family:'IBM Plex Sans';font-size:16px;color:#1C3666;border-bottom:2px solid #0A3A66;padding-bottom:4px;">${bilingual(`Registros incluidos`)}</h3>
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
  // Portada/gráficos: imprimir en horizontal (A4 landscape) para leer mejor la tabla.
  let orient = document.getElementById('__pageOrient');
  if(!orient){ orient = document.createElement('style'); orient.id = '__pageOrient'; document.head.appendChild(orient); }
  orient.textContent = '@page{ size: A4 landscape; margin: 16mm 12mm; }';
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
        <td style="width:70%;vertical-align:middle;border-bottom:3px solid #1C3666;padding-bottom:8px;">
          <div class="pr-title">INTEGRA · MÓDULO HSQE — ${tituloAlcance}</div>
          <div class="pr-sub">Generado el ${fechaHora}</div>
        </td>
        <td style="width:30%;text-align:right;border-bottom:3px solid #1C3666;padding-bottom:8px;">
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
      <div style="font-family:'IBM Plex Mono';font-size:10px;color:var(--graphite-light);margin-bottom:4px;">INTEGRA · Módulo HSQE — Generado el ${fechaHora}</div>
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
          <td>${codigoMostrado(r)}</td>
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
window.addEventListener('afterprint', ()=>{ document.getElementById('printReport').innerHTML = ''; const o = document.getElementById('__pageOrient'); if(o) o.remove(); });

/* ============ IMPRESIÓN DE REGISTRO INDIVIDUAL ============ */
// Convierte el logo a base64 para incrustarlo dentro del .doc (autocontenido).
// Los logos subidos por el usuario ya vienen como data URI; los logos por
// defecto (/brand/CleanSea_Color.png) se descargan y se convierten al vuelo.
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
  const NAVY='#1C3666', ORANGE='#0A3A66', GRAPH='#5B6671', LINE='#DBE0E6';

  const metaRow = (a,b) => `<tr>
    <td style="border:1px solid ${LINE};padding:6px 10px;width:33%;"><div style="font-size:8pt;text-transform:uppercase;color:${GRAPH};letter-spacing:0.5pt;">${bilingual(a.l)}</div><div style="font-size:10.5pt;color:${NAVY};font-weight:bold;">${a.v}</div></td>
    <td style="border:1px solid ${LINE};padding:6px 10px;width:33%;"><div style="font-size:8pt;text-transform:uppercase;color:${GRAPH};letter-spacing:0.5pt;">${bilingual(b.l)}</div><div style="font-size:10.5pt;color:${NAVY};font-weight:bold;">${b.v}</div></td>
  </tr>`;

  const resumenMeta = accionesResumen(r);

  // Tabla de datos: la severidad solo aparece en los tipos que la usan.
  const metaCells = [
    {l:'Cliente / Operación', v:r.cliente_operacion||'—'},
    {l:'Instalación / Área', v:(r.instalacion||'—')+(r.area?' · '+r.area:'')},
    {l:'Fecha '+tipoDescriptor(r.tipo), v:fmtDate(r.fecha)},
  ];
  if(r.tipo==='CAP'){
    metaCells.push({l:'Tipo de capacitación', v:r.cap_tipo||'—'});
    metaCells.push({l:'Instructor', v:(r.cap_instructor_nombre||'—')+(r.cap_instructor_cargo?' · '+r.cap_instructor_cargo:'')});
    metaCells.push({l:'Duración', v:r.cap_duracion||'—'});
    metaCells.push({l:'Parte del plan anual', v:r.cap_plan_anual||'—'});
  } else if(r.tipo==='AUD'){
    metaCells.push({l:'Interna / Externa', v:r.aud_alcance||'—'});
    metaCells.push({l:'Norma / Tipo', v:r.aud_norma||'—'});
    metaCells.push({l:'Auditor', v:r.aud_auditor||'—'});
    metaCells.push({l:'Recurrencia', v:recurrenciaLabel(r.aud_recurrencia)});
    metaCells.push({l:'Estado actual', v:r.estado||'—'});
  } else if(r.tipo==='INSP'){
    metaCells.push({l:'Interna / Externa', v:r.insp_alcance||'—'});
    metaCells.push({l:'Tipo', v:r.insp_tipo||'—'});
    metaCells.push({l:'Inspector', v:r.insp_inspector||'—'});
    metaCells.push({l:'Estado actual', v:r.estado||'—'});
  } else if(r.tipo==='RP'){
    metaCells.push({l:'¿Informado a las gerencias?', v:r.rp_informado||'—'});
    metaCells.push({l:'Fecha de información a gerencias', v:r.rp_fecha_informado?fmtDate(r.rp_fecha_informado):'—'});
    metaCells.push({l:'Estado actual', v:r.estado||'—'});
    metaCells.push({l:'Reportado por', v:r.reportado_por||'—'});
    metaCells.push({l:'Fecha de cierre', v:fmtDate(r.fecha_cierre)});
  } else {
    if(TIPOS_CON_SEVERIDAD.includes(r.tipo)) metaCells.push({l:'Severidad', v:r.severidad||'—'});
    else if(r.tipo==='SUG'){
      metaCells.push({l:'¿Se llevará a cabo?', v:r.sug_realiza||'—'});
      metaCells.push({l:'Área responsable', v:r.sug_area||'—'});
    }
    metaCells.push({l:'Estado actual', v:r.estado||'—'});
    metaCells.push({l:'Responsable', v:resumenMeta.responsable});
    metaCells.push({l:'Reportado por', v:r.reportado_por||'—'});
    metaCells.push({l:'Fecha de vencimiento', v:(resumenMeta.vencimiento?fmtDate(resumenMeta.vencimiento):'—')+(isOverdue(r)?' ⚠ VENCIDA':'')});
    metaCells.push({l:'Fecha de cierre', v:fmtDate(r.fecha_cierre)});
    if(r.tipo==='TISO') metaCells.push({l:'Recurrencia', v:recurrenciaLabel(r.tiso_recurrencia)});
    if(r.tipo==='PROG') metaCells.push({l:'Recurrencia', v:recurrenciaLabel(r.prog_recurrencia)});
    if(r.tipo!=='SUG') metaCells.push({l:'Referencia normativa', v:r.referencia_normativa||'—'});
  }
  let metaTableHtml = '<table style="width:100%;border-collapse:collapse;margin-bottom:14px;">';
  for(let i=0;i<metaCells.length;i+=2){ metaTableHtml += metaRow(metaCells[i], metaCells[i+1] || {l:'',v:''}); }
  metaTableHtml += '</table>';

  let body = `
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
      <tr>
        <td style="width:70%;vertical-align:middle;border-bottom:3px solid ${NAVY};padding-bottom:8px;">
          <div style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:18pt;font-weight:bold;color:${NAVY};letter-spacing:1pt;">INTEGRA · MÓDULO HSQE</div>
          <div style="font-size:8.5pt;color:${GRAPH};font-family:'IBM Plex Mono',monospace;margin-top:2px;">Generado el ${fechaHora}</div>
        </td>
        <td style="width:30%;text-align:right;vertical-align:middle;border-bottom:3px solid ${NAVY};padding-bottom:8px;">
          ${logo ? `<img src="${logo}" style="max-height:60px;max-width:160px;">` : ''}
        </td>
      </tr>
    </table>

    <p style="margin:0 0 10px;">
      <span style="background:${tipoInfo.color};color:#fff;font-weight:bold;padding:3px 12px;border-radius:3px;font-size:10pt;">${tipoInfo.label}</span>
      <span style="font-style:italic;color:${GRAPH};font-size:9pt;">${EN[tipoInfo.label]||''}</span>
      &nbsp;&nbsp;<span style="font-family:'IBM Plex Mono',monospace;font-size:10.5pt;color:${GRAPH};">${codigoMostrado(r)}</span>
    </p>
    ${r.titulo ? `<div style="font-family:'IBM Plex Sans',Arial;font-size:15pt;font-weight:bold;color:${NAVY};margin:0 0 12px;">${r.titulo}</div>` : ''}

    ${metaTableHtml}

    `;

  const secH3 = t => `<h3 style="font-family:'IBM Plex Sans',Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">${bilingual(`${t}`)}</h3>`;
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
  body += secH3('Descripción ' + tipoDescriptor(r.tipo));
  body += r.tipo==='INC'
    ? INC_PREGUNTAS.map((q,i)=>{ const a = (r.inc_descripcion && r.inc_descripcion['q'+(i+1)]) ? r.inc_descripcion['q'+(i+1)] : ''; return `<p style="font-size:10.5pt;line-height:1.45;margin:0 0 7px;"><b>${i+1}. ${q}</b><br>${a || '—'}</p>`; }).join('')
    : `<p style="font-size:10.5pt;line-height:1.5;">${r.descripcion||'—'}</p>`;

  if(r.tipo==='SUG'){
    if(r.sug_observacion){
      body += secH3('Observación del seguimiento');
      body += `<p style="font-size:10.5pt;line-height:1.5;">${r.sug_observacion}</p>`;
    }
  }

  if(r.tipo==='CAP'){
    body += secH3('Evaluación de la capacitación');
    body += `<p style="font-size:10.5pt;margin:0 0 4px;"><b>¿Fue efectiva?:</b> ${r.cap_efectiva||'—'} &nbsp;·&nbsp; <b>¿Evaluación / actividad posterior?:</b> ${r.cap_evaluacion||'—'}</p>`;
    if(r.cap_evaluacion_detalle) body += `<p style="font-size:10.5pt;line-height:1.5;">${r.cap_evaluacion_detalle}</p>`;
    const parts = Array.isArray(r.cap_participantes) ? r.cap_participantes : [];
    body += secH3('Participantes');
    if(parts.length){
      body += `<table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:10pt;">
        <tr><th style="text-align:left;border:1px solid ${LINE};padding:5px 8px;background:#F2F5F8;width:38%;">${bilingual('Nombre y apellido')}</th><th style="text-align:left;border:1px solid ${LINE};padding:5px 8px;background:#F2F5F8;width:27%;">${bilingual('Cargo')}</th><th style="text-align:left;border:1px solid ${LINE};padding:5px 8px;background:#F2F5F8;width:35%;">${bilingual('Firma')}</th></tr>
        ${parts.map(p=>`<tr><td style="border:1px solid ${LINE};padding:8px;">${p.nombre||'—'}</td><td style="border:1px solid ${LINE};padding:8px;">${p.cargo||'—'}</td><td style="border:1px solid ${LINE};padding:8px;height:34px;"></td></tr>`).join('')}
      </table>`;
    } else {
      body += `<p style="font-size:10.5pt;">Sin participantes cargados.</p>`;
    }
    body += `<div style="margin-top:30px;width:55%;">
      <div style="height:34px;"></div>
      <div style="border-top:1px solid ${NAVY};padding-top:4px;">
        <div style="font-size:9pt;color:${GRAPH};text-transform:uppercase;letter-spacing:0.5pt;">Firma del instructor <span style="font-style:italic;text-transform:none;color:#9AA6B2;">· Instructor's signature</span></div>
        <div style="font-size:10.5pt;color:${NAVY};margin-top:2px;">${r.cap_instructor_nombre||''}${r.cap_instructor_cargo?' — '+r.cap_instructor_cargo:''}</div>
      </div>
    </div>`;
  }

  if(r.tipo==='AUD'){
    const halls = Array.isArray(r.hallazgos) ? r.hallazgos.filter(h=>(h.descripcion||'').trim()) : [];
    const nombreTipoH = { OBS:'Observación', NC:'No Conformidad', OM:'Oportunidad de Mejora' };
    body += secH3('Hallazgos');
    if(halls.length){
      body += `<table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:10pt;">
        <tr><th style="text-align:left;border:1px solid ${LINE};padding:5px 8px;background:#F2F5F8;width:16%;">${bilingual('Tipo')}</th><th style="text-align:left;border:1px solid ${LINE};padding:5px 8px;background:#F2F5F8;width:44%;">Descripción <span style="font-style:italic;color:#9AA6B2;font-weight:400;">· Description</span></th><th style="text-align:left;border:1px solid ${LINE};padding:5px 8px;background:#F2F5F8;width:22%;">${bilingual('Responsable')}</th><th style="text-align:left;border:1px solid ${LINE};padding:5px 8px;background:#F2F5F8;width:18%;">Registro <span style="font-style:italic;color:#9AA6B2;font-weight:400;">· Record</span></th></tr>
        ${halls.map(h=>`<tr><td style="border:1px solid ${LINE};padding:6px 8px;">${nombreTipoH[h.tipo]||h.tipo||'—'}</td><td style="border:1px solid ${LINE};padding:6px 8px;">${h.descripcion||'—'}</td><td style="border:1px solid ${LINE};padding:6px 8px;">${h.responsable||'—'}</td><td style="border:1px solid ${LINE};padding:6px 8px;font-family:'IBM Plex Mono',monospace;font-size:9pt;">${h.rec_id ? codigoMostrado(DATA.records.find(x=>x.id===h.rec_id)||{tipo:h.tipo,fecha:r.fecha,id:h.rec_id}) : '—'}</td></tr>`).join('')}
      </table>`;
    } else {
      body += `<p style="font-size:10.5pt;">Sin hallazgos cargados.</p>`;
    }
  }

  if(r.tipo==='INSP'){
    const obs = Array.isArray(r.observaciones) ? r.observaciones.filter(o=>(o.descripcion||'').trim()) : [];
    const nombreTipoH2 = { OBS:'Observación', NC:'No Conformidad', OM:'Oportunidad de Mejora' };
    body += secH3('Hallazgos');
    if(obs.length){
      body += `<table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:9pt;">
        <tr>
          <th style="text-align:left;border:1px solid ${LINE};padding:5px 6px;background:#F2F5F8;width:4%;">N°</th>
          <th style="text-align:left;border:1px solid ${LINE};padding:5px 6px;background:#F2F5F8;width:27%;">Hallazgo <span style="font-style:italic;color:#9AA6B2;font-weight:400;">· Finding</span></th>
          <th style="text-align:left;border:1px solid ${LINE};padding:5px 6px;background:#F2F5F8;width:24%;">Comentario del Operador</th>
          <th style="text-align:left;border:1px solid ${LINE};padding:5px 6px;background:#F2F5F8;width:14%;">${bilingual('Responsable')}</th>
          <th style="text-align:left;border:1px solid ${LINE};padding:5px 6px;background:#F2F5F8;width:11%;">Vencim.</th>
          <th style="text-align:left;border:1px solid ${LINE};padding:5px 6px;background:#F2F5F8;width:9%;">${bilingual('Estado')}</th>
          <th style="text-align:left;border:1px solid ${LINE};padding:5px 6px;background:#F2F5F8;width:11%;">Registro <span style="font-style:italic;color:#9AA6B2;font-weight:400;">· Record</span></th>
        </tr>
        ${obs.map((o,idx)=>{
          const hijo = o.rec_id ? DATA.records.find(x=>x.id===o.rec_id) : null;
          const codReg = o.rec_id ? codigoMostrado(hijo||{tipo:o.tipo,fecha:r.fecha,id:o.rec_id}) : '—';
          return `<tr>
            <td style="border:1px solid ${LINE};padding:5px 6px;">${idx+1}</td>
            <td style="border:1px solid ${LINE};padding:5px 6px;">${o.descripcion||'—'}</td>
            <td style="border:1px solid ${LINE};padding:5px 6px;">${o.comentario_operador||'—'}</td>
            <td style="border:1px solid ${LINE};padding:5px 6px;">${o.responsable||'—'}</td>
            <td style="border:1px solid ${LINE};padding:5px 6px;white-space:nowrap;">${o.vencimiento?fmtDate(o.vencimiento):'—'}</td>
            <td style="border:1px solid ${LINE};padding:5px 6px;">${o.estado||'—'}</td>
            <td style="border:1px solid ${LINE};padding:5px 6px;font-family:'IBM Plex Mono',monospace;font-size:8pt;">${codReg}</td>
          </tr>`;
        }).join('')}
      </table>`;
    } else {
      body += `<p style="font-size:10.5pt;">Sin hallazgos cargados.</p>`;
    }
  }

  if(TIPOS_CON_OCIMF.includes(r.tipo) && r.clasificacion){
    body += `<h3 style="font-family:'IBM Plex Sans',Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">${bilingual(`Clasificación OCIMF/TMSA`)}</h3><p style="font-size:10.5pt;">${r.clasificacion}${r.incluir_kpi?' <i>(incluido en KPI OCIMF)</i>':''}</p>`;
  }
  if(r.tipo==='CUA' && (r.naturaleza_cuasi || r.dano_material_potencial)){
    body += `<h3 style="font-family:'IBM Plex Sans',Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">${bilingual(`Detalle del Cuasi Accidente`)}</h3>
      <p style="font-size:10.5pt;"><b>Naturaleza:</b> ${r.naturaleza_cuasi||'—'}</p>
      ${r.dano_material_potencial?`<p style="font-size:10.5pt;"><b>Daño material potencial:</b> ${r.dano_material_potencial}</p>`:''}`;
  }
  if(r.parte_cuerpo || r.tipo_lesion){
    body += `<h3 style="font-family:'IBM Plex Sans',Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">${bilingual(`Datos de la Lesión`)}</h3>
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
    body += `<h3 style="font-family:'IBM Plex Sans',Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">${bilingual(`Consideraciones del Evento`)}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:6px;">` +
      consideraciones.map(c=>`<tr>
        <td style="border:1px solid ${LINE};padding:5px 9px;">${c[0]}</td>
        <td style="border:1px solid ${LINE};padding:5px 9px;text-align:center;font-weight:bold;width:60px;">${c[1]||'—'}</td>
      </tr>`).join('') + `</table>`;
  }
  if((r.tipo==='AI' || r.tipo==='CI' || r.tipo==='INC') && r.categoria_evento){
    const tituloCat = r.tipo === 'INC' ? 'Tipificación' : 'Categorización';
    body += `<h3 style="font-family:'IBM Plex Sans',Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">${bilingual(`${tituloCat}`)}</h3>
      <p style="font-size:10.5pt;">${r.categoria_evento}${r.categoria_evento==='Otros' && r.categoria_otro_detalle ? ' — '+r.categoria_otro_detalle : ''}</p>`;
  }
  if(TIPOS_CON_CLASIF_ORIGEN.includes(r.tipo) && r.clasificacion_origen){
    body += `<h3 style="font-family:'IBM Plex Sans',Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">${bilingual(`Clasificación`)}</h3><p style="font-size:10.5pt;">${r.clasificacion_origen}</p>`;
    if(r.tipo === 'NC' && (r.tipo_auditoria || r.ambito_auditoria)){
      body += `<p style="font-size:10.5pt;"><b>Origen de auditoría:</b> ${r.tipo_auditoria||'—'} · ${r.ambito_auditoria||'—'}</p>`;
    }
  }
  if(!TIPOS_SIN_CAUSA_ACCION.includes(r.tipo) && (r.causa_raiz || r.tipificacion_causa || (r.acciones_correctivas||[]).length || (r.acciones_preventivas||[]).length)){
    body += `<h3 style="font-family:'IBM Plex Sans',Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">${bilingual(`Análisis y Acción`)}</h3>
      ${r.tipificacion_causa?`<p style="font-size:10.5pt;"><b>Tipificación de la causa raíz:</b> ${r.tipificacion_causa}${r.tipificacion_causa==='Otros' && r.tipificacion_causa_otro ? ' — '+r.tipificacion_causa_otro : ''}</p>`:''}
      ${r.causa_raiz?`<p style="font-size:10.5pt;"><b>Descripción de causas:</b> ${r.causa_raiz}</p>`:''}`;
    const accionRow = (titulo, lista) => {
      if(!lista || lista.length===0) return `<p style="font-size:10.5pt;"><b>${bilingual(titulo)}:</b> sin acciones cargadas.</p>`;
      return `<p style="font-size:10.5pt;margin-bottom:2px;"><b>${bilingual(titulo)}:</b></p>` + lista.map((a,i)=>
        `<p style="font-size:10pt;margin:0 0 6px 12px;">${i+1}. ${a.descripcion||'—'} <br>
          <span style="font-size:9pt;color:${GRAPH};">Responsable: ${a.responsable||'—'} · Vencimiento: ${fmtDate(a.vencimiento)} · Estado: ${a.estado||'—'}${a.estado==='Cerrado' && a.fecha_cierre ? ' · Cierre: '+fmtDate(a.fecha_cierre) : ''}</span>
        </p>`).join('');
    };
    body += accionRow('Acciones Correctivas', r.acciones_correctivas);
    body += accionRow('Acciones Preventivas', r.acciones_preventivas);
  }
  if(TIPOS_SIN_CAUSA_ACCION.includes(r.tipo) && (r.comunicar_a || r.medio_comunicacion || r.plazo_comunicacion)){
    body += `<h3 style="font-family:'IBM Plex Sans',Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">${bilingual(`Comunicación`)}</h3>
      <p style="font-size:10.5pt;"><b>A quién comunicar:</b> ${r.comunicar_a||'—'}</p>
      <p style="font-size:10.5pt;"><b>Medio:</b> ${r.medio_comunicacion||'—'} &nbsp;·&nbsp; <b>Plazo:</b> ${r.plazo_comunicacion||'—'}</p>`;
  }
  if(Array.isArray(r.lecciones_aprendidas) && r.lecciones_aprendidas.length>0){
    body += `<h3 style="font-family:'IBM Plex Sans',Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">${bilingual(`Lecciones Aprendidas`)}</h3>` +
      r.lecciones_aprendidas.map(l=>`<p style="font-size:10.5pt;">💡 ${l.texto}${l.la_id?` <span style="font-family:'IBM Plex Mono',monospace;font-size:9pt;color:${GRAPH};">(${l.la_id})</span>`:''}</p>`).join('');
  }
  if(Array.isArray(r.adjuntos) && r.adjuntos.length>0){
    // Listado resumen dentro del reporte (los archivos se incrustan luego como páginas de anexo)
    body += `<h3 style="font-family:'IBM Plex Sans',Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">${bilingual(`Anexos al reporte`)}</h3>` +
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
// los PDF adjuntos (sus páginas se copian tal cual). Arma el PDF completo y devuelve sus bytes;
// usado por previewRecordPDF para mostrarlo en una pestaña nueva (desde ahí se imprime o se guarda,
// con el propio visor de PDF del navegador).
async function buildRecordPdf(id){
  const doc = await composeRecordBody(id);
  if(!doc) return null;
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
            const topLimite = A4[1] - 92;              // debajo del título y la línea del encabezado
            const areaH = topLimite - M;               // alto disponible hasta el margen inferior
            const maxW = A4[0] - M*2;
            const s = Math.min(maxW / img.width, areaH / img.height, 1);
            const w = img.width * s, h = img.height * s;
            const x = (A4[0] - w) / 2;                  // centrado horizontal
            const y = M + (areaH - h) / 2;             // centrado vertical en el área disponible
            pg.drawImage(img, { x, y, width:w, height:h });
          } else {
            drawAnexoHeader(outDoc.addPage(A4), helv, i+1, a.nombre, 'Formato no soportado como anexo (solo PDF, JPG o PNG).');
          }
        }catch(e){
          drawAnexoHeader(outDoc.addPage(A4), helv, i+1, a.nombre, 'No se pudo incrustar el anexo (' + ((e&&e.message)||'error') + ').');
        }
      }
    }

    // 4) Nombre por defecto = código del reporte + instalación (ej: "ACC-001-2026 Base Operativa")
    const nombreArchivo = `${codigoMostrado(r)}${r.instalacion ? ' ' + r.instalacion : ''}`.trim();
    outDoc.setTitle(nombreArchivo);      // el navegador lo usa como nombre por defecto al guardar
    outDoc.setSubject('Reporte HSQE - Integra');

    const outBytes = await outDoc.save();
    return { r, bytes: outBytes, nombreArchivo, tieneAnexos: adj.length > 0 };
  }catch(e){
    console.error('Error generando PDF:', e);
    showToast('Error al generar el PDF: ' + ((e && e.message) || e));
    if(holder) holder.remove();
    return null;
  }
}

// Previsualizar / Imprimir: abre el PDF en una pestaña nueva con el visor nativo del navegador —
// desde ahí el usuario imprime o guarda con los propios controles del visor.
// La pestaña se abre ANTES de generar el PDF (todavía dentro del gesto de clic del usuario) y recién
// después se navega al archivo — si se abriera con window.open() luego del await, el navegador la bloquea.
//
// El visor nativo de PDF de Chrome arma el nombre sugerido al descargar a partir de la URL del blob
// (un identificador al azar), no del nombre del archivo — por eso "guardar desde la previsualización"
// traía un nombre raro en vez del código del registro. Para garantizarlo se envuelve el PDF en una
// página HTML con un botón "Descargar" que usa <a download="..."> — ese atributo sí respeta el nombre
// siempre, en todos los navegadores.
function escapeHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
async function previewRecordPDF(id){
  const win = window.open('', '_blank');
  if(win){
    win.document.write('<title>Generando PDF…</title><body style="font-family:Arial,sans-serif;color:#5B6671;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">Generando la vista previa del PDF…</body>');
  }
  const built = await buildRecordPdf(id);
  if(!built){
    if(win) win.close();
    return;
  }
  if(!win){
    showToast('El navegador bloqueó la ventana de vista previa. Habilitá los pop-ups para este sitio e intentá de nuevo.');
    return;
  }
  const { bytes, nombreArchivo, tieneAnexos } = built;
  const fileName = `${nombreArchivo}.pdf`;
  const pdfBlob = new Blob([bytes], { type:'application/pdf' });
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const wrapperHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(nombreArchivo)}</title>
<style>
  html,body{margin:0;height:100%;font-family:Arial,Helvetica,sans-serif;}
  .bar{position:fixed;top:0;left:0;right:0;height:50px;background:#1C3666;display:flex;align-items:center;justify-content:space-between;padding:0 16px;z-index:10;box-sizing:border-box;}
  .bar .nombre{color:#fff;font-size:12.5px;opacity:0.85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:12px;}
  .bar a{color:#fff;background:#0A3A66;border:1px solid rgba(255,255,255,0.25);padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;white-space:nowrap;}
  .bar a:hover{background:#0F1F3D;}
  iframe{position:absolute;top:50px;left:0;right:0;bottom:0;width:100%;height:calc(100% - 50px);border:0;}
</style>
</head><body>
  <div class="bar"><span class="nombre">${escapeHtml(fileName)}</span><a href="${pdfUrl}" download="${escapeHtml(fileName)}">⬇ Descargar PDF</a></div>
  <iframe src="${pdfUrl}"></iframe>
</body></html>`;
  const wrapperUrl = URL.createObjectURL(new Blob([wrapperHtml], { type:'text/html' }));
  win.location.href = wrapperUrl;
  showToast('Abriendo vista previa del PDF' + (tieneAnexos ? ' (con anexos)' : ''));
  setTimeout(() => {
    try{ URL.revokeObjectURL(pdfUrl); }catch(e){}
    try{ URL.revokeObjectURL(wrapperUrl); }catch(e){}
  }, 300000);
}

/* ============ INIT ============ */
Object.assign(window, { addAccion, addAttachmentFile, addAttachmentManual, addCatalogItem, addDotacionMes, addInvestigador, addLeccion, addCapParticipante, addHallazgo, addObservacion, addVessel, addVisador, clearFilters, closeModal, deleteRecord, exportData, openAttachment, openCatalogManager, openRecordForm, openVisadoresManager, printChartsReport, printCompanyReport, removeAccion, removeAttachment, removeCatalogItem, removeDotacionMes, removeInvestigador, removeLeccion, removeCapParticipante, removeHallazgo, removeObservacion, removeVessel, removeVisador, renderAll, renderTopbar, topbarSearch, renderAuditNcKpi, renderOcimfKpi, renderScoreCard, setScoreCardYear, setScoreCardTarget, renderTable, saveRecord, setCompanyLogo, updateSitioTipo, setSiteFilter, setClienteFilter, setTypeFilter, toggleCategoriaOtro, toggleTipificacionCausaOtro, toggleVisado, updateAccionField, updateInvestigadorField, updateCapParticipanteField, updateHallazgoField, updateObservacionField, updateVesselOptions, updateCargoField, addCargo, removeCargo, validateEstadoCierre, refreshData, logoutHsqe, previewRecordPDF });

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
