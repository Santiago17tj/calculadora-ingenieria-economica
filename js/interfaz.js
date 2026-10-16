/* Interfaz de la calculadora: formularios, línea de tiempo, resultados y ejemplos de validación.
   Los cálculos los hace motor.js (objeto Fin); este archivo solo lee los datos y muestra los resultados. */
(function () {
  'use strict';
  const F = window.Fin;
  const byId = (id) => document.getElementById(id);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const radio = (name) => { const r = document.querySelector(`input[name="${name}"]:checked`); return r ? r.value : null; };
  const setRadio = (name, v) => { const r = document.querySelector(`input[name="${name}"][value="${v}"]`); if (r) r.checked = true; };

  const TODOS = ['diaria', 'mensual', 'bimestral', 'trimestral', 'cuatrimestral', 'semestral', 'anual'];
  const PAGOS = ['mensual', 'bimestral', 'trimestral', 'cuatrimestral', 'semestral', 'anual'];
  const MODULOS = ['compuesto', 'conversion', 'indexadas', 'vencida', 'anticipada', 'perpetua'];
  const NOMBRE_MOD = {
    compuesto: 'Interés compuesto', conversion: 'Conversión de tasas', indexadas: 'Tasas indexadas',
    vencida: 'Anualidad vencida', anticipada: 'Anualidad anticipada', perpetua: 'Anualidad perpetua',
  };
  const ultimo = {};   // último resultado de cada módulo
  const vigente = {};  // el resultado corresponde a los datos que están en pantalla

  // variables en cursiva, como en la hoja de fórmulas
  function mat(expr) {
    return String(expr).replace(/(^|[^\w$,.ñáéíóú])(VP|VF|EA|A|i|n|j|k|m)(?![\wñáéíóú])/g, '$1<i>$2</i>');
  }
  const simbolo = (s) => `<i>${esc(s)}</i>`;

  // ---------------------------------------------------------------- piezas de formulario
  function opcPer(lista, sel, comoUnidad) {
    return lista.map((p) => `<option value="${p}"${p === sel ? ' selected' : ''}>${cap(comoUnidad ? F.PER[p].unidades : F.PER[p].nombre)}</option>`).join('');
  }
  function opciones(name, legend, lista, sel, ayuda) {
    return `<fieldset id="c-${name}"><legend>${legend}</legend><div class="opciones">${lista.map((o) =>
      `<label><input type="radio" name="${name}" value="${o.v}"${o.v === sel ? ' checked' : ''}>${o.s ? `<span class="sim">${o.s}</span>` : ''}<span class="nom">${o.t}</span></label>`).join('')}</div>${ayuda ? `<p class="ayuda" id="${name}-ayuda">${ayuda}</p>` : ''}</fieldset>`;
  }
  function campoNum(id, etiqueta, tipo, antes, despues, nota) {
    return `<div class="campo" id="c-${id}"><label class="etiqueta" for="${id}">${etiqueta}${nota ? ` <span class="nom" style="font-weight:400;color:var(--lapiz)">${nota}</span>` : ''}</label>
      <div class="caja">${antes ? `<span class="unidad antes">${antes}</span>` : ''}<input id="${id}" data-tipo="${tipo}" inputmode="decimal" autocomplete="off" spellcheck="false">${despues ? `<span class="unidad" id="${id}-suf">${despues}</span>` : ''}</div>
      <div class="leido" id="${id}-leido"></div><div class="error" id="${id}-err" hidden></div></div>`;
  }
  const campoMonto = (id, et, nota) => campoNum(id, et, 'monto', '$', '', nota);
  const campoCant = (id, et, suf) => campoNum(id, et, 'cant', '', suf || 'periodos');
  const campoPct = (id, et, suf) => campoNum(id, et, 'tasa', '', suf || '%');
  const campoDec = (id, et, antes) => campoNum(id, et, 'dec', antes || '', '');
  function campoPer(id, etiqueta, lista, sel, comoUnidad) {
    return `<div class="campo" id="c-${id}"><label class="etiqueta" for="${id}">${etiqueta}</label><select id="${id}">${opcPer(lista, sel, comoUnidad)}</select><div class="error" id="${id}-err" hidden></div></div>`;
  }
  function selectoresTasa(id, def) {
    return `<select id="${id}-tipo" aria-label="Tipo de tasa">
        <option value="EA"${def.tipo === 'EA' ? ' selected' : ''}>Efectiva anual (EA)</option>
        <option value="nominal"${def.tipo === 'nominal' ? ' selected' : ''}>Nominal anual</option>
        <option value="periodica"${def.tipo === 'periodica' ? ' selected' : ''}>Periódica</option></select>
      <select id="${id}-per" aria-label="Periodo de la tasa">${opcPer(TODOS, def.per)}</select>
      <select id="${id}-mod" aria-label="Modalidad de la tasa">
        <option value="V"${def.mod !== 'A' ? ' selected' : ''}>Vencida</option>
        <option value="A"${def.mod === 'A' ? ' selected' : ''}>Anticipada</option></select>`;
  }
  function campoTasa(id, etiqueta, def, conEquiv) {
    def = Object.assign({ tipo: 'EA', per: 'mensual', mod: 'V' }, def);
    return `<fieldset class="campo ancho" id="c-${id}" data-tasa="${id}"><legend>${etiqueta}</legend>
      <div class="fila"><div class="caja"><input id="${id}-v" data-tipo="tasa" data-tasa-de="${id}" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="${etiqueta}, valor en porcentaje"><span class="unidad">%</span></div>${selectoresTasa(id, def)}</div>
      <div class="leido" id="${id}-leido"></div>${conEquiv ? `<div class="equiv" id="${id}-equiv"></div>` : ''}
      <div class="error" id="${id}-err" hidden></div></fieldset>`;
  }
  function campoTipoTasa(id, etiqueta, def) {
    def = Object.assign({ tipo: 'EA', per: 'mensual', mod: 'V' }, def);
    return `<fieldset class="campo ancho" id="c-${id}" data-tasa="${id}" data-sin-valor="1"><legend>${etiqueta}</legend>
      <div class="fila">${selectoresTasa(id, def)}</div><div class="leido" id="${id}-leido"></div><div class="error" id="${id}-err" hidden></div></fieldset>`;
  }
  function acciones(mod) {
    const ej = EJEMPLOS[mod] || [];
    return `<div class="acciones"><button type="submit" class="boton">Calcular</button>
      <button type="button" class="enlace" data-limpiar="${mod}">Limpiar</button>
      ${ej.length ? `<select class="ejemplos" id="${mod}-ej" aria-label="Cargar un ejercicio de validación"><option value="">Cargar ejercicio de validación</option>${ej.map((e, i) => `<option value="${i}">${esc(e.nombre)}</option>`).join('')}</select>` : ''}</div>
      <p class="nota-datos" id="${mod}-aviso-datos" hidden></p>`;
  }

  // ---------------------------------------------------------------- formularios
  function formCompuesto() {
    const m = 'compuesto';
    return `<h3>Datos</h3>` + opciones(`${m}-inc`, 'Calcular', [
      { v: 'VF', s: 'VF', t: 'valor futuro' }, { v: 'VP', s: 'VP', t: 'valor presente' },
      { v: 'i', s: 'i', t: 'tasa' }, { v: 'n', s: 'n', t: 'tiempo' }], 'VF') +
      `<div class="campos">${campoMonto(`${m}-VP`, 'Valor presente')}${campoMonto(`${m}-VF`, 'Valor futuro')}
       ${campoCant(`${m}-n`, 'Tiempo', 'meses')}${campoPer(`${m}-unidad`, 'Unidad del tiempo', TODOS, 'mensual', true)}
       ${campoTasa(`${m}-tasa`, 'Tasa de interés', { tipo: 'EA' }, true)}</div>` + acciones(m);
  }
  function formConversion() {
    const m = 'conversion';
    return `<h3>Datos</h3><div class="campos">${campoTasa(`${m}-origen`, 'Tasa conocida', { tipo: 'nominal', per: 'mensual', mod: 'V' })}
      ${campoTipoTasa(`${m}-destino`, 'Convertir a', { tipo: 'EA' })}</div>` + acciones(m);
  }
  function formIndexadas() {
    const m = 'indexadas';
    return `<h3>Datos</h3>` + opciones(`${m}-ind`, 'Indicador', [
      { v: 'DTF', s: 'DTF', t: '' }, { v: 'IBR', s: 'IBR', t: '' }, { v: 'IPC', s: 'IPC', t: '' }, { v: 'UVR', s: 'UVR', t: '' }], 'DTF') +
      `<p class="ayuda" id="${m}-regla-nota"></p>
      <div class="campos">
        <div class="campo ancho" id="c-${m}-uvrmodo-box" hidden>${opciones(`${m}-uvrmodo`, 'Variación de la UVR', [{ v: 'pct', t: 'la conozco en porcentaje' }, { v: 'valores', t: 'calcularla con dos valores de la UVR' }], 'pct')}</div>
        ${campoPct(`${m}-valor`, 'Valor del indicador')}
        ${campoDec(`${m}-uvrIni`, 'Valor inicial de la UVR', '$')}${campoDec(`${m}-uvrFin`, 'Valor final de la UVR', '$')}
        ${campoCant(`${m}-uvrDias`, 'Días entre los dos valores', 'días')}
        ${campoPct(`${m}-puntos`, 'Puntos adicionales', 'puntos')}
        ${campoTipoTasa(`${m}-expr`, 'Expresión del indicador y de los puntos', { tipo: 'nominal', per: 'trimestral', mod: 'A' })}
        <div class="campo ancho" id="c-${m}-otra-box"><label class="check"><input type="checkbox" id="${m}-otra"> Los puntos vienen en otra expresión</label></div>
        ${campoTipoTasa(`${m}-exprp`, 'Expresión de los puntos', { tipo: 'EA' })}
        ${campoTasa(`${m}-spread`, 'Margen', { tipo: 'EA' })}
        ${campoTipoTasa(`${m}-destino`, 'Expresar la tasa resultante como', { tipo: 'EA' })}
      </div>
      <details class="ayuda-uvr" id="${m}-uvr-ayuda" hidden><summary>Convertir unidades UVR a pesos</summary>
        <div class="campos" style="margin-top:10px">${campoNum(`${m}-uvrUnid`, 'Cantidad de UVR', 'monto', '', 'UVR')}${campoDec(`${m}-uvrValor`, 'Valor de una UVR', '$')}</div>
        <p class="salida-uvr" id="${m}-uvr-pesos"></p></details>` + acciones(m);
  }
  function formAnualidad(m) {
    return `<h3>Datos</h3>` + opciones(`${m}-inc`, 'Calcular', [
      { v: 'VP', s: 'VP', t: 'valor presente' }, { v: 'VF', s: 'VF', t: 'valor futuro' }, { v: 'A', s: 'A', t: 'cuota' },
      { v: 'n', s: 'n', t: 'número de pagos' }, { v: 'i', s: 'i', t: 'tasa' }], m === 'vencida' ? 'A' : 'VP') +
      opciones(`${m}-base`, 'A partir de', [{ v: 'VP', s: 'VP', t: 'valor presente (una deuda)' }, { v: 'VF', s: 'VF', t: 'valor futuro (una meta de ahorro)' }], 'VP') +
      `<div class="campos">${campoMonto(`${m}-VP`, 'Valor presente')}${campoMonto(`${m}-VF`, 'Valor futuro')}
       ${campoMonto(`${m}-A`, 'Cuota', m === 'anticipada' ? 'al inicio de cada periodo' : 'al final de cada periodo')}
       ${campoCant(`${m}-n`, 'Número de pagos', 'pagos')}${campoPer(`${m}-per`, 'Periodicidad de los pagos', PAGOS, 'mensual')}
       ${campoTasa(`${m}-tasa`, 'Tasa de interés', { tipo: 'EA' }, true)}</div>` + acciones(m);
  }
  function formPerpetua() {
    const m = 'perpetua';
    return `<h3>Datos</h3>` + opciones(`${m}-mod`, 'Modalidad', [{ v: 'V', t: 'vencida, el primer pago es al final del primer periodo' }, { v: 'A', t: 'anticipada, el primer pago es hoy' }], 'V') +
      opciones(`${m}-inc`, 'Calcular', [
        { v: 'VP', s: 'VP', t: 'capital requerido' }, { v: 'A', s: 'A', t: 'pago sostenible' }, { v: 'i', s: 'i', t: 'tasa' }], 'VP') +
      `<div class="campos">${campoMonto(`${m}-VP`, 'Capital disponible')}${campoMonto(`${m}-A`, 'Pago periódico')}
       ${campoPer(`${m}-per`, 'Periodicidad de los pagos', PAGOS, 'semestral')}
       ${campoTasa(`${m}-tasa`, 'Tasa de interés', { tipo: 'EA' }, true)}</div>` + acciones(m);
  }

  // ---------------------------------------------------------------- ejercicios de validación
  const EJEMPLOS = {
    compuesto: [{ nombre: 'Ejercicio 1: valor futuro del ahorro a 30 meses', inc: 'VF',
      campos: { 'compuesto-VP': '15.000.000', 'compuesto-n': '30', 'compuesto-unidad': 'mensual' },
      tasas: { 'compuesto-tasa': { v: '10,8', tipo: 'nominal', per: 'trimestral', mod: 'A' } } }],
    conversion: [
      { nombre: 'Ejercicio 2: 12,65 % NTA (oferta A) a mensual vencida', tasas: { 'conversion-origen': { v: '12,65', tipo: 'nominal', per: 'trimestral', mod: 'A' } },
        tipos: { 'conversion-destino': { tipo: 'periodica', per: 'mensual', mod: 'V' } } },
      { nombre: 'Ejemplo: 24 % NMA a efectiva anual', tasas: { 'conversion-origen': { v: '24', tipo: 'nominal', per: 'mensual', mod: 'A' } },
        tipos: { 'conversion-destino': { tipo: 'EA' } } }],
    indexadas: [
      { nombre: 'Ejercicio 2, oferta A: DTF + 4,20 puntos (NTA)', ind: 'DTF', campos: { 'indexadas-valor': '8,45', 'indexadas-puntos': '4,20' },
        tipos: { 'indexadas-expr': { tipo: 'nominal', per: 'trimestral', mod: 'A' }, 'indexadas-destino': { tipo: 'periodica', per: 'mensual', mod: 'V' } } },
      { nombre: 'Ejercicio 2, oferta B: IBR + 3,60 puntos (NMV)', ind: 'IBR', campos: { 'indexadas-valor': '8,90', 'indexadas-puntos': '3,60' },
        tipos: { 'indexadas-expr': { tipo: 'nominal', per: 'mensual', mod: 'V' }, 'indexadas-destino': { tipo: 'periodica', per: 'mensual', mod: 'V' } } },
      { nombre: 'Ejercicio 2, oferta C: IPC + 6,80 % EA', ind: 'IPC', campos: { 'indexadas-valor': '5,10' },
        tasas: { 'indexadas-spread': { v: '6,80', tipo: 'EA' } }, tipos: { 'indexadas-destino': { tipo: 'periodica', per: 'mensual', mod: 'V' } } },
      { nombre: 'Ejercicio 2, oferta D: UVR + 7,10 % EA', ind: 'UVR', uvrmodo: 'valores',
        campos: { 'indexadas-uvrIni': '391,8634', 'indexadas-uvrFin': '412,3058', 'indexadas-uvrDias': '365' },
        tasas: { 'indexadas-spread': { v: '7,10', tipo: 'EA' } }, tipos: { 'indexadas-destino': { tipo: 'periodica', per: 'mensual', mod: 'V' } } },
      { nombre: 'Ejercicio 5: rentabilidad del fondo, IPC + 4,50 % EA', ind: 'IPC', campos: { 'indexadas-valor': '5,10' },
        tasas: { 'indexadas-spread': { v: '4,50', tipo: 'EA' } }, tipos: { 'indexadas-destino': { tipo: 'periodica', per: 'semestral', mod: 'V' } } }],
    vencida: [{ nombre: 'Ejercicio 3: cuota del crédito del vehículo', inc: 'A', base: 'VP',
      campos: { 'vencida-VP': '72.000.000', 'vencida-n': '36', 'vencida-per': 'mensual' }, tasas: { 'vencida-tasa': { v: '16,8', tipo: 'EA' } } }],
    anticipada: [{ nombre: 'Ejercicio 4: valor presente del arriendo', inc: 'VP',
      campos: { 'anticipada-A': '4.200.000', 'anticipada-n': '24', 'anticipada-per': 'mensual' },
      tasas: { 'anticipada-tasa': { v: '13,2', tipo: 'nominal', per: 'trimestral', mod: 'V' } } }],
    perpetua: [{ nombre: 'Ejercicio 5: capital del fondo de becas', mod: 'V', inc: 'VP',
      campos: { 'perpetua-A': '18.000.000', 'perpetua-per': 'semestral' }, tasas: { 'perpetua-tasa': { v: '9,8295', tipo: 'EA' } } }],
  };

  // ---------------------------------------------------------------- lectura de datos
  const leerMonto = (id) => F.leerNumero(byId(id).value, 'monto');
  const leerCant = (id) => F.leerNumero(byId(id).value, 'cant');
  const leerPct = (id) => F.leerNumero(byId(id).value, 'tasa') / 100;
  const leerDec = (id) => F.leerNumero(byId(id).value, 'dec');
  function leerTipo(id) { return { tipo: byId(`${id}-tipo`).value, per: byId(`${id}-per`).value, mod: byId(`${id}-mod`).value }; }
  function leerTasa(id) { const t = leerTipo(id); return F.T(F.leerNumero(byId(`${id}-v`).value, 'tasa') / 100, t.tipo, t.per, t.mod); }
  function ponerTipo(id, t) {
    byId(`${id}-tipo`).value = t.tipo || 'EA';
    if (t.per) byId(`${id}-per`).value = t.per;
    byId(`${id}-mod`).value = t.mod || 'V';
    actualizarDet(id);
  }

  // ---------------------------------------------------------------- qué campos se muestran
  function mostrar(id, si) { const el = byId(`c-${id}`); if (el) el.hidden = !si; }
  function actualizarDet(id) {
    const ea = byId(`${id}-tipo`).value === 'EA';
    byId(`${id}-per`).hidden = ea;
    byId(`${id}-mod`).hidden = ea;
    const per = byId(`${id}-per`);
    per.setAttribute('aria-label', byId(`${id}-tipo`).value === 'nominal' ? 'Capitalización' : 'Periodo de la tasa');
  }
  function actualizarVista(m) {
    const inc = radio(`${m}-inc`);
    if (m === 'compuesto') {
      mostrar(`${m}-VP`, inc !== 'VP'); mostrar(`${m}-VF`, inc !== 'VF'); mostrar(`${m}-n`, inc !== 'n'); mostrar(`${m}-tasa`, inc !== 'i');
      byId(`${m}-unidad`).previousElementSibling.textContent = inc === 'n' ? 'Expresar el tiempo en' : 'Unidad del tiempo';
      byId(`${m}-n-suf`).textContent = F.PER[byId(`${m}-unidad`).value].unidades;
    } else if (m === 'vencida' || m === 'anticipada') {
      const usaBase = inc === 'A' || inc === 'n' || inc === 'i';
      const base = radio(`${m}-base`);
      mostrar(`${m}-base`, usaBase);
      mostrar(`${m}-VP`, usaBase && base === 'VP'); mostrar(`${m}-VF`, usaBase && base === 'VF');
      mostrar(`${m}-A`, inc !== 'A'); mostrar(`${m}-n`, inc !== 'n'); mostrar(`${m}-tasa`, inc !== 'i');
      const per = byId(`${m}-per`).value;
      byId(`${m}-n-suf`).textContent = `pagos ${per === 'mensual' ? 'mensuales' : F.PER[per].nombre + 'es'}`;
    } else if (m === 'perpetua') {
      mostrar(`${m}-VP`, inc === 'A' || inc === 'i'); mostrar(`${m}-A`, inc === 'VP' || inc === 'i'); mostrar(`${m}-tasa`, inc !== 'i');
    } else if (m === 'indexadas') {
      const ind = radio(`${m}-ind`);
      const mercado = ind === 'DTF' || ind === 'IBR';
      const uvrVal = ind === 'UVR' && radio(`${m}-uvrmodo`) === 'valores';
      byId(`c-${m}-uvrmodo-box`).hidden = ind !== 'UVR';
      mostrar(`${m}-valor`, !uvrVal);
      ['uvrIni', 'uvrFin', 'uvrDias'].forEach((c) => mostrar(`${m}-${c}`, uvrVal));
      mostrar(`${m}-puntos`, mercado); mostrar(`${m}-expr`, mercado);
      byId(`c-${m}-otra-box`).hidden = !mercado;
      mostrar(`${m}-exprp`, mercado && byId(`${m}-otra`).checked);
      byId(`c-${m}-expr`).querySelector('legend').textContent = byId(`${m}-otra`).checked ? 'Expresión del indicador' : 'Expresión del indicador y de los puntos';
      mostrar(`${m}-spread`, !mercado);
      byId(`${m}-uvr-ayuda`).hidden = ind !== 'UVR';
      byId(`c-${m}-valor`).querySelector('label').textContent = { DTF: 'Valor de la DTF', IBR: 'Valor del IBR', IPC: 'IPC, variación anual', UVR: 'Variación anual de la UVR' }[ind];
      byId(`${m}-regla-nota`).textContent = mercado
        ? `La ${ind === 'DTF' ? 'DTF' : 'IBR'} es un indicador de mercado de naturaleza nominal: los puntos se suman en la misma expresión de la tasa.`.replace('La IBR', 'El IBR')
        : `${ind === 'IPC' ? 'El IPC' : 'La UVR, que se ajusta con el IPC,'} es un indicador de precios de naturaleza efectiva: se compone con el margen, (1 + ${ind})(1 + margen) − 1.`;
    }
    $$(`#f-${m} [data-tasa]`).forEach((fs) => actualizarDet(fs.dataset.tasa));
    actualizarLeidos(m);
    dibujar(m);
  }

  // ---------------------------------------------------------------- lecturas en vivo debajo de cada campo
  function periodoObjetivo(m) {
    if (m === 'compuesto') return byId('compuesto-unidad').value;
    if (m === 'vencida' || m === 'anticipada' || m === 'perpetua') return byId(`${m}-per`).value;
    return null;
  }
  function actualizarLeidos(m) {
    $$(`#f-${m} input[data-tipo]`).forEach((inp) => {
      if (inp.dataset.tasaDe) return;
      const out = byId(`${inp.id}-leido`);
      if (!out) return;
      const raw = inp.value.trim();
      if (!raw) { out.textContent = ''; return; }
      const t = inp.dataset.tipo;
      const v = F.leerNumero(raw, t === 'monto' ? 'monto' : 'otro');
      if (!isFinite(v)) { out.textContent = 'No se reconoce el número.'; return; }
      if (t === 'monto') out.textContent = inp.id.endsWith('uvrUnid') ? `Leído como ${F.num(v, 4)} UVR` : `Leído como ${F.money(v)}`;
      else if (t === 'tasa') out.textContent = `Leído como ${F.num(v, 4)} ${inp.id.endsWith('puntos') ? 'puntos porcentuales' : '%'}`;
      else if (t === 'dec') out.textContent = `Leído como ${F.num(v, 4)}`;
      else out.textContent = `Leído como ${F.cant(v)}`;
    });
    $$(`#f-${m} [data-tasa]`).forEach((fs) => {
      const id = fs.dataset.tasa;
      const out = byId(`${id}-leido`);
      if (fs.dataset.sinValor) { const t = leerTipo(id); out.textContent = `Tasa ${F.nombreTasa(F.T(1, t.tipo, t.per, t.mod))}`; return; }
      const eq = byId(`${id}-equiv`);
      if (eq) eq.textContent = '';
      const raw = byId(`${id}-v`).value.trim();
      if (!raw) { out.textContent = ''; return; }
      const t = leerTasa(id);
      if (!isFinite(t.v)) { out.textContent = 'No se reconoce el número.'; return; }
      out.textContent = `Leída como ${F.describirTasa(t)}`;
      const per = periodoObjetivo(m);
      if (eq && per) {
        try { F.validarTasa(t); const r = F.tasaPeriodo(t, per); eq.textContent = `Para el cálculo se usa ${F.pct(r.i)} ${F.PER[per].nombre} vencida (${F.pct(r.ea)} EA).`; } catch (e) { eq.textContent = ''; }
      }
    });
    if (m === 'indexadas') {
      const u = leerMonto('indexadas-uvrUnid'), val = leerDec('indexadas-uvrValor');
      byId('indexadas-uvr-pesos').textContent = isFinite(u) && isFinite(val) && u > 0 && val > 0
        ? `${F.num(u, 4)} UVR × ${F.money(val)} = ${F.money(u * val)}` : 'Escriba la cantidad de UVR y el valor de la unidad en la fecha.';
    }
  }

  // ---------------------------------------------------------------- línea de tiempo (papel cuadriculado)
  const YE = 122;
  let G = { W: 1000, X0: 90, X1: 910 };          // geometría del dibujo; en pantallas angostas se usa una más corta
  function fmtCorto(x) { return Math.abs(x - Math.round(x)) < 0.005 ? '$ ' + F.num(Math.round(x), 0) : F.money(x); }
  function ranuras(N, desconocido) {
    const movil = G.W < 1000;
    if (desconocido) return (movil ? [0, 1, 2, 'corte', 'n'] : [0, 1, 2, 3, 'corte', 'n']).map((p) => (p === 'corte' ? { corte: true } : { p, etq: p === 'n' ? 'n' : String(p) }));
    if (movil) {
      if (N <= 5) return Array.from({ length: N + 1 }, (_, p) => ({ p, etq: String(p) }));
      return [0, 1, 2, 'corte', N - 1, N].map((p) => (p === 'corte' ? { corte: true } : { p, etq: String(p) }));
    }
    if (N <= 24) {
      const paso = N <= 12 ? 1 : 6;
      return Array.from({ length: N + 1 }, (_, p) => ({ p, etq: (p % paso === 0 || p === N) ? String(p) : undefined }));
    }
    return [0, 1, 2, 3, 'corte', N - 2, N - 1, N].map((p) => (p === 'corte' ? { corte: true } : { p, etq: String(p) }));
  }
  function svgLinea(spec) {
    const out = [];
    const { W, X0, X1 } = G;
    const s = spec.ranuras;
    const paso = (X1 - X0) / (s.length - 1);
    s.forEach((z, k) => { z.x = X0 + k * paso; });
    const xDe = (p) => { const z = s.find((r) => r.p === p); return z ? z.x : null; };
    const anclar = (x) => (x < X0 + 70 ? ['start', x - 10] : x > X1 - 70 ? ['end', x + 10] : ['middle', x]);
    out.push(`<line class="tl-eje" x1="${X0 - (W < 1000 ? 20 : 40)}" y1="${YE}" x2="${X1 + (W < 1000 ? 20 : 40)}" y2="${YE}"/>`);
    s.forEach((z) => {
      if (z.corte) { out.push(`<rect x="${z.x - 26}" y="${YE - 7}" width="52" height="14" fill="#FFFFFF"/><text class="tl-corte" x="${z.x}" y="${YE + 7}" text-anchor="middle">···</text>`); return; }
      out.push(`<line class="tl-marca" x1="${z.x}" y1="${YE - 8}" x2="${z.x}" y2="${YE + 8}"/>`);
      if (z.etq !== undefined) out.push(`<text class="tl-num" x="${z.x}" y="${YE + 28}" text-anchor="middle">${z.etq}</text>`);
    });
    const flechaArriba = (p, txt, inc) => {
      const x = xDe(p); if (x === null) return;
      const c = inc ? 'tl-inc' : 'tl-unico';
      out.push(`<line class="${c}" x1="${x}" y1="${YE - 12}" x2="${x}" y2="${52}"/><path class="${c}" d="M${x - 7},${54} L${x},${40} L${x + 7},${54} Z"/>`);
      const [a, xt] = anclar(x);
      out.push(`<text class="tl-txt${inc ? ' inc' : ''}" x="${xt}" y="${28}" text-anchor="${a}">${txt}</text>`);
    };
    const flechaAbajo = (p, cls, inc) => {
      const x = xDe(p); if (x === null) return null;
      const c = inc ? 'tl-inc' : cls;
      out.push(`<line class="${c}" x1="${x}" y1="${YE + 40}" x2="${x}" y2="${YE + 84}"/><path class="${c}" d="M${x - 6},${YE + 82} L${x},${YE + 95} L${x + 6},${YE + 82} Z"/>`);
      return x;
    };
    if (spec.unicoAbajo) {
      const x = flechaAbajo(spec.unicoAbajo.p, 'tl-unico', spec.unicoAbajo.inc);
      const [a, xt] = anclar(x);
      out.push(`<text class="tl-txt${spec.unicoAbajo.inc ? ' inc' : ''}" x="${xt}" y="${YE + 118}" text-anchor="${a}">${spec.unicoAbajo.txt}</text>`);
    }
    (spec.arriba || []).forEach((u) => flechaArriba(u.p, u.txt, u.inc));
    if (spec.pagos) {
      const xs = [];
      spec.pagos.lista.forEach((p) => { const x = flechaAbajo(p, 'tl-pago', spec.pagos.inc); if (x !== null) xs.push(x); });
      if (spec.pagos.ultimo) {
        const x = flechaAbajo(spec.pagos.ultimo.p, 'tl-pago', true);
        if (x !== null) { const [a, xt] = anclar(x); out.push(`<text class="tl-txt inc" x="${xt}" y="${YE + 118}" text-anchor="${a}">${spec.pagos.ultimo.txt}</text>`); }
      }
      if (xs.length) {
        const cx = spec.pagos.ultimo ? (xs[0] + xs[xs.length - 1]) / 2 - 30 : (xs[0] + xs[xs.length - 1]) / 2;
        out.push(`<text class="tl-txt ${spec.pagos.inc ? 'inc' : 'pago'}" x="${cx}" y="${YE + 118}" text-anchor="middle">${spec.pagos.txt}</text>`);
      }
    }
    if (spec.centro) out.push(`<text class="tl-txt${spec.centro.inc ? ' inc' : ''}" x="${(X0 + X1) / 2}" y="${YE - 18}" text-anchor="middle">${spec.centro.txt}</text>`);
    return `<div class="lienzo"><svg viewBox="0 0 ${W} 250" style="min-width:${W < 1000 ? 0 : 640}px" role="img" aria-label="Línea de tiempo">${out.join('')}</svg></div><p class="pie-diagrama">${esc(spec.pie)}</p>`;
  }

  function textoValor(sim, valor, inc, res, fmt) {
    if (inc) return res ? `${sim} = ${fmt(res.valor)}` : `${sim} = ?`;
    return isFinite(valor) && valor > 0 ? `${sim} = ${fmt(valor)}` : sim;
  }
  function specLinea(m) {
    const res = vigente[m] ? ultimo[m] : null;
    const inc = radio(`${m}-inc`);
    if (m === 'compuesto') {
      const U = F.PER[byId('compuesto-unidad').value];
      const nDato = inc === 'n' ? (res ? res.valor : NaN) : leerCant('compuesto-n');
      const conocido = isFinite(nDato) && nDato > 0;
      const N = conocido ? Math.max(1, Math.ceil(nDato - 1e-9)) : 0;
      const ran = conocido ? ranuras(N, false) : ranuras(0, true);
      const fin = conocido ? N : 'n';
      const ult = ran.find((r) => r.p === fin);
      if (ult) ult.etq = conocido ? `${F.cant(nDato)} ${U.unidades}` : (inc === 'n' ? 'n = ?' : 'n');
      const spec = { ranuras: ran, pie: `Tiempo en ${U.unidades}. VP es lo que se invierte hoy y VF lo que se tiene al final del ${U.sust} ${conocido ? F.cant(nDato) : 'n'}.` };
      spec.unicoAbajo = { p: 0, txt: textoValor('VP', leerMonto('compuesto-VP'), inc === 'VP', res, fmtCorto), inc: inc === 'VP' };
      spec.arriba = [{ p: fin, txt: textoValor('VF', leerMonto('compuesto-VF'), inc === 'VF', res, fmtCorto), inc: inc === 'VF' }];
      if (inc === 'i') spec.centro = { txt: res ? `i = ${F.pct(res.valor)} ${U.nombre}` : 'i = ?', inc: true };
      if (inc === 'n' && ult) ult.etq = res ? `n = ${F.num(res.valor, 4)}` : 'n = ?';
      return spec;
    }
    if (m === 'vencida' || m === 'anticipada') {
      const ant = m === 'anticipada';
      const per = byId(`${m}-per`).value, P = F.PER[per];
      const base = (inc === 'VP' || inc === 'VF') ? inc : radio(`${m}-base`);
      const nDato = inc === 'n' ? (res ? res.valor : NaN) : leerCant(`${m}-n`);
      const conocido = isFinite(nDato) && nDato > 0;
      const N = conocido ? Math.max(1, Math.ceil(nDato - 1e-9)) : 0;
      const ran = conocido ? ranuras(N, false) : ranuras(0, true);
      const fin = conocido ? N : 'n';
      if (inc === 'n') { const z = ran.find((r) => r.p === fin); if (z) z.etq = res ? String(N) : 'n = ?'; }
      const aj = res && res.ajuste && !res.ajuste.entero ? res.ajuste : null;
      let lista = [];
      if (conocido) {
        const ini = ant ? 0 : 1, ult = ant ? N - 1 : N;
        for (let p = ini; p <= ult; p++) lista.push(p);
        if (aj) lista = lista.filter((p) => (aj.sinPagoFinal ? p !== ult : p !== aj.periodoX));
      } else {
        lista = G.W < 1000 ? (ant ? [0, 1, 2] : [1, 2, 'n']) : (ant ? [0, 1, 2, 3] : [1, 2, 3, 'n']);
      }
      const Aval = leerMonto(`${m}-A`);
      const txtA = inc === 'A' ? (res ? `A = ${fmtCorto(res.valor)}` : 'A = ?') : (isFinite(Aval) && Aval > 0 ? `A = ${fmtCorto(Aval)} cada ${P.sust}` : 'A');
      const spec = { ranuras: ran, pagos: { lista, txt: txtA, inc: inc === 'A' } };
      if (aj && !aj.sinPagoFinal) spec.pagos.ultimo = { p: aj.periodoX, txt: `X = ${fmtCorto(aj.X)}` };
      if (base === 'VF') spec.arriba = [{ p: fin, txt: textoValor('VF', leerMonto(`${m}-VF`), inc === 'VF', res, fmtCorto), inc: inc === 'VF' }];
      else spec.arriba = [{ p: 0, txt: textoValor('VP', leerMonto(`${m}-VP`), inc === 'VP', res, fmtCorto), inc: inc === 'VP' }];
      if (inc === 'i') spec.centro = { txt: res ? `i = ${F.pct(res.valor)} ${P.nombre}` : 'i = ?', inc: true };
      if (inc === 'n' && res) spec.centro = { txt: `n teórico = ${F.num(res.valor, 4)}`, inc: true };
      const desde = ant ? 0 : 1, hasta = conocido ? (ant ? N - 1 : N) : 'n';
      spec.pie = `Periodos en ${P.unidades}. Pagos ${ant ? 'anticipados' : 'vencidos'} del ${P.sust} ${desde} al ${P.sust} ${conocido ? hasta : (ant ? 'n − 1' : 'n')}${aj && !aj.sinPagoFinal ? `; el último (X) es menor que la cuota` : ''}. ${base === 'VF' ? `VF está al final del ${P.sust} ${conocido ? N : 'n'}.` : `VP está en el ${P.sust} 0.`}`;
      return spec;
    }
    if (m === 'perpetua') {
      const ant = radio('perpetua-mod') === 'A';
      const per = byId('perpetua-per').value, P = F.PER[per];
      const ult = G.W < 1000 ? 3 : 6;
      const ran = Array.from({ length: ult + 1 }, (_, p) => ({ p, etq: String(p) })).concat([{ corte: true }, { p: 'inf', etq: '∞' }]);
      const Aval = leerMonto('perpetua-A');
      const txtA = inc === 'A' ? (res ? `A = ${fmtCorto(res.valor)}` : 'A = ?') : (isFinite(Aval) && Aval > 0 ? `A = ${fmtCorto(Aval)} cada ${P.sust}` : 'A');
      const lista = Array.from({ length: ult + (ant ? 1 : 0) }, (_, k) => (ant ? k : k + 1));
      const spec = { ranuras: ran, pagos: { lista, txt: txtA, inc: inc === 'A' } };
      spec.arriba = [{ p: 0, txt: textoValor('VP', leerMonto('perpetua-VP'), inc === 'VP', res, fmtCorto), inc: inc === 'VP' }];
      if (inc === 'i') spec.centro = { txt: res ? `i = ${F.pct(res.valor)} ${P.nombre}` : 'i = ?', inc: true };
      spec.pie = `Periodos en ${P.unidades}. ${ant ? 'El primer pago se hace hoy, en el periodo 0,' : 'El primer pago se hace al final del periodo 1,'} y los pagos no terminan.`;
      return spec;
    }
    return null;
  }

  // camino de conversión para tasas
  const OPS = [
    [/^Tasa periódica$/, 'divide entre <i>k</i>'],
    [/^De anticipada a vencida$/, '<i>i</i><sub>a</sub> / (1 − <i>i</i><sub>a</sub>)'],
    [/^De vencida a anticipada$/, '<i>i</i><sub>v</sub> / (1 + <i>i</i><sub>v</sub>)'],
    [/^Tasa efectiva anual$/, '(1 + <i>i</i>)<sup><i>k</i></sup> − 1'],
    [/equivalente$/, '(1 + <i>EA</i>)<sup>1/<i>k</i></sup> − 1'],
    [/^Tasa nominal$/, 'multiplica por <i>k</i>'],
    [/^Variación anual de la UVR$/, 'variación anual'],
  ];
  function partirTasa(txt) {
    const r = String(txt).match(/^(-?[\d.,]+ %)\s*(.*)$/);
    return r ? { valor: r[1], tipo: r[2] } : { valor: txt, tipo: '' };
  }
  function htmlCadena(m, res) {
    const nodos = [], ops = [];
    if (m === 'conversion') {
      nodos.push(partirTasa(F.describirTasa(res.origen)));
    } else {
      const ind = res.indicador;
      if (ind === 'DTF' || ind === 'IBR') nodos.push({ valor: `${ind} ${F.num(res.datos.valor * 100, 2)} %`, tipo: `más ${F.num(res.datos.puntos * 100, 2)} puntos` });
      else if (ind === 'UVR' && res.datos.uvr && res.datos.uvr.modo === 'valores') nodos.push({ valor: `UVR ${F.num(res.datos.uvr.inicial, 4)}`, tipo: `a ${F.num(res.datos.uvr.final, 4)} en ${F.num(res.datos.uvr.dias, 0)} días` });
      else nodos.push({ valor: `${ind} ${F.num(res.datos.valor * 100, 2)} %`, tipo: `con margen de ${F.num(res.datos.spread.v * 100, 2)} % ${F.sigla(res.datos.spread)}` });
    }
    res.pasos.forEach((p) => {
      if (!p.r) return;
      let op = null;
      if (p.t === 'Tasa indexada') op = res.regla === 'suma' ? 'se suman' : 'se componen';
      else for (const [re, txt] of OPS) { if (re.test(p.t)) { op = txt; break; } }
      if (!op) return;
      ops.push(op);
      nodos.push(partirTasa(p.r));
    });
    if (nodos.length === 1) { ops.push('igual'); nodos.push(partirTasa(res.texto)); }
    let h = '<ol class="cadena">';
    nodos.forEach((n, k) => {
      h += '<li>';
      if (k > 0) h += `<span class="paso"><span>${ops[k - 1]}</span><span class="punta"></span></span>`;
      h += `<span class="nodo${k === nodos.length - 1 ? ' final' : ''}"><span class="valor">${esc(n.valor)}</span><span class="tipo">${esc(n.tipo)}</span></span></li>`;
    });
    h += '</ol>';
    const pie = m === 'conversion' ? 'Pasos de la conversión, de la tasa conocida a la tasa pedida.' : `Pasos de la tasa indexada: el indicador ${res.regla === 'suma' ? 'se suma con los puntos' : 'se compone con el margen'} y luego se convierte a la periodicidad pedida.`;
    return `${h}<p class="pie-diagrama">${pie}</p>`;
  }
  function dibujar(m) {
    const fig = byId(`d-${m}`);
    if (!fig) return;
    if (m === 'conversion' || m === 'indexadas') {
      const res = ultimo[m];
      fig.innerHTML = res ? htmlCadena(m, res) : `<p class="pie-diagrama" style="border:0">Al presionar Calcular aquí aparece cada paso de la conversión de la tasa.</p>`;
      return;
    }
    const ancho = fig.clientWidth || 1000;
    G = ancho < 600 ? { W: 440, X0: 44, X1: 396 } : { W: 1000, X0: 90, X1: 910 };
    const spec = specLinea(m);
    fig.innerHTML = spec ? svgLinea(spec) : '';
  }
  let esperaRedibujo = null;
  window.addEventListener('resize', () => {
    clearTimeout(esperaRedibujo);
    esperaRedibujo = setTimeout(() => MODULOS.forEach((m) => { if (!byId(`mod-${m}`).hidden) dibujar(m); }), 150);
  });

  // ---------------------------------------------------------------- errores
  function limpiarErrores(m) {
    $$(`#f-${m} .campo.invalido`).forEach((c) => c.classList.remove('invalido'));
    $$(`#f-${m} .error`).forEach((e) => { e.hidden = true; e.textContent = ''; });
  }
  function mostrarError(m, e) {
    const campo = e.campo ? `${m}-${e.campo}` : null;
    const cont = campo && byId(`c-${campo}`);
    if (cont && !cont.hidden) {
      cont.classList.add('invalido');
      const er = byId(`${campo}-err`);
      if (er) { er.textContent = e.message; er.hidden = false; }
    }
    byId(`r-${m}`).innerHTML = `<h3>Resultado</h3><p class="fallo" role="alert"><b>Revise los datos</b>${esc(e.message)}</p>`;
    ultimo[m] = null; vigente[m] = false;
    dibujar(m);
  }

  // ---------------------------------------------------------------- resultado
  function vacioHTML(m) {
    const t = {
      compuesto: 'Elija qué quiere calcular, escriba los demás datos con su unidad y presione Calcular.',
      conversion: 'Escriba la tasa conocida con su tipo, periodo y modalidad, elija a qué la quiere convertir y presione Calcular.',
      indexadas: 'Elija el indicador, escriba su valor y los puntos o el margen, y elija cómo quiere expresar la tasa resultante.',
      vencida: 'Elija qué quiere calcular, escriba los datos y la periodicidad de los pagos y presione Calcular.',
      anticipada: 'Elija qué quiere calcular, escriba los datos y la periodicidad de los pagos y presione Calcular.',
      perpetua: 'Elija la modalidad y qué quiere calcular, escriba los datos y presione Calcular.',
    };
    return `<h3>Resultado</h3><p class="vacio">${t[m]} Aquí aparecen el valor calculado, la tasa que se usó y el procedimiento.</p>`;
  }
  function ajusteHTML(res) {
    const a = res.ajuste;
    if (!a) return '';
    if (a.entero) return `<p class="ajuste">El número de pagos es exacto: ${F.num(a.m, 0)} pagos completos.</p>`;
    if (a.sinPagoFinal) return `<p class="ajuste">El <i>n</i> teórico es ${F.num(a.teorico, 4)}. Con ${F.num(a.completos, 0)} pagos completos, al final del periodo ${F.num(a.m, 0)} el saldo ya supera el valor futuro en ${F.money(a.excedente)}, así que no hace falta otro pago.</p>`;
    return `<p class="ajuste">El <i>n</i> teórico es ${F.num(a.teorico, 4)}. Como los pagos se cuentan completos se necesitan <b>${F.num(a.m, 0)} pagos</b>: ${F.num(a.completos, 0)} de ${F.money(a.A)} y un último pago menor de <b>${F.money(a.X)}</b> en el periodo ${F.num(a.periodoX, 0)}.</p>`;
  }
  function htmlResultado(m, res) {
    let h = `<h3>Resultado</h3><p class="desactualizado" id="r-${m}-stale" hidden>Los datos cambiaron. Presione Calcular para actualizar el resultado.</p>`;
    h += `<p class="valor">${simbolo(res.simbolo)} = ${esc(res.texto)}</p><p class="que">${esc(res.nombre)}</p>`;
    if (res.decimal) h += `<p class="decimal">En forma decimal, ${esc(res.decimal)}</p>`;
    if (res.regla) h += `<p class="regla">Regla aplicada: <b>${res.regla === 'suma' ? 'suma' : 'composición'}</b>, porque ${res.regla === 'suma' ? 'es un indicador de mercado' : 'es un indicador de precios'}.</p>`;
    if (res.tasaUsada) h += `<p class="tasa-usada">Se calculó con ${F.pct(res.tasaUsada.i)} ${F.PER[res.tasaUsada.per].nombre} vencida, equivalente a ${F.pct(res.tasaUsada.ea)} EA. ${esc(res.notaTasa || '')}</p>`;
    if (res.extras && res.extras.length) h += `<dl class="detalle">${res.extras.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
    h += ajusteHTML(res);
    (res.avisos || []).forEach((a) => { h += `<p class="aviso">${esc(a)}</p>`; });
    if (res.equiv) {
      h += `<h4>Tasas equivalentes</h4><div class="tabla-equiv"><table><thead><tr><th>Periodo</th><th>Periódica vencida</th><th>Periódica anticipada</th><th>Nominal vencida</th><th>Nominal anticipada</th></tr></thead><tbody>` +
        res.equiv.map((r) => { const d = r.per === 'diaria' ? 6 : 4; return `<tr><td>${cap(F.PER[r.per].nombre)}, k = ${r.k}</td><td>${F.pct(r.iv, d)}</td><td>${F.pct(r.ia, d)}</td><td>${F.pct(r.jv)}</td><td>${F.pct(r.ja)}</td></tr>`; }).join('') + `</tbody></table></div>`;
    }
    h += `<h4>Procedimiento</h4><ol class="pasos">${res.pasos.map((p) => `<li><span class="t">${esc(p.t)}</span><span class="e">${mat(p.e)}</span>${p.r ? `<span class="r">${esc(p.r)}</span>` : ''}</li>`).join('')}</ol>`;
    h += `<div class="acciones-res"><button type="button" class="enlace" data-copiar="${m}">Copiar resultado</button>`;
    if (res.tasaResultado) {
      const destinos = ['compuesto', 'conversion', 'vencida', 'anticipada', 'perpetua'].filter((x) => x !== m);
      h += `<label for="${m}-usar">Usar esta tasa en</label><select id="${m}-usar">${destinos.map((d) => `<option value="${d}">${NOMBRE_MOD[d]}</option>`).join('')}</select><button type="button" class="enlace" data-usar="${m}">Llevar la tasa</button>`;
    }
    h += `<span class="copiado" id="${m}-copiado" aria-live="polite"></span></div>`;
    return h;
  }

  // un campo con texto que no se puede leer como número se informa como tal, no como si estuviera vacío
  function primerNoNumerico(m) {
    for (const inp of $$(`#f-${m} input[data-tipo]`)) {
      const raw = inp.value.trim();
      if (!raw || inp.offsetParent === null) continue;
      if (!isNaN(F.leerNumero(raw, inp.dataset.tipo))) continue;
      const caja = inp.closest('.campo');
      const rotulo = caja && caja.querySelector('legend, .etiqueta');
      const nombre = rotulo ? rotulo.childNodes[0].textContent.trim() : 'uno de los campos';
      return { message: `El dato escrito en «${nombre}» (${raw}) no es un número válido. Use solo cifras, con coma o punto decimal, por ejemplo 1.500.000,75.`,
        campo: (inp.dataset.tasaDe || inp.id).slice(m.length + 1) };
    }
    return null;
  }

  let cargandoInicial = true;
  function calcular(m) {
    limpiarErrores(m);
    const noNumerico = primerNoNumerico(m);
    if (noNumerico) { mostrarError(m, noNumerico); return null; }
    let res;
    try {
      const inc = radio(`${m}-inc`);
      if (m === 'compuesto') {
        res = F.compuesto({ incognita: inc, VP: leerMonto('compuesto-VP'), VF: leerMonto('compuesto-VF'), n: leerCant('compuesto-n'),
          unidad: byId('compuesto-unidad').value, tasa: leerTasa('compuesto-tasa') });
      } else if (m === 'conversion') {
        const t = leerTasa('conversion-origen');
        const c = F.convertir(t, leerTipo('conversion-destino'), 'origen');
        res = { simbolo: 'i', nombre: 'Tasa convertida', valor: c.valor, texto: F.describirTasa(c.dest), decimal: F.dec(c.valor, 10), pasos: c.pasos,
          extras: [['Tasa original', F.describirTasa(t)], ['Tasa efectiva anual', `${F.pct(c.ea)} EA`]], avisos: [],
          tasaResultado: F.T(c.ea, 'EA'), equiv: F.equivalencias(t), origen: t };
      } else if (m === 'indexadas') {
        const ind = radio('indexadas-ind');
        const d = { indicador: ind, valor: leerPct('indexadas-valor'), destino: leerTipo('indexadas-destino') };
        if (ind === 'DTF' || ind === 'IBR') {
          d.expr = leerTipo('indexadas-expr'); d.puntos = leerPct('indexadas-puntos');
          d.exprPuntos = byId('indexadas-otra').checked ? leerTipo('indexadas-exprp') : null;
        } else {
          d.spread = leerTasa('indexadas-spread');
          if (ind === 'UVR') d.uvr = { modo: radio('indexadas-uvrmodo'), inicial: leerDec('indexadas-uvrIni'), final: leerDec('indexadas-uvrFin'), dias: leerCant('indexadas-uvrDias') };
        }
        res = F.indexada(d);
        res.datos = d;
      } else if (m === 'vencida' || m === 'anticipada') {
        res = F.anualidad({ modalidad: m === 'anticipada' ? 'A' : 'V', incognita: inc, base: radio(`${m}-base`),
          VP: leerMonto(`${m}-VP`), VF: leerMonto(`${m}-VF`), A: leerMonto(`${m}-A`), n: leerCant(`${m}-n`),
          tasa: leerTasa(`${m}-tasa`), per: byId(`${m}-per`).value });
      } else if (m === 'perpetua') {
        res = F.perpetua({ modalidad: radio('perpetua-mod'), incognita: inc, VP: leerMonto('perpetua-VP'), A: leerMonto('perpetua-A'),
          tasa: leerTasa('perpetua-tasa'), per: byId('perpetua-per').value });
      }
    } catch (e) {
      if (e && e.name === 'FinError') mostrarError(m, e);
      else { console.error(e); mostrarError(m, { message: 'No fue posible hacer el cálculo con esos datos. Revise que todos los campos tengan números válidos.' }); }
      return null;
    }
    ultimo[m] = res; vigente[m] = true;
    byId(`r-${m}`).innerHTML = htmlResultado(m, res);
    dibujar(m);
    if (!cargandoInicial && window.matchMedia && window.matchMedia('(max-width: 959px)').matches) {
      byId(`r-${m}`).scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
    return res;
  }

  function marcarDesactualizado(m) {
    if (!ultimo[m] || !vigente[m]) return;
    vigente[m] = false;
    const s = byId(`r-${m}-stale`);
    if (s) s.hidden = false;
  }

  function limpiar(m) {
    $$(`#f-${m} input[data-tipo]`).forEach((i) => { i.value = ''; });
    byId(`${m}-aviso-datos`).hidden = true;
    limpiarErrores(m);
    ultimo[m] = null; vigente[m] = false;
    byId(`r-${m}`).innerHTML = vacioHTML(m);
    actualizarLeidos(m);
    dibujar(m);
  }

  function cargarEjemplo(m, idx) {
    const e = EJEMPLOS[m][idx];
    if (!e) return;
    $$(`#f-${m} input[data-tipo]`).forEach((i) => { i.value = ''; });
    if (e.ind) setRadio('indexadas-ind', e.ind);
    if (m === 'indexadas') { setRadio('indexadas-uvrmodo', e.uvrmodo || 'pct'); byId('indexadas-otra').checked = false; }
    if (e.mod) setRadio(`${m}-mod`, e.mod);
    if (e.inc) setRadio(`${m}-inc`, e.inc);
    if (e.base) setRadio(`${m}-base`, e.base);
    Object.entries(e.campos || {}).forEach(([id, v]) => { byId(id).value = v; });
    Object.entries(e.tasas || {}).forEach(([id, t]) => { byId(`${id}-v`).value = t.v; ponerTipo(id, t); });
    Object.entries(e.tipos || {}).forEach(([id, t]) => ponerTipo(id, t));
    actualizarVista(m);
    const aviso = byId(`${m}-aviso-datos`);
    aviso.textContent = `Datos cargados: ${e.nombre}. Puede cambiarlos o usar Limpiar para escribir los suyos.`;
    aviso.hidden = false;
    calcular(m);
  }

  function llevarTasa(desde) {
    const res = ultimo[desde];
    const hacia = byId(`${desde}-usar`).value;
    if (!res || !res.tasaResultado) return;
    const id = hacia === 'conversion' ? 'conversion-origen' : `${hacia}-tasa`;
    byId(`${id}-v`).value = F.num(res.tasaResultado.v * 100, 10).replace(/\./g, '');
    ponerTipo(id, { tipo: 'EA' });
    if (radio(`${hacia}-inc`) === 'i') { const primera = document.querySelector(`input[name="${hacia}-inc"]`); if (primera) primera.checked = true; }
    actualizarVista(hacia);
    const aviso = byId(`${hacia}-aviso-datos`);
    aviso.textContent = `Tasa traída desde ${NOMBRE_MOD[desde]}: ${F.pct(res.tasaResultado.v)} EA, con todos sus decimales. Complete los demás datos y presione Calcular.`;
    aviso.hidden = false;
    marcarDesactualizado(hacia);
    activar(hacia, true);
  }

  // ---------------------------------------------------------------- módulos (pestañas)
  function activar(m, foco) {
    MODULOS.forEach((x) => {
      const on = x === m;
      byId(`tab-${x}`).setAttribute('aria-selected', on ? 'true' : 'false');
      byId(`tab-${x}`).tabIndex = on ? 0 : -1;
      byId(`mod-${x}`).hidden = !on;
    });
    try { localStorage.setItem('calc-ie-pestana', m); } catch (e) { /* sin almacenamiento */ }
    dibujar(m);
    if (foco) byId(`tab-${m}`).focus();
  }

  function init() {
    const forms = { compuesto: formCompuesto(), conversion: formConversion(), indexadas: formIndexadas(), vencida: formAnualidad('vencida'), anticipada: formAnualidad('anticipada'), perpetua: formPerpetua() };
    MODULOS.forEach((m) => {
      const f = byId(`f-${m}`);
      f.innerHTML = forms[m];
      byId(`r-${m}`).innerHTML = vacioHTML(m);
      f.addEventListener('submit', (ev) => { ev.preventDefault(); calcular(m); });
      f.addEventListener('input', (ev) => {
        if (ev.target.matches('input[data-tipo]')) { marcarDesactualizado(m); actualizarLeidos(m); dibujar(m); }
      });
      f.addEventListener('change', (ev) => {
        const t = ev.target;
        if (t.id === `${m}-ej`) { if (t.value !== '') cargarEjemplo(m, Number(t.value)); t.value = ''; return; }
        if (t.matches('select[id$="-tipo"]')) actualizarDet(t.id.replace(/-tipo$/, ''));
        if (t.name === 'indexadas-ind') {
          if (t.value === 'DTF') ponerTipo('indexadas-expr', { tipo: 'nominal', per: 'trimestral', mod: 'A' });
          if (t.value === 'IBR') ponerTipo('indexadas-expr', { tipo: 'nominal', per: 'mensual', mod: 'V' });
        }
        marcarDesactualizado(m);
        actualizarVista(m);
      });
    });
    document.addEventListener('click', (ev) => {
      const t = ev.target.closest('button');
      if (!t) return;
      if (t.dataset.limpiar) limpiar(t.dataset.limpiar);
      if (t.dataset.usar) llevarTasa(t.dataset.usar);
      if (t.dataset.copiar) {
        const m = t.dataset.copiar, res = ultimo[m];
        if (!res) return;
        const txt = `${res.simbolo} = ${res.texto}`;
        try { navigator.clipboard.writeText(txt).then(() => { byId(`${m}-copiado`).textContent = 'Copiado'; }, () => { byId(`${m}-copiado`).textContent = txt; }); }
        catch (e) { byId(`${m}-copiado`).textContent = txt; }
      }
    });
    const nav = byId('modulos');
    nav.addEventListener('click', (ev) => { const b = ev.target.closest('button[data-mod]'); if (b) activar(b.dataset.mod); });
    nav.addEventListener('keydown', (ev) => {
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
      const actual = MODULOS.findIndex((x) => byId(`tab-${x}`).getAttribute('aria-selected') === 'true');
      activar(MODULOS[(actual + (ev.key === 'ArrowRight' ? 1 : MODULOS.length - 1)) % MODULOS.length], true);
      ev.preventDefault();
    });
    const base = byId('base-dias');
    try { const b = localStorage.getItem('calc-ie-base'); if (b === '365') base.value = '365'; } catch (e) { /* sin almacenamiento */ }
    F.setBaseDias(Number(base.value));
    base.addEventListener('change', () => {
      F.setBaseDias(Number(base.value));
      try { localStorage.setItem('calc-ie-base', base.value); } catch (e) { /* sin almacenamiento */ }
      MODULOS.forEach((m) => { marcarDesactualizado(m); actualizarLeidos(m); });
    });
    MODULOS.forEach((m) => { actualizarVista(m); if (EJEMPLOS[m] && EJEMPLOS[m].length) cargarEjemplo(m, 0); });
    let inicial = 'compuesto';
    const hash = (location.hash || '').replace('#', '');
    if (MODULOS.includes(hash)) inicial = hash;
    else { try { const s = localStorage.getItem('calc-ie-pestana'); if (MODULOS.includes(s)) inicial = s; } catch (e) { /* sin almacenamiento */ } }
    activar(inicial);
    window.addEventListener('hashchange', () => { const h = (location.hash || '').replace('#', ''); if (MODULOS.includes(h)) activar(h); });
    cargandoInicial = false;
  }

  window.CalcUI = { calcular, cargarEjemplo, activar, limpiar, EJEMPLOS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
