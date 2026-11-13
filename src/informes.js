/* ============================================================================
   INFORMES — F5-001 Derrame · F5-002 Simulacro · F5-004 Salvamento
   ----------------------------------------------------------------------------
   Los informes se guardan en la misma tabla que el resto de los registros
   (hsqe_cs_registros, columna data JSON) con tipo IDER / ISIM / ISAL, y las
   fotos en el mismo bucket privado (hsqe-adjuntos-cleansea, carpeta informes/).
   No requiere cambios en la base de datos.
   Los tres tipos comparten exactamente el mismo contenido (estructura del
   informe F5-002 de referencia).
   ============================================================================ */

export const INFORME_TIPOS = ['IDER', 'ISIM', 'ISAL'];
export const INFORME_DEF = {
  IDER: { codigo: 'F5-001', label: 'Informe de Derrame',    corto: 'Derrame',    color: '#0E5A8A' },
  ISIM: { codigo: 'F5-002', label: 'Informe de Simulacro',  corto: 'Simulacro',  color: '#1E7A4A' },
  ISAL: { codigo: 'F5-004', label: 'Informe de Salvamento', corto: 'Salvamento', color: '#B5452B' },
};
export function esInforme(tipo){ return INFORME_TIPOS.includes(tipo); }

const BUCKET = 'hsqe-adjuntos-cleansea';
const FOTO_MAX_PX = 1800;          // lado mayor tras la compresión
const FOTO_MAX_BYTES = 1.9 * 1024 * 1024; // el bucket limita a 2 MB

const UM_OPCIONES = ['Unidad', 'Unidades', 'Metros', 'Litros', 'm³', 'Kg', 'Juego', 'Rollo', 'Bolsa', 'Horas'];
const ITEMS_EQUIPO = ['Embarcación', 'Vehículo', 'Barrera de contención', 'Barrera absorbente', 'Paño absorbente',
  'Rollo absorbente', 'Skimmer', 'Motobomba', 'Tanque de almacenamiento temporario', 'Mangueras', 'EPP descartable',
  'Dispersante', 'Generador', 'Hidrolavadora', 'Torre de iluminación', 'Ancla / Muerto', 'Estaca', 'Camilla de rescate',
  'Botiquín', 'Equipo de comunicación (VHF)'];
const CARGOS_INFORME = ['Responsable Operativo', 'Jefe de Operaciones', 'Supervisor', 'Logística', 'Patrón', 'Marinero',
  'Operador', 'Buzo', 'Responsable HSQE', 'Mecánico', 'Chofer'];

// Textos estándar que se precargan en un informe nuevo (editables).
const DEFAULTS = {
  estrategia_intro: 'La respuesta se organizó en las siguientes líneas de acción:',
  seguridad_embarcaciones: 'Las embarcaciones dispuestas se encuentran habilitadas por la Autoridad Marítima para desarrollar sus respectivas tareas. Cada una cuenta con los elementos y el armamento obligatorios, en cumplimiento de la normativa vigente.',
  seguridad_personal: 'El personal cuenta con los elementos de protección personal requeridos para la tarea que desempeña.',
  seguridad_capacitacion: 'El personal se encuentra capacitado en técnicas de control de derrames y cuenta con los cursos de seguridad correspondientes y con los exigidos por las empresas contratantes.',
  evaluacion_intro: 'Como resultado de la evaluación de la actuación se identificaron los siguientes puntos:',
};

// Listas editables: cada una define sus columnas.
const LISTAS = {
  objetivos:           { add: '+ Agregar objetivo',  cols: [{ k: 'texto', ph: 'Objetivo', type: 'textarea' }] },
  escenario:           { add: '+ Agregar punto',     cols: [{ k: 'titulo', ph: 'Título (ej: Evento inicial)', w: '220px' }, { k: 'descripcion', ph: 'Descripción', type: 'textarea' }] },
  estrategia:          { add: '+ Agregar línea de acción', cols: [{ k: 'titulo', ph: 'Línea de acción (ej: Contención primaria)', w: '220px' }, { k: 'descripcion', ph: 'Descripción', type: 'textarea' }] },
  actividades_previas: { add: '+ Agregar actividad', cols: [{ k: 'texto', ph: 'Actividad preparatoria' }] },
  cronologia:          { add: '+ Agregar hito',      cols: [{ k: 'hora', type: 'time', w: '110px' }, { k: 'titulo', ph: 'Título del hito', w: '220px' }, { k: 'descripcion', ph: 'Qué se hizo', type: 'textarea' }] },
  equipos:             { add: '+ Agregar equipo',    cols: [{ k: 'item', ph: 'Ítem', list: 'infItemsDL', w: '200px' }, { k: 'caracteristicas', ph: 'Características' }, { k: 'cantidad', ph: 'Cant.', type: 'number', w: '80px' }, { k: 'um', type: 'select', options: UM_OPCIONES, w: '120px' }] },
  personal:            { add: '+ Agregar persona',   cols: [{ k: 'cargo', ph: 'Cargo', list: 'infCargosDL', w: '190px' }, { k: 'nombre', ph: 'Nombre y apellido', list: 'personasDatalist' }, { k: 'inicio', type: 'date', w: '150px' }, { k: 'fin', type: 'date', w: '150px' }] },
  invitados:           { add: '+ Agregar invitado',  cols: [{ k: 'nombre', ph: 'Nombre y apellido' }, { k: 'funcion', ph: 'Función' }, { k: 'institucion', ph: 'Institución', list: 'infInstitucionesDL' }] },
  seguridad_lugar:     { add: '+ Agregar condición', cols: [{ k: 'texto', ph: 'Condición del lugar' }] },
  resultados:          { add: '+ Agregar resultado', cols: [{ k: 'texto', ph: 'Resultado', type: 'textarea' }] },
  evaluacion:          { add: '+ Agregar punto de evaluación', cols: [{ k: 'genera', type: 'genera', w: '230px' }, { k: 'texto', ph: 'Describí el punto observado', type: 'textarea' }] },
};

// Evaluación (11): cada ítem puede quedar solo como texto del informe o generar un registro
// para su seguimiento en la sección correspondiente del ERP.
const GENERA_OPCIONES = [
  { v: '',   l: 'Comentario (solo en el informe)' },
  { v: 'RP', l: 'Reporte Positivo' },
  { v: 'OM', l: 'Oportunidad de Mejora' },
  { v: 'LA', l: 'Lección Aprendida' },
];
// Agrupación en el informe impreso, según el tipo elegido en cada punto.
const EVAL_GRUPOS = [
  { v: 'RP', titulo: 'Aspectos positivos' },
  { v: 'OM', titulo: 'Oportunidades de mejora' },
  { v: 'LA', titulo: 'Lecciones aprendidas' },
  { v: '',   titulo: 'Otras observaciones' },
];
// Informes cargados con el formato anterior (11.1 Fortalezas / 11.2 Oportunidades de mejora):
// se pasan a la lista única de evaluación. Las fortalezas "solo texto" pasan como Comentario.
function migrarEvaluacion(r){
  if(Array.isArray(r.evaluacion)) return r;
  const viejos = [...(r.fortalezas || []), ...(r.mejoras || [])];
  r.evaluacion = viejos.map(it => ({ genera: it.genera || '', texto: it.texto || '', ...(it.rec_id ? { rec_id: it.rec_id, sync_texto: it.sync_texto || '' } : {}) }));
  if(r.evaluacion_intro == null) r.evaluacion_intro = r.mejoras_intro || '';
  delete r.fortalezas; delete r.mejoras; delete r.mejoras_intro;
  return r;
}
const GENERA_LABEL = { OM: 'Oportunidad de Mejora', LA: 'Lección Aprendida', RP: 'Reporte Positivo' };

let ctx = null;         // funciones/estado compartidos que provee app.js
let F = null;           // informe en edición
let F_ORIGINAL = '';    // snapshot para detectar cambios sin guardar
let FOTOS_ORIGINALES = [];
let SUBIDAS_SESION = []; // fotos subidas en esta edición (se borran si no quedan guardadas)
const urlCache = {};    // path -> signed URL
let panelSearch = '';
let panelYear = '';

/* ============ helpers ============ */
function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function nl2br(s){ return esc(s).replace(/\n/g, '<br>'); }
function fmtFecha(d){ if(!d) return ''; const p = d.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; }
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function fechaLarga(d){
  if(!d) return '';
  const dt = new Date(d + 'T00:00:00');
  if(isNaN(dt)) return d;
  const dia = DIAS[dt.getDay()];
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)} ${dt.getDate()} de ${MESES[dt.getMonth()]} de ${dt.getFullYear()}`;
}
function vacio(item){ return !Object.values(item || {}).some(v => String(v == null ? '' : v).trim()); }
function nuevoItem(key){ const o = {}; LISTAS[key].cols.forEach(c => { o[c.k] = c.type === 'select' ? c.options[0] : ''; }); return o; }
// "vacío" para limpiar listas: el selector de registro no cuenta como contenido.
function itemSinTexto(it){ const { genera, rec_id, sync_texto, ...resto } = it || {}; return vacio(resto); }

/* ============ setup ============ */
export function setupInformes(context){
  ctx = context;
  Object.assign(window, {
    openInformeForm, closeInformeForm, infSet, infSetItem, infAddItem, infRemoveItem, infMoveItem,
    infUploadFotos, infUploadFotoUbicacion, infRemoveFotoUbicacion, infSetFotoEpigrafe, infRemoveFoto, infMoveFoto,
    saveInforme, deleteInforme, previewInforme, infPanelSearch, infPanelYear, infChangeTipo, infSetGenera,
  });
}

/* ============ PANEL (listado) ============ */
export function renderInformesPanel(tipo){
  const DATA = ctx.getData();
  const def = INFORME_DEF[tipo];
  let panel = document.getElementById('informesPanel');
  if(!panel){
    panel = document.createElement('div');
    panel.id = 'informesPanel';
    panel.style.marginBottom = '22px';
    document.querySelector('.main').appendChild(panel);
  }
  document.getElementById('viewTitle').textContent = def.label;
  const site = ctx.getSiteFilter();
  let list = DATA.records.filter(r => r.tipo === tipo && (site === 'ALL' || r.instalacion === site));
  const years = [...new Set(list.map(r => (r.fecha || '').slice(0, 4)).filter(Boolean))].sort().reverse();
  if(panelYear && !years.includes(panelYear)) panelYear = '';
  if(panelYear) list = list.filter(r => (r.fecha || '').startsWith(panelYear));
  const q = panelSearch.trim().toLowerCase();
  if(q) list = list.filter(r => `${r.titulo} ${r.ubicacion} ${r.cliente_operacion} ${r.instalacion} ${ctx.codigoMostrado(r)}`.toLowerCase().includes(q));
  list.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.id || '').localeCompare(a.id || ''));
  document.getElementById('viewMeta').textContent = `Formulario ${def.codigo} · ${site === 'ALL' ? 'Todas las bases / departamentos' : site} · ${list.length} informe(s)`;

  const finalizados = list.filter(r => ctx.esCerrado(r.estado)).length;
  const rows = list.map(r => {
    const fin = ctx.esCerrado(r.estado);
    const nFotos = (r.fotos || []).length + (r.foto_ubicacion && r.foto_ubicacion.path ? 1 : 0);
    return `<tr onclick="openInformeForm('${r.id}')" style="cursor:pointer;">
      <td><span class="id-tag">${esc(ctx.codigoMostrado(r))}</span></td>
      <td class="desc-cell" style="font-size:12px;">${esc(r.titulo || '—')}</td>
      <td style="font-size:11.5px;">${esc((r.ubicacion || '—').slice(0, 60))}</td>
      <td class="mono" style="font-size:12px;white-space:nowrap;">${fmtFecha(r.fecha) || '—'}</td>
      <td style="font-size:11.5px;">${esc(r.cliente_operacion || '—')}</td>
      <td style="font-size:11.5px;">${esc(r.instalacion || '—')}</td>
      <td><div class="status-cell" style="white-space:nowrap;"><span class="status-dot" style="background:${fin ? '#1E7A4A' : '#B07D0A'}"></span>${fin ? 'Finalizado' : 'Borrador'}</div></td>
      <td style="text-align:center">${nFotos ? '📷 ' + nFotos : '—'}</td>
      <td style="text-align:center;white-space:nowrap;"><button class="btn secondary" style="padding:4px 8px;font-size:11px;" title="Ver / imprimir informe" onclick="event.stopPropagation();previewInforme('${r.id}')">👁 Ver</button></td>
    </tr>`;
  }).join('');

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <input type="text" placeholder="Buscar por título, ubicación, cliente…" value="${esc(panelSearch)}" oninput="infPanelSearch(this.value)" style="width:280px;">
        <select onchange="infPanelYear(this.value)" style="width:auto;">
          <option value="">Todos los años</option>
          ${years.map(y => `<option ${y === panelYear ? 'selected' : ''}>${y}</option>`).join('')}
        </select>
      </div>
      <button class="btn" onclick="openInformeForm(null,'${tipo}')">+ Nuevo ${esc(def.label.toLowerCase())}</button>
    </div>
    <div class="kpi-row" style="margin-bottom:18px;">
      <div class="kpi-card"><div class="val">${list.length}</div><div class="lbl">Informes ${esc(def.codigo)}</div></div>
      <div class="kpi-card"><div class="val">${finalizados}</div><div class="lbl">Finalizados</div></div>
      <div class="kpi-card ${list.length - finalizados > 0 ? 'alert' : ''}"><div class="val">${list.length - finalizados}</div><div class="lbl">Borradores</div></div>
    </div>
    <div id="tableWrapInformes">
      ${list.length ? `<table style="font-size:12.5px;">
        <thead><tr><th>Código</th><th>Título</th><th>Ubicación</th><th>Fecha</th><th>Cliente / Operación</th><th>Base / Departamento</th><th>Estado</th><th>Fotos</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>` : `<div class="empty-state"><div class="display">Sin informes</div><div>Todavía no hay informes ${esc(def.codigo)} cargados${site !== 'ALL' ? ' para esta base / departamento' : ''}.</div></div>`}
    </div>`;
}
function infPanelSearch(v){
  panelSearch = v || '';
  const pos = document.activeElement && document.activeElement.selectionStart;
  ctx.renderAll();
  const inp = document.querySelector('#informesPanel input[type=text]');
  if(inp){ inp.focus(); try{ inp.setSelectionRange(pos, pos); }catch(e){} }
}
function infPanelYear(v){ panelYear = v || ''; ctx.renderAll(); }

/* ============ FORMULARIO ============ */
function nuevoInforme(tipo){
  const hoy = ctx.todayISO();
  const DATA = ctx.getData();
  const site = ctx.getSiteFilter();
  return {
    id: null, tipo, estado: 'Abierto',
    titulo: '', ubicacion: '', elaborado_por: '',
    fecha: hoy, hora_inicio: '', fecha_fin: hoy, hora_fin: '',
    cliente_operacion: 'No Asignado a Cliente',
    instalacion: site !== 'ALL' ? site : ((DATA.companies[0] && DATA.companies[0].vessels[0]) || ''),
    terminal: '', latitud: '', longitud: '', ubicacion_detalle: '', horario_detalle: '',
    foto_ubicacion: null,
    objetivo_intro: '', objetivos: [nuevoItem('objetivos')],
    escenario: [nuevoItem('escenario')],
    estrategia_intro: DEFAULTS.estrategia_intro, estrategia: [nuevoItem('estrategia')],
    actividades_previas: [nuevoItem('actividades_previas')],
    cronologia: [nuevoItem('cronologia')],
    equipos: [nuevoItem('equipos')],
    personal: [{ ...nuevoItem('personal'), inicio: hoy, fin: hoy }],
    invitados: [nuevoItem('invitados')],
    fotos: [],
    seguridad_lugar: [nuevoItem('seguridad_lugar')],
    seguridad_embarcaciones: DEFAULTS.seguridad_embarcaciones,
    seguridad_personal: DEFAULTS.seguridad_personal,
    seguridad_capacitacion: DEFAULTS.seguridad_capacitacion,
    resultados: [nuevoItem('resultados')],
    evaluacion_intro: DEFAULTS.evaluacion_intro, evaluacion: [nuevoItem('evaluacion')],
    conclusion: '',
  };
}

function openInformeForm(id, tipo){
  const DATA = ctx.getData();
  if(id){
    const r = DATA.records.find(x => x.id === id);
    if(!r){ ctx.showToast('No se encontró el informe'); return; }
    F = migrarEvaluacion(JSON.parse(JSON.stringify(r)));
    Object.keys(LISTAS).forEach(k => { if(!Array.isArray(F[k])) F[k] = []; });
    if(!Array.isArray(F.fotos)) F.fotos = [];
  } else {
    F = nuevoInforme(esInforme(tipo) ? tipo : 'ISIM');
  }
  F_ORIGINAL = JSON.stringify(F);
  FOTOS_ORIGINALES = fotoPaths(F);
  SUBIDAS_SESION = [];
  renderForm();
}

function fotoPaths(r){
  const p = (r.fotos || []).map(f => f.path).filter(Boolean);
  if(r.foto_ubicacion && r.foto_ubicacion.path) p.push(r.foto_ubicacion.path);
  return p;
}

function txt(k, label, ph, opts = {}){
  const v = F[k] == null ? '' : F[k];
  const input = opts.textarea
    ? `<textarea oninput="infSet('${k}',this.value)" placeholder="${esc(ph || '')}" style="min-height:${opts.h || 70}px;">${esc(v)}</textarea>`
    : `<input type="${opts.type || 'text'}" value="${esc(v)}" oninput="infSet('${k}',this.value)" placeholder="${esc(ph || '')}" ${opts.list ? `list="${opts.list}"` : ''}>`;
  return `<div class="field"${opts.style ? ` style="${opts.style}"` : ''}><label>${label}</label>${input}</div>`;
}
function sec(num, titulo, hint){
  return `<div class="section-title inf-sec" style="font-size:12.5px;color:var(--navy);">${num ? num + ') ' : ''}${titulo}${hint ? ` <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--graphite-light);font-size:11px;">— ${hint}</span>` : ''}</div>`;
}
function sub(titulo){ return `<div style="font-size:11.5px;font-weight:700;color:var(--graphite);margin:10px 0 6px;text-transform:uppercase;letter-spacing:0.04em;">${titulo}</div>`; }

function renderListaHtml(key){
  const def = LISTAS[key];
  const items = F[key] || [];
  const rows = items.map((it, i) => {
    const cells = def.cols.map(c => {
      const v = it[c.k] == null ? '' : it[c.k];
      const on = `oninput="infSetItem('${key}',${i},'${c.k}',this.value)"`;
      const st = `style="${c.w ? `flex:0 0 ${c.w};width:${c.w};` : 'flex:1;min-width:140px;'}"`;
      if(c.type === 'textarea') return `<textarea ${on} ${st} placeholder="${esc(c.ph || '')}" rows="2" style="${c.w ? `flex:0 0 ${c.w};` : 'flex:1;min-width:160px;'}min-height:38px;">${esc(v)}</textarea>`;
      if(c.type === 'genera'){
        const hijo = it.rec_id ? ctx.getData().records.find(x => x.id === it.rec_id) : null;
        const estado = hijo
          ? `<span class="inf-gen ok" title="Registro creado para seguimiento">✔ ${esc(GENERA_LABEL[hijo.tipo] || hijo.tipo)} ${esc(ctx.codigoMostrado(hijo))}</span>`
          : (v ? `<span class="inf-gen">Se creará al guardar</span>` : '');
        return `<div style="flex:0 0 ${c.w};width:${c.w};display:flex;flex-direction:column;gap:3px;">
          <select onchange="infSetGenera('${key}',${i},this.value)" title="Registrar como">${GENERA_OPCIONES.map(o => `<option value="${o.v}" ${o.v === (v || '') ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>
          ${estado}
        </div>`;
      }
      if(c.type === 'select') return `<select onchange="infSetItem('${key}',${i},'${c.k}',this.value)" ${st}>${[...new Set([...c.options, v].filter(Boolean))].map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
      return `<input type="${c.type || 'text'}" value="${esc(v)}" ${on} ${st} placeholder="${esc(c.ph || '')}" ${c.list ? `list="${c.list}"` : ''}>`;
    }).join('');
    return `<div class="inf-row">
      <span class="inf-n">${i + 1}</span>
      <div class="inf-cells">${cells}</div>
      <div class="inf-actions">
        <button title="Subir" onclick="infMoveItem('${key}',${i},-1)" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button title="Bajar" onclick="infMoveItem('${key}',${i},1)" ${i === items.length - 1 ? 'disabled' : ''}>↓</button>
        <button title="Quitar" class="del" onclick="infRemoveItem('${key}',${i})">✕</button>
      </div>
    </div>`;
  }).join('');
  const headers = def.cols.length > 1 ? `<div class="inf-row inf-head"><span class="inf-n"></span><div class="inf-cells">${def.cols.map(c => `<span style="${c.w ? `flex:0 0 ${c.w};width:${c.w};` : 'flex:1;min-width:140px;'}">${esc(colLabel(key, c))}</span>`).join('')}</div><div class="inf-actions"></div></div>` : '';
  return `<div id="infList_${key}">${items.length ? headers + rows : '<div style="font-size:12px;color:var(--graphite-light);padding:4px 0 8px;">Sin ítems.</div>'}</div>
    <button class="btn secondary" style="padding:4px 12px;font-size:11.5px;margin:2px 0 8px;" onclick="infAddItem('${key}')">${def.add}</button>`;
}
function listaHtml(key){ return `<div id="infWrap_${key}">${renderListaHtml(key)}</div>`; }
function colLabel(key, c){
  const L = { titulo: 'Título', descripcion: 'Descripción', hora: 'Hora', item: 'Ítem', caracteristicas: 'Características', cantidad: 'Cantidad',
    um: 'UM', genera: 'Tipo', cargo: 'Cargo', nombre: 'Nombre', inicio: 'Inicio', fin: 'Final', funcion: 'Función', institucion: 'Institución', texto: '' };
  return L[c.k] != null ? L[c.k] : c.k;
}
function rerenderLista(key){
  const wrap = document.getElementById('infWrap_' + key);
  if(wrap) wrap.innerHTML = renderListaHtml(key);
}

function renderForm(){
  closeInformeForm(true);
  const DATA = ctx.getData();
  const def = INFORME_DEF[F.tipo];
  const sitios = (DATA.companies[0] && DATA.companies[0].vessels) || [];
  const clientes = [...new Set([...(ctx.clientesDisponibles() || []).filter(Boolean), F.cliente_operacion].filter(Boolean))];
  const instituciones = [...new Set(DATA.records.filter(r => esInforme(r.tipo)).flatMap(r => (r.invitados || []).map(x => x.institucion)).filter(Boolean)
    .concat(['Prefectura Naval Argentina', 'YPF']))];
  const puedeBorrar = F.id && ctx.puedeVisar();
  const codigo = F.id ? ctx.codigoMostrado(F) : `${def.codigo} · (se asigna al guardar)`;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'informeOverlay';
  overlay.innerHTML = `
  <div class="modal inf-modal">
    <div class="modal-head">
      <div>
        <div style="font-size:11px;letter-spacing:0.08em;opacity:0.75;text-transform:uppercase;">${esc(codigo)}</div>
        <h2 id="infHeadTitle">${F.id ? 'Editar' : 'Nuevo'} ${esc(def.label)}</h2>
      </div>
      <button class="modal-close" onclick="closeInformeForm()">✕</button>
    </div>
    <div class="modal-body inf-body">
      <datalist id="infItemsDL">${ITEMS_EQUIPO.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
      <datalist id="infCargosDL">${CARGOS_INFORME.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
      <datalist id="infInstitucionesDL">${instituciones.map(x => `<option value="${esc(x)}">`).join('')}</datalist>

      ${sec('', 'Datos generales')}
      <div class="field-row">
        <div class="field"><label>Tipo de informe</label>
          <select onchange="infChangeTipo(this.value)">${INFORME_TIPOS.map(k => `<option value="${k}" ${k === F.tipo ? 'selected' : ''}>${INFORME_DEF[k].codigo} — ${INFORME_DEF[k].label}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Estado</label>
          <select onchange="infSet('estado',this.value)">
            <option value="Abierto" ${!ctx.esCerrado(F.estado) ? 'selected' : ''}>Borrador</option>
            <option value="Cerrado" ${ctx.esCerrado(F.estado) ? 'selected' : ''}>Finalizado</option>
          </select>
        </div>
      </div>
      ${txt('titulo', 'Título *', 'Ej: SIMULACRO EN MUELLE TERMINAL DE DESCARGAS YPF, BARRANQUERAS, CHACO.')}
      ${txt('ubicacion', 'Ubicación', 'Ej: KM 7 MARGEN DERECHA – RIACHO BARRANQUERAS – CHACO - ARGENTINA.')}
      <div class="field-row-4">
        ${txt('fecha', 'Fecha inicio *', '', { type: 'date' })}
        ${txt('hora_inicio', 'Hora inicio', '', { type: 'time' })}
        ${txt('fecha_fin', 'Fecha fin', '', { type: 'date' })}
        ${txt('hora_fin', 'Hora fin', '', { type: 'time' })}
      </div>
      <div class="field-row-3">
        <div class="field"><label>Cliente / Operación</label>
          <select onchange="infSet('cliente_operacion',this.value)">${clientes.map(c => `<option ${c === F.cliente_operacion ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Base / Departamento</label>
          <select onchange="infSet('instalacion',this.value)">${[...new Set([...sitios, F.instalacion].filter(Boolean))].map(s => `<option ${s === F.instalacion ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
        </div>
        ${txt('elaborado_por', 'Elaborado por', 'Nombre y apellido', { list: 'personasDatalist' })}
      </div>

      ${sec(1, 'Posición geográfica')}
      ${txt('terminal', 'Terminal portuaria / lugar', 'Ej: YPF – Muelle Terminal de Descargas, Km 7, margen derecha del riacho Barranqueras, Chaco, Argentina.', { textarea: true, h: 50 })}
      <div class="field-row">
        ${txt('latitud', 'Latitud', `Ej: 27°30'09.95" S`)}
        ${txt('longitud', 'Longitud', `Ej: 58°55'50.46" O`)}
      </div>
      <div class="field"><label>Imagen de ubicación (mapa / satelital)</label><div id="infFotoUbic"></div></div>
      ${sub('a) Fecha y horario')}
      <div style="font-size:12px;color:var(--graphite);margin-bottom:6px;">Se arma automáticamente con las fechas y horas de arriba. Podés agregar un detalle:</div>
      ${txt('horario_detalle', 'Detalle del horario (opcional)', 'Ej: seguida del ordenamiento y reacondicionamiento del material.')}
      ${sub('b) Ubicación')}
      ${txt('ubicacion_detalle', 'Descripción de la ubicación', 'Ej: Muelle Terminal de Descargas YPF, Puerto de Barranqueras. Km 7, margen derecha del riacho Barranqueras.', { textarea: true, h: 50 })}

      ${sec(2, 'Objetivo')}
      ${txt('objetivo_intro', 'Introducción', 'Ej: El ejercicio se realizó con … CLEAN SEA participó en su carácter de OSRO contratada por … Sus objetivos fueron:', { textarea: true, h: 60 })}
      ${sub('Objetivos')}
      ${listaHtml('objetivos')}

      ${sec(3, 'Escenario', 'cada punto: título en negrita + descripción')}
      ${listaHtml('escenario')}

      ${sec(4, 'Estrategia de respuesta')}
      ${txt('estrategia_intro', 'Introducción', '')}
      ${listaHtml('estrategia')}

      ${sec(5, 'Desarrollo')}
      ${sub('Actividades preparatorias (previas al inicio)')}
      ${listaHtml('actividades_previas')}
      ${sub('Cronología')}
      ${listaHtml('cronologia')}

      ${sec(6, 'Recursos')}
      ${sub('6.1 Equipamiento utilizado')}
      ${listaHtml('equipos')}
      ${sub('6.2 Personal participante')}
      ${listaHtml('personal')}

      ${sec(7, 'Invitados y observadores')}
      ${listaHtml('invitados')}

      ${sec(8, 'Imágenes', 'JPG / PNG — se comprimen automáticamente')}
      <div id="infFotos"></div>

      ${sec(9, 'Condiciones de seguridad')}
      ${sub('Lugar')}
      ${listaHtml('seguridad_lugar')}
      ${txt('seguridad_embarcaciones', 'Embarcaciones', '', { textarea: true, h: 60 })}
      ${txt('seguridad_personal', 'Personal', '', { textarea: true, h: 50 })}
      ${txt('seguridad_capacitacion', 'Capacitación', '', { textarea: true, h: 60 })}

      ${sec(10, 'Resultados')}
      ${listaHtml('resultados')}

      ${sec(11, 'Evaluación de la actuación')}
      <div style="font-size:12px;color:var(--graphite);margin-bottom:8px;">Cargá cada punto y elegí su tipo. <b>Reporte Positivo</b>, <b>Oportunidad de Mejora</b> y <b>Lección Aprendida</b> crean además un registro en su sección para el seguimiento. En el informe impreso los puntos se agrupan por tipo.</div>
      ${txt('evaluacion_intro', 'Introducción (opcional)', '')}
      ${listaHtml('evaluacion')}

      ${sec(12, 'Conclusión')}
      ${txt('conclusion', 'Conclusión', '', { textarea: true, h: 160 })}
    </div>
    <div class="modal-foot">
      <div style="display:flex;gap:8px;">
        ${puedeBorrar ? `<button class="btn danger" onclick="deleteInforme('${F.id}')">Eliminar</button>` : ''}
        ${F.id ? `<button class="btn secondary" onclick="previewInforme('${F.id}')">👁 Ver / Imprimir</button>` : ''}
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn secondary" onclick="closeInformeForm()">Cancelar</button>
        <button class="btn" id="infSaveBtn" onclick="saveInforme()">Guardar informe</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  ensureStyles();
  renderFotoUbicacion();
  renderFotos();
}

function closeInformeForm(silent){
  const el = document.getElementById('informeOverlay');
  if(!el) return;
  if(silent !== true && F && JSON.stringify(F) !== F_ORIGINAL){
    if(!confirm('Hay cambios sin guardar. ¿Cerrar igual?')) return;
  }
  el.remove();
  if(silent !== true){
    // Cancelado: se eliminan las fotos subidas en esta edición que nunca se guardaron.
    const huerfanas = SUBIDAS_SESION.filter(p => !FOTOS_ORIGINALES.includes(p));
    SUBIDAS_SESION = [];
    if(huerfanas.length) ctx.supabase.storage.from(BUCKET).remove(huerfanas).catch(() => {});
  }
}

function infSet(k, v){
  if(!F) return;
  // Al cambiar las fechas del informe, las filas de personal que tenían la fecha anterior la siguen.
  if((k === 'fecha' || k === 'fecha_fin') && v){
    const campo = k === 'fecha' ? 'inicio' : 'fin';
    const prev = F[k];
    let cambio = false;
    (F.personal || []).forEach(p => { if(!p[campo] || p[campo] === prev){ p[campo] = v; cambio = true; } });
    if(cambio) rerenderLista('personal');
  }
  F[k] = v;
}
function infChangeTipo(t){
  if(!F || !esInforme(t)) return;
  F.tipo = t;
  const h = document.getElementById('infHeadTitle');
  if(h) h.textContent = `${F.id ? 'Editar' : 'Nuevo'} ${INFORME_DEF[t].label}`;
}
function infSetItem(key, i, campo, v){ if(F && F[key] && F[key][i]) F[key][i][campo] = v; }
function infSetGenera(key, i, v){
  const it = F && F[key] && F[key][i];
  if(!it) return;
  const hijo = it.rec_id ? ctx.getData().records.find(x => x.id === it.rec_id) : null;
  if(hijo && v !== hijo.tipo){
    if(!confirm(`Este ítem ya generó ${GENERA_LABEL[hijo.tipo] || hijo.tipo} ${ctx.codigoMostrado(hijo)}. Ese registro se mantiene; si cambiás el tipo, al guardar se creará uno nuevo. ¿Continuar?`)){
      rerenderLista(key); return;
    }
    it.rec_id = ''; it.sync_texto = '';
  }
  it.genera = v;
  rerenderLista(key);
}
function infAddItem(key){
  const it = nuevoItem(key);
  if(key === 'personal'){ it.inicio = F.fecha || ''; it.fin = F.fecha_fin || F.fecha || ''; }
  F[key].push(it);
  rerenderLista(key);
  const list = document.getElementById('infList_' + key);
  const last = list && list.querySelector('.inf-row:last-child input, .inf-row:last-child textarea');
  if(last) last.focus();
}
function infRemoveItem(key, i){
  const it = F[key][i];
  if(!vacio(it) && !confirm('¿Quitar este ítem?')) return;
  F[key].splice(i, 1);
  rerenderLista(key);
}
function infMoveItem(key, i, d){
  const a = F[key]; const j = i + d;
  if(j < 0 || j >= a.length) return;
  [a[i], a[j]] = [a[j], a[i]];
  rerenderLista(key);
}

/* ============ FOTOS ============ */
async function signedUrls(paths){
  const faltan = paths.filter(p => p && !urlCache[p]);
  if(faltan.length){
    try{
      const { data, error } = await ctx.supabase.storage.from(BUCKET).createSignedUrls(faltan, 3600);
      if(error) throw error;
      (data || []).forEach(d => { if(d.signedUrl) urlCache[d.path] = d.signedUrl; });
    }catch(e){ console.error('Error obteniendo URLs de fotos:', e && e.message ? e.message : e); }
  }
  return paths.map(p => urlCache[p] || '');
}

// Redimensiona y comprime a JPEG para no superar el límite del bucket.
async function comprimirImagen(file){
  const bitmapUrl = URL.createObjectURL(file);
  try{
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('No se pudo leer la imagen')); im.src = bitmapUrl; });
    let { width: w, height: h } = img;
    const escala = Math.min(1, FOTO_MAX_PX / Math.max(w, h));
    w = Math.round(w * escala); h = Math.round(h * escala);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const g = canvas.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.drawImage(img, 0, 0, w, h);
    let q = 0.85, blob = null;
    for(let intento = 0; intento < 6; intento++){
      blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', q));
      if(blob && blob.size <= FOTO_MAX_BYTES) break;
      q -= 0.12;
    }
    if(!blob) throw new Error('No se pudo comprimir la imagen');
    return blob;
  } finally { URL.revokeObjectURL(bitmapUrl); }
}

async function subirFoto(file){
  if(!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) throw new Error('Formato no permitido (solo imágenes)');
  const blob = await comprimirImagen(file);
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60) || 'foto';
  const path = `informes/${new Date().getFullYear()}/${ctx.uid()}_${base}.jpg`;
  const { error } = await ctx.supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if(error) throw error;
  SUBIDAS_SESION.push(path);
  return { path, nombre: file.name };
}

async function infUploadFotos(input){
  const files = [...(input.files || [])];
  input.value = '';
  if(!files.length) return;
  let ok = 0;
  for(let i = 0; i < files.length; i++){
    ctx.showToast(`Subiendo foto ${i + 1} de ${files.length}…`);
    try{
      const f = await subirFoto(files[i]);
      F.fotos.push({ ...f, epigrafe: '' });
      ok++;
      renderFotos();
    }catch(e){
      console.error('Error subiendo foto:', e && e.message ? e.message : e);
      ctx.showToast(`No se pudo subir "${files[i].name}": ${e && e.message ? e.message : 'error'}`);
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  if(ok) ctx.showToast(`${ok} foto(s) subida(s). Recordá guardar el informe.`);
}
async function infUploadFotoUbicacion(input){
  const file = input.files && input.files[0];
  input.value = '';
  if(!file) return;
  ctx.showToast('Subiendo imagen de ubicación…');
  try{
    const f = await subirFoto(file);
    F.foto_ubicacion = { ...f, epigrafe: (F.foto_ubicacion && F.foto_ubicacion.epigrafe) || '' };
    renderFotoUbicacion();
    renderFotos(); // renumera "Imagen N"
    ctx.showToast('Imagen subida. Recordá guardar el informe.');
  }catch(e){
    ctx.showToast(`No se pudo subir la imagen: ${e && e.message ? e.message : 'error'}`);
  }
}
function infRemoveFotoUbicacion(){
  if(!confirm('¿Quitar la imagen de ubicación?')) return;
  F.foto_ubicacion = null;
  renderFotoUbicacion();
  renderFotos();
}
function infSetFotoEpigrafe(i, v){
  if(i === -1){ if(F.foto_ubicacion) F.foto_ubicacion.epigrafe = v; return; }
  if(F.fotos[i]) F.fotos[i].epigrafe = v;
}
function infRemoveFoto(i){
  if(!confirm('¿Quitar esta foto del informe?')) return;
  F.fotos.splice(i, 1);
  renderFotos();
}
function infMoveFoto(i, d){
  const j = i + d;
  if(j < 0 || j >= F.fotos.length) return;
  [F.fotos[i], F.fotos[j]] = [F.fotos[j], F.fotos[i]];
  renderFotos();
}

function renderFotoUbicacion(){
  const el = document.getElementById('infFotoUbic');
  if(!el) return;
  const f = F.foto_ubicacion;
  if(!f || !f.path){
    el.innerHTML = `<label class="btn secondary" style="padding:6px 12px;font-size:12px;cursor:pointer;">📍 Cargar imagen de ubicación<input type="file" accept="image/*" style="display:none;" onchange="infUploadFotoUbicacion(this)"></label>`;
    return;
  }
  el.innerHTML = `<div class="inf-foto" style="max-width:420px;">
      <div class="inf-thumb"><img data-path="${esc(f.path)}" alt=""></div>
      <input type="text" value="${esc(f.epigrafe || '')}" placeholder="Epígrafe — Ej: Ubicación del simulacro: Muelle Terminal de Descargas YPF…" oninput="infSetFotoEpigrafe(-1,this.value)">
      <div class="inf-foto-actions">
        <label class="btn secondary" style="padding:3px 10px;font-size:11px;cursor:pointer;">Reemplazar<input type="file" accept="image/*" style="display:none;" onchange="infUploadFotoUbicacion(this)"></label>
        <button class="btn secondary" style="padding:3px 10px;font-size:11px;color:var(--red);" onclick="infRemoveFotoUbicacion()">Quitar</button>
      </div>
    </div>`;
  cargarThumbs(el);
}

function renderFotos(){
  const el = document.getElementById('infFotos');
  if(!el) return;
  const offset = (F.foto_ubicacion && F.foto_ubicacion.path) ? 2 : 1;
  el.innerHTML = `
    <div class="inf-fotos-grid">
      ${F.fotos.map((f, i) => `<div class="inf-foto">
        <div class="inf-thumb"><img data-path="${esc(f.path)}" alt=""><span class="inf-foto-n">Imagen ${i + offset}</span></div>
        <input type="text" value="${esc(f.epigrafe || '')}" placeholder="Epígrafe de la imagen" oninput="infSetFotoEpigrafe(${i},this.value)">
        <div class="inf-foto-actions">
          <button class="btn secondary" style="padding:3px 9px;font-size:11px;" onclick="infMoveFoto(${i},-1)" ${i === 0 ? 'disabled' : ''} title="Mover antes">←</button>
          <button class="btn secondary" style="padding:3px 9px;font-size:11px;" onclick="infMoveFoto(${i},1)" ${i === F.fotos.length - 1 ? 'disabled' : ''} title="Mover después">→</button>
          <button class="btn secondary" style="padding:3px 9px;font-size:11px;color:var(--red);margin-left:auto;" onclick="infRemoveFoto(${i})">Quitar</button>
        </div>
      </div>`).join('')}
      <label class="inf-foto inf-foto-add">
        <span style="font-size:28px;line-height:1;">＋</span>
        <span>Agregar fotos</span>
        <span style="font-size:10.5px;color:var(--graphite-light);">Podés seleccionar varias</span>
        <input type="file" accept="image/*" multiple style="display:none;" onchange="infUploadFotos(this)">
      </label>
    </div>`;
  cargarThumbs(el);
}
async function cargarThumbs(scope){
  const imgs = [...scope.querySelectorAll('img[data-path]')];
  const urls = await signedUrls(imgs.map(i => i.dataset.path));
  imgs.forEach((im, k) => { if(urls[k]) im.src = urls[k]; });
}

/* ============ GUARDAR / ELIMINAR ============ */
function limpiarListas(r){
  Object.keys(LISTAS).forEach(k => { r[k] = (r[k] || []).filter(it => !itemSinTexto(it)); });
}

// Crea (o actualiza) los registros OM / LA / RP pedidos desde la Evaluación del informe.
// Devuelve la lista de registros a guardar. Los registros generados quedan vinculados al
// informe (origen_registro_id) y el ítem guarda su id (rec_id).
function sincronizarEvaluacion(rec){
  const DATA = ctx.getData();
  const def = INFORME_DEF[rec.tipo];
  const codigo = ctx.codigoMostrado(rec);
  const aGuardar = [];
  ['evaluacion'].forEach(key => {
    (rec[key] || []).forEach(it => {
      const tipo = it.genera;
      const texto = (it.texto || '').trim();
      if(!GENERA_LABEL[tipo] || !texto) return;
      const origen = `Origen: ${def.label} ${codigo} — ${rec.titulo || ''}`.trim();
      const existente = it.rec_id ? DATA.records.find(x => x.id === it.rec_id && x.tipo === tipo) : null;
      if(existente){
        // Solo se actualiza si el texto cambió en el informe (no pisa ediciones hechas en el registro).
        if(it.sync_texto !== texto){
          existente.titulo = texto.split('\n')[0].slice(0, 120);
          existente.descripcion = `${texto}\n\n${origen}`;
          it.sync_texto = texto;
          aGuardar.push(existente);
        }
        return;
      }
      const hijo = {
        id: ctx.generateRecordId(tipo, rec.fecha),
        tipo,
        empresa_id: rec.empresa_id,
        cliente_operacion: rec.cliente_operacion,
        instalacion: rec.instalacion,
        fecha: rec.fecha,
        area: '',
        titulo: texto.split('\n')[0].slice(0, 120),
        descripcion: `${texto}\n\n${origen}`,
        reportado_por: rec.elaborado_por || '',
        reportado_nombre: rec.elaborado_por || '',
        reportado_cargo: '',
        clasificacion_origen: '',
        severidad: '',
        estado: 'Abierto',
        comunicar_a: '', medio_comunicacion: '', plazo_comunicacion: '',
        responsable: '', fecha_vencimiento: '', fecha_cierre: '',
        referencia_normativa: `Generada automáticamente desde ${def.label} ${codigo}`,
        acciones_correctivas: [], acciones_preventivas: [],
        adjuntos: [], lecciones_aprendidas: [],
        origen_automatico: true,
        origen_registro_id: rec.id,
        origen_registro_tipo: rec.tipo,
      };
      DATA.records.push(hijo);
      it.rec_id = hijo.id;
      it.sync_texto = texto;
      aGuardar.push(hijo);
    });
  });
  return aGuardar;
}

async function saveInforme(){
  if(!F) return;
  if(!(F.titulo || '').trim()){ ctx.showToast('Completá el título del informe'); return; }
  if(!F.fecha){ ctx.showToast('Completá la fecha de inicio'); return; }
  if(F.fecha_fin && F.fecha_fin < F.fecha){ ctx.showToast('La fecha de fin no puede ser anterior a la de inicio'); return; }
  const DATA = ctx.getData();
  const rec = JSON.parse(JSON.stringify(F));
  limpiarListas(rec);
  const ahora = new Date().toISOString();
  const nuevo = !rec.id;
  if(nuevo){
    rec.id = `${rec.tipo}-${(rec.fecha || '').slice(0, 4) || new Date().getFullYear()}-${ctx.uid()}`;
    rec.creado_por = ctx.getUser();
    rec.creado_en = ahora;
  }
  rec.estado = ctx.esCerrado(rec.estado) ? 'Cerrado' : 'Abierto';
  rec.empresa_id = rec.empresa_id || (DATA.companies[0] ? DATA.companies[0].id : '');
  rec.descripcion = rec.objetivo_intro || rec.conclusion || '';
  rec.adjuntos = [];
  rec.modificado_por = ctx.getUser();
  rec.modificado_en = ahora;

  const btn = document.getElementById('infSaveBtn');
  if(btn){ btn.disabled = true; btn.textContent = 'Guardando…'; }
  const ok = await ctx.upsertRegistro(rec);
  if(btn){ btn.disabled = false; btn.textContent = 'Guardar informe'; }
  if(!ok) return;

  // Fotos quitadas del informe: se eliminan del almacenamiento.
  const quedan = new Set(fotoPaths(rec));
  const borrar = [...new Set([...FOTOS_ORIGINALES, ...SUBIDAS_SESION])].filter(p => !quedan.has(p));
  if(borrar.length){ try{ await ctx.supabase.storage.from(BUCKET).remove(borrar); }catch(e){ /* no bloquea */ } }
  SUBIDAS_SESION = [];

  const idx = DATA.records.findIndex(x => x.id === rec.id);
  if(idx >= 0) DATA.records[idx] = rec; else DATA.records.push(rec);

  // Evaluación → registros de seguimiento (OM / LA / RP)
  const hijos = sincronizarEvaluacion(rec);
  let creados = 0;
  if(hijos.length){
    for(const h of hijos){ if(await ctx.upsertRegistro(h)) creados++; }
    await ctx.upsertRegistro(rec); // guarda los vínculos (rec_id) en el informe
  }

  F = JSON.parse(JSON.stringify(rec));
  F_ORIGINAL = JSON.stringify(F);
  FOTOS_ORIGINALES = fotoPaths(rec);
  closeInformeForm(true);
  ctx.renderAll();
  ctx.showToast(`Informe ${ctx.codigoMostrado(rec)} guardado${creados ? ` · ${creados} registro(s) de seguimiento creados/actualizados` : ''}`);
}

async function deleteInforme(id){
  if(!ctx.puedeVisar()){ ctx.showToast('Solo el Responsable HSQE/DPA autorizado puede eliminar informes'); return; }
  const DATA = ctx.getData();
  const r = DATA.records.find(x => x.id === id);
  if(!r) return;
  const nHijos = DATA.records.filter(x => x.origen_registro_id === id).length;
  if(!confirm(`¿Eliminar el informe ${ctx.codigoMostrado(r)} y sus fotos? Esta acción no se puede deshacer.${nHijos ? `\n\nLos ${nHijos} registro(s) de seguimiento que generó (OM / LA / RP) NO se eliminan.` : ''}`)) return;
  const ok = await ctx.deleteRegistroRow(id);
  if(!ok) return;
  const paths = fotoPaths(r);
  if(paths.length){ try{ await ctx.supabase.storage.from(BUCKET).remove(paths); }catch(e){ /* no bloquea */ } }
  DATA.records = DATA.records.filter(x => x.id !== id);
  closeInformeForm(true);
  ctx.renderAll();
  ctx.showToast('Informe eliminado');
}

/* ============ VISTA DE IMPRESIÓN (Ver / Imprimir / Guardar PDF) ============ */
async function previewInforme(id){
  const win = window.open('', '_blank');
  if(!win){ ctx.showToast('El navegador bloqueó la ventana. Habilitá los pop-ups para este sitio.'); return; }
  win.document.write('<title>Generando informe…</title><body style="font-family:Arial,sans-serif;color:#5B6671;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">Generando informe…</body>');
  const DATA = ctx.getData();
  const encontrado = DATA.records.find(x => x.id === id);
  if(!encontrado){ win.close(); ctx.showToast('No se encontró el informe'); return; }
  const r = migrarEvaluacion(JSON.parse(JSON.stringify(encontrado)));
  const def = INFORME_DEF[r.tipo];
  const codigo = ctx.codigoMostrado(r);
  const logo = await ctx.logoToDataURL(ctx.getCompanyLogo(r.empresa_id));
  const fotoU = r.foto_ubicacion && r.foto_ubicacion.path ? r.foto_ubicacion : null;
  const fotos = r.fotos || [];
  const urls = await signedUrls([...(fotoU ? [fotoU.path] : []), ...fotos.map(f => f.path)]);
  const urlU = fotoU ? urls[0] : '';
  const urlsF = fotoU ? urls.slice(1) : urls;

  const NAVY = '#1C3666', LINE = '#C9D1DA';
  const has = s => String(s == null ? '' : s).trim() !== '';
  const lista = (items, campo) => (items || []).filter(it => has(it[campo || 'texto'])).length
    ? `<ul>${items.filter(it => has(it[campo || 'texto'])).map(it => `<li>${nl2br(it[campo || 'texto'])}</li>`).join('')}</ul>` : '';
  const listaTitulada = items => (items || []).filter(it => has(it.titulo) || has(it.descripcion)).length
    ? `<ul>${items.filter(it => has(it.titulo) || has(it.descripcion)).map(it => `<li>${has(it.titulo) ? `<b>${esc(it.titulo.trim().replace(/\.$/, ''))}.</b> ` : ''}${nl2br(it.descripcion)}</li>`).join('')}</ul>` : '';
  const tabla = (heads, rows) => rows.length ? `<table class="t"><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(c => `<tr>${c.map(x => `<td>${nl2br(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p class="muted">—</p>';
  const p = s => has(s) ? `<p>${nl2br(s)}</p>` : '';
  const fechas = [
    [fmtFecha(r.fecha), r.hora_inicio].filter(Boolean).join(' – '),
    [fmtFecha(r.fecha_fin), r.hora_fin].filter(Boolean).join(' '),
  ].filter(Boolean).join(' – ');
  const horario = [
    fechaLarga(r.fecha) ? `${fechaLarga(r.fecha)}.` : '',
    r.hora_inicio ? `Inicio: ${r.hora_inicio} hs aprox.` : '',
    r.hora_fin ? `Finalización: ${r.hora_fin} hs aprox.${has(r.horario_detalle) ? ', ' + esc(r.horario_detalle.trim()) : ''}` : (has(r.horario_detalle) ? esc(r.horario_detalle) : ''),
  ].filter(Boolean);
  const figura = (url, n, epi) => url ? `<figure><img src="${url}" alt=""><figcaption>Imagen ${n}${has(epi) ? ' – ' + esc(epi) : ''}</figcaption></figure>` : '';
  const offset = fotoU ? 2 : 1;

  const cron = (r.cronologia || []).filter(c => has(c.hora) || has(c.titulo) || has(c.descripcion));

  // 11) Evaluación: agrupada según el tipo elegido en cada punto (solo grupos con contenido).
  const evalItems = (r.evaluacion || []).filter(it => has(it.texto));
  const gruposConItems = EVAL_GRUPOS.map(g => ({ ...g, items: evalItems.filter(it => (it.genera || '') === g.v) })).filter(g => g.items.length);
  const soloComentarios = gruposConItems.length === 1 && gruposConItems[0].v === '';
  const evalHtml = !evalItems.length ? '<p class="muted">—</p>'
    : p(r.evaluacion_intro) + (soloComentarios
      ? lista(evalItems)
      : gruposConItems.map(g => `<h3>${esc(g.titulo)}</h3>${lista(g.items)}`).join(''));
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${esc(def.codigo)} ${esc(def.label)} - ${esc(r.titulo || '')}</title>
<style>
  @page{size:A4;margin:16mm 16mm 20mm;}
  *{box-sizing:border-box;}
  body{font-family:Arial,Helvetica,sans-serif;color:#1d2731;font-size:10.5pt;line-height:1.45;margin:0;background:#eef1f4;}
  .doc{max-width:210mm;margin:0 auto;background:#fff;padding:16mm;}
  .bar{position:sticky;top:0;background:${NAVY};color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;z-index:5;}
  .bar button{background:#fff;color:${NAVY};border:none;padding:8px 16px;border-radius:4px;font-weight:700;cursor:pointer;font-size:13px;}
  .hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${NAVY};padding-bottom:8px;margin-bottom:14px;}
  .hdr img{max-height:52px;max-width:170px;}
  .hdr .code{text-align:right;color:${NAVY};}
  .hdr .code b{font-size:13pt;display:block;}
  .hdr .code span{font-size:9pt;color:#5B6671;}
  table.cover{width:100%;border-collapse:collapse;margin-bottom:16px;}
  table.cover td{border:1px solid ${LINE};padding:7px 10px;vertical-align:top;}
  table.cover td:first-child{width:28%;background:#F1F4F7;font-weight:700;color:${NAVY};}
  h2{font-size:11.5pt;color:${NAVY};text-transform:uppercase;margin:18px 0 6px;border-bottom:1px solid ${LINE};padding-bottom:3px;break-after:avoid;}
  h3{font-size:10.5pt;color:${NAVY};margin:12px 0 4px;break-after:avoid;}
  p{margin:4px 0 6px;text-align:justify;}
  ul{margin:4px 0 8px;padding-left:20px;} li{margin-bottom:3px;text-align:justify;}
  .cron p{margin:0 0 7px;}
  table.t{width:100%;border-collapse:collapse;margin:6px 0 10px;font-size:9.5pt;}
  table.t th{background:${NAVY};color:#fff;text-align:left;padding:5px 7px;font-weight:700;}
  table.t td{border:1px solid ${LINE};padding:5px 7px;vertical-align:top;}
  table.t tr{break-inside:avoid;}
  figure{margin:10px 0 14px;text-align:center;break-inside:avoid;}
  figure img{max-width:100%;max-height:105mm;object-fit:contain;border:1px solid ${LINE};}
  figcaption{font-size:9pt;color:#5B6671;font-style:italic;margin-top:4px;}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .grid figure img{height:65mm;width:100%;object-fit:contain;background:#fff;}
  .muted{color:#8B96A1;}
  .foot{position:fixed;bottom:0;left:0;right:0;font-size:8pt;color:#8B96A1;text-align:center;display:none;}
  @media print{
    body{background:#fff;} .bar{display:none;} .doc{padding:0;max-width:none;} .foot{display:block;bottom:-12mm;}
  }
</style></head><body>
<div class="bar"><span>${esc(def.codigo)} · ${esc(def.label)} — ${esc(codigo)}</span><button onclick="window.print()">🖨 Imprimir / Guardar PDF</button></div>
<div class="foot">CLEAN SEA · ${esc(def.codigo)} ${esc(def.label)} · ${esc(codigo)}</div>
<div class="doc">
  <div class="hdr">
    <div>${logo ? `<img src="${logo}" alt="Clean Sea">` : '<b>CLEAN SEA</b>'}</div>
    <div class="code"><b>${esc(def.codigo)} · ${esc(def.label.toUpperCase())}</b><span>${esc(codigo)}${ctx.esCerrado(r.estado) ? '' : ' · BORRADOR'}</span></div>
  </div>
  <table class="cover">
    <tr><td>Título:</td><td>${esc(r.titulo || '')}</td></tr>
    <tr><td>Ubicación:</td><td>${esc(r.ubicacion || '')}</td></tr>
    <tr><td>Fechas comprendidas</td><td>${esc(fechas)}</td></tr>
    ${has(r.cliente_operacion) && r.cliente_operacion !== 'No Asignado a Cliente' ? `<tr><td>Cliente / Operación</td><td>${esc(r.cliente_operacion)}</td></tr>` : ''}
  </table>

  <h2>1) Posición geográfica</h2>
  ${has(r.terminal) ? `<p><b>Terminal portuaria:</b> ${nl2br(r.terminal)}</p>` : ''}
  ${has(r.latitud) ? `<p><b>Latitud:</b> ${esc(r.latitud)}</p>` : ''}
  ${has(r.longitud) ? `<p><b>Longitud:</b> ${esc(r.longitud)}</p>` : ''}
  ${figura(urlU, 1, fotoU && fotoU.epigrafe)}
  <h3>a) Fecha y horario</h3>
  ${horario.map(x => `<p>${x}</p>`).join('')}
  ${has(r.ubicacion_detalle) ? `<h3>b) Ubicación</h3>${p(r.ubicacion_detalle)}` : ''}

  <h2>2) Objetivo</h2>
  ${p(r.objetivo_intro)}${lista(r.objetivos)}

  <h2>3) Escenario</h2>
  ${listaTitulada(r.escenario)}

  <h2>4) Estrategia de respuesta</h2>
  ${(r.estrategia || []).length ? p(r.estrategia_intro) : ''}${listaTitulada(r.estrategia)}

  <h2>5) Desarrollo</h2>
  ${(r.actividades_previas || []).some(x => has(x.texto)) ? `<h3>Actividades preparatorias (previas al inicio)</h3>${lista(r.actividades_previas)}` : ''}
  <div class="cron">${cron.map(c => `<p><b>${esc(c.hora ? c.hora + ' hs' : '')}${c.hora && c.titulo ? ' – ' : ''}${esc(c.titulo || '')}${c.titulo ? '.' : ''}</b> ${nl2br(c.descripcion)}</p>`).join('')}</div>

  <h2>6) Recursos</h2>
  <h3>6.1 Equipamiento utilizado</h3>
  ${tabla(['Ítem', 'Características', 'Cantidad', 'UM'], (r.equipos || []).map(e => [e.item, e.caracteristicas, e.cantidad, e.um]))}
  <h3>6.2 Personal participante</h3>
  ${tabla(['Cargo', 'Nombre', 'Inicio', 'Final'], (r.personal || []).map(e => [e.cargo, e.nombre, fmtFecha(e.inicio), fmtFecha(e.fin)]))}

  <h2>7) Invitados y observadores</h2>
  ${tabla(['Nombre y apellido', 'Función', 'Institución'], (r.invitados || []).map(e => [e.nombre, e.funcion, e.institucion]))}

  <h2>8) Imágenes</h2>
  ${fotos.length ? `<div class="grid">${fotos.map((f, i) => figura(urlsF[i], i + offset, f.epigrafe)).join('')}</div>` : '<p class="muted">Sin imágenes.</p>'}

  <h2>9) Condiciones de seguridad</h2>
  ${(r.seguridad_lugar || []).some(x => has(x.texto)) ? `<p><b>Lugar del ejercicio</b></p>${lista(r.seguridad_lugar)}` : ''}
  ${has(r.seguridad_embarcaciones) ? `<p><b>Embarcaciones.</b> ${nl2br(r.seguridad_embarcaciones)}</p>` : ''}
  ${has(r.seguridad_personal) ? `<p><b>Personal.</b> ${nl2br(r.seguridad_personal)}</p>` : ''}
  ${has(r.seguridad_capacitacion) ? `<p><b>Capacitación.</b> ${nl2br(r.seguridad_capacitacion)}</p>` : ''}

  <h2>10) Resultados</h2>
  ${lista(r.resultados)}

  <h2>11) Evaluación de la actuación</h2>
  ${evalHtml}

  <h2>12) Conclusión</h2>
  ${p(r.conclusion)}
  ${has(r.elaborado_por) ? `<p style="margin-top:24px;color:#5B6671;font-size:9.5pt;">Elaborado por: <b>${esc(r.elaborado_por)}</b></p>` : ''}
</div>
</body></html>`;
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/* ============ ESTILOS PROPIOS DEL FORMULARIO ============ */
function ensureStyles(){
  if(document.getElementById('informesStyles')) return;
  const s = document.createElement('style');
  s.id = 'informesStyles';
  s.textContent = `
    .inf-modal{max-width:1040px !important;}
    .inf-body{max-height:calc(100vh - 210px) !important;}
    .inf-body .section-title.inf-sec{border-top:2px solid var(--line);padding-top:14px;margin-top:22px;}
    .inf-body .section-title.inf-sec:first-of-type{border-top:none;padding-top:0;margin-top:0;}
    .field-row-4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:4px;}
    .inf-row{display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;}
    .inf-row.inf-head{margin-bottom:2px;font-size:10.5px;text-transform:uppercase;letter-spacing:0.05em;color:var(--graphite);font-weight:600;}
    .inf-n{flex:0 0 22px;text-align:right;font-size:11px;color:var(--graphite-light);padding-top:9px;}
    .inf-head .inf-n{padding-top:0;}
    .inf-cells{flex:1;display:flex;gap:8px;flex-wrap:wrap;min-width:0;}
    .inf-cells textarea{resize:vertical;}
    .inf-actions{flex:0 0 84px;display:flex;gap:3px;padding-top:4px;}
    .inf-actions button{border:1px solid var(--line);background:#fff;color:var(--navy);border-radius:4px;width:26px;height:26px;cursor:pointer;font-size:12px;padding:0;}
    .inf-actions button:disabled{opacity:0.3;cursor:default;}
    .inf-actions button.del{color:var(--red);}
    .inf-gen{font-size:10.5px;color:var(--graphite);padding-left:2px;}
    .inf-gen.ok{color:#1E7A4A;font-weight:600;}
    .inf-fotos-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;margin-bottom:8px;}
    .inf-foto{border:1px solid var(--line);border-radius:6px;padding:8px;background:#fff;display:flex;flex-direction:column;gap:6px;}
    .inf-thumb{position:relative;height:150px;background:var(--paper-dark);border-radius:4px;overflow:hidden;}
    .inf-thumb img{width:100%;height:100%;object-fit:cover;display:block;}
    .inf-foto-n{position:absolute;top:6px;left:6px;background:rgba(28,54,102,0.85);color:#fff;font-size:10.5px;padding:2px 7px;border-radius:3px;}
    .inf-foto input{font-size:12px;padding:6px 8px;}
    .inf-foto-actions{display:flex;gap:4px;align-items:center;}
    .inf-foto-add{align-items:center;justify-content:center;min-height:230px;border:2px dashed var(--line);cursor:pointer;color:var(--navy);font-weight:600;font-size:13px;text-align:center;}
    .inf-foto-add:hover{background:var(--paper);}
    @media (max-width: 760px){
      .field-row-4{grid-template-columns:1fr 1fr;}
      .inf-cells > *{flex:1 1 100% !important;width:100% !important;}
      .inf-head{display:none;}
      .inf-body{max-height:calc(100vh - 150px) !important;}
    }
  `;
  document.head.appendChild(s);
}
