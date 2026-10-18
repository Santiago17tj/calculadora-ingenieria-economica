/* Motor de cálculo de la Calculadora de Ingeniería Económica.
   Todas las tasas se manejan en forma decimal (0,12 = 12 %). */
(function (global) {
  'use strict';

  // ---------------------------------------------------------------- periodicidades
  const PER = {
    diaria:        { k: 360, nombre: 'diaria',        sust: 'día',          unidades: 'días',          letra: 'D' },
    semanal:       { k: 52,  nombre: 'semanal',       sust: 'semana',       unidades: 'semanas',       letra: '', fem: true },
    quincenal:     { k: 24,  nombre: 'quincenal',     sust: 'quincena',     unidades: 'quincenas',     letra: 'Q', fem: true },
    mensual:       { k: 12,  nombre: 'mensual',       sust: 'mes',          unidades: 'meses',         letra: 'M' },
    bimestral:     { k: 6,   nombre: 'bimestral',     sust: 'bimestre',     unidades: 'bimestres',     letra: 'B' },
    trimestral:    { k: 4,   nombre: 'trimestral',    sust: 'trimestre',    unidades: 'trimestres',    letra: 'T' },
    cuatrimestral: { k: 3,   nombre: 'cuatrimestral', sust: 'cuatrimestre', unidades: 'cuatrimestres', letra: 'C' },
    semestral:     { k: 2,   nombre: 'semestral',     sust: 'semestre',     unidades: 'semestres',     letra: 'S' },
    anual:         { k: 1,   nombre: 'anual',         sust: 'año',          unidades: 'años',          letra: 'A' },
  };
  const ORDEN = ['diaria', 'semanal', 'quincenal', 'mensual', 'bimestral', 'trimestral', 'cuatrimestral', 'semestral', 'anual'];
  let baseDias = 360;

  function setBaseDias(b) {
    b = Number(b);
    if (b !== 360 && b !== 365) throw new Error('La base de días debe ser 360 o 365.');
    baseDias = b;
    PER.diaria.k = b;
  }
  function getBaseDias() { return baseDias; }

  class FinError extends Error {
    constructor(msg, campo) { super(msg); this.name = 'FinError'; this.campo = campo || null; }
  }

  function k(per) {
    if (!PER[per]) throw new FinError('Seleccione una periodicidad válida.');
    return per === 'diaria' ? baseDias : PER[per].k;
  }

  // ---------------------------------------------------------------- formato colombiano
  function num(x, d) {
    if (typeof x !== 'number' || !isFinite(x)) return '—';
    const s = Math.abs(x).toFixed(d);
    if (/e/.test(s)) return x.toExponential(4).replace('.', ',');
    const neg = x < 0 && Number(s) !== 0;
    const partes = s.split('.');
    const ent = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-' : '') + ent + (partes.length > 1 ? ',' + partes[1] : '');
  }
  const pct = (x, d = 4) => num(x * 100, d) + ' %';
  const dec = (x, d = 10) => num(x, d);
  const money = (x) => '$ ' + num(x, 2);
  function cant(x) { // número de periodos: entero si lo es, si no 4 decimales
    return Math.abs(x - Math.round(x)) < 1e-9 ? num(Math.round(x), 0) : num(x, 4);
  }

  // Lee números escritos con coma o punto decimal y separadores de miles.
  // tipo 'monto': un solo punto seguido de tres cifras se toma como separador de miles (5.000 = 5000).
  function leerNumero(texto, tipo) {
    if (texto === null || texto === undefined) return NaN;
    let s = String(texto).trim().replace(/[\s $%]/g, '');
    if (s === '') return NaN;
    let signo = 1;
    if (s[0] === '-' || s[0] === '+' || s[0] === '−') { if (s[0] !== '+') signo = -1; s = s.slice(1); }
    if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return NaN;
    const comas = (s.match(/,/g) || []).length;
    const puntos = (s.match(/\./g) || []).length;
    if (comas && puntos) {
      const ult = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
      const decSep = s[ult];
      const milSep = decSep === ',' ? '.' : ',';
      if (s.split(decSep).length - 1 > 1) return NaN;
      if (s.indexOf(milSep) > ult) return NaN;
      s = s.split(milSep).join('').replace(decSep, '.');
    } else if (comas) {
      s = comas > 1 ? s.split(',').join('') : s.replace(',', '.');
    } else if (puntos) {
      if (puntos > 1) s = s.split('.').join('');
      else if (tipo === 'monto') {
        const [a, b] = s.split('.');
        if (b.length === 3 && a.length >= 1 && a.length <= 3 && Number(a) !== 0) s = a + b;
      }
    }
    const v = Number(s);
    return isFinite(v) ? signo * v : NaN;
  }

  // ---------------------------------------------------------------- tasas
  // Una tasa es { v, tipo: 'EA' | 'nominal' | 'periodica', per, mod: 'V' | 'A' }
  function T(v, tipo, per, mod) {
    mod = mod === 'A' ? 'A' : 'V';
    if (tipo === 'EA' || ((tipo === 'nominal' || tipo === 'periodica') && per === 'anual' && mod === 'V')) {
      return { v, tipo: 'EA', per: 'anual', mod: 'V' };
    }
    if (tipo === 'nominal' && per === 'anual') tipo = 'periodica'; // nominal anual anticipada = anual anticipada
    return { v, tipo, per, mod };
  }
  function mismaExpr(a, b) {
    a = T(1, a.tipo, a.per, a.mod); b = T(1, b.tipo, b.per, b.mod);
    return a.tipo === b.tipo && a.per === b.per && a.mod === b.mod;
  }
  const modTxt = (m) => (m === 'A' ? 'anticipada' : 'vencida');
  // Siglas solo para EA y nominales (NMV, NTA, NSV...). En clase las nominales también se escriben MV, TA o SV,
  // por eso las tasas periódicas no llevan sigla y se nombran con su periodo: 1,5 % mensual vencida.
  function sigla(t) {
    t = T(t.v, t.tipo, t.per, t.mod);
    if (t.tipo === 'EA') return 'EA';
    const P = PER[t.per];
    if (t.tipo === 'nominal' && P.letra) return 'N' + P.letra + t.mod;
    if (t.tipo === 'nominal') return `nominal ${P.sust} ${modNominal(P, t.mod)}`;
    return `${P.nombre} ${modTxt(t.mod)}`;
  }
  const modNominal = (P, m) => (m === 'A' ? (P.fem ? 'anticipada' : 'anticipado') : (P.fem ? 'vencida' : 'vencido'));
  function nombreTasa(t) {
    t = T(t.v, t.tipo, t.per, t.mod);
    if (t.tipo === 'EA') return 'efectiva anual (EA)';
    const P = PER[t.per];
    if (t.tipo === 'nominal') return `nominal ${P.sust} ${modNominal(P, t.mod)}${P.letra ? ` (${sigla(t)})` : ''}`;
    return `${P.nombre} ${modTxt(t.mod)}`;
  }
  const describirTasa = (t) => `${pct(t.v)} ${nombreTasa(t)}`;

  function validarTasa(t, campo, permitirNoPositiva) {
    campo = campo || 'tasa';
    if (!t || !isFinite(t.v)) throw new FinError('Ingrese el valor de la tasa de interés.', campo);
    if (!permitirNoPositiva && !(t.v > 0)) throw new FinError('La tasa de interés debe ser mayor que 0 %.', campo);
    if (t.tipo !== 'EA') {
      const kk = k(t.per);
      const ip = t.tipo === 'nominal' ? t.v / kk : t.v;
      if (t.mod === 'A' && ip >= 1) {
        throw new FinError(`La tasa anticipada por periodo da ${pct(ip, 2)}. Una tasa anticipada debe ser menor que 100 % por periodo, porque el interés se descuenta al inicio del periodo.`, campo);
      }
      if (ip <= -1) throw new FinError('La tasa por periodo debe ser mayor que -100 %.', campo);
    } else if (t.v <= -1) {
      throw new FinError('La tasa efectiva anual debe ser mayor que -100 %.', campo);
    }
  }

  const paso = (t, e, r) => ({ t, e, r });

  // Lleva cualquier tasa a tasa efectiva vencida de su propio periodo.
  function aPeriodicaVencida(t) {
    t = T(t.v, t.tipo, t.per, t.mod);
    const pasos = [];
    if (t.tipo === 'EA') return { i: t.v, per: 'anual', pasos };
    const kk = k(t.per);
    const P = PER[t.per];
    let ip = t.v;
    if (t.tipo === 'nominal') {
      ip = t.v / kk;
      pasos.push(paso('Tasa periódica', `i = j / k = ${pct(t.v)} / ${kk}`, `${pct(ip)} ${P.nombre} ${modTxt(t.mod)}`));
    }
    if (t.mod === 'A') {
      const iv = ip / (1 - ip);
      pasos.push(paso('De anticipada a vencida', `i<sub>v</sub> = i<sub>a</sub> / (1 − i<sub>a</sub>) = ${dec(ip)} / (1 − ${dec(ip)})`, `${pct(iv)} ${P.nombre} vencida`));
      ip = iv;
    }
    return { i: ip, per: t.per, pasos };
  }

  // Tasa efectiva vencida equivalente para el periodo perDest (pasando por la EA, como en clase).
  function tasaPeriodo(t, perDest) {
    const b = aPeriodicaVencida(t);
    const pasos = b.pasos;
    const kO = k(b.per);
    const kD = k(perDest);
    const ea = Math.pow(1 + b.i, kO) - 1;
    if (kO === kD) return { i: b.i, ea, pasos };
    if (kO !== 1) {
      pasos.push(paso('Tasa efectiva anual', `EA = (1 + i)<sup>${kO}</sup> − 1 = (${dec(1 + b.i)})<sup>${kO}</sup> − 1`, `${pct(ea)} EA`));
    }
    if (kD === 1) return { i: ea, ea, pasos };
    const i = Math.pow(1 + ea, 1 / kD) - 1;
    pasos.push(paso(`Tasa ${PER[perDest].nombre} equivalente`, `i = (1 + EA)<sup>1/${kD}</sup> − 1 = (${dec(1 + ea)})<sup>1/${kD}</sup> − 1`, `${pct(i)} ${PER[perDest].nombre} vencida`));
    return { i, ea, pasos };
  }

  function convertir(t, destino, campo, permitirNoPositiva) {
    validarTasa(t, campo, permitirNoPositiva);
    const dest = T(1, destino.tipo, destino.per, destino.mod);
    const perD = dest.tipo === 'EA' ? 'anual' : dest.per;
    const r = tasaPeriodo(t, perD);
    const pasos = r.pasos;
    let valor = r.i;
    if (dest.tipo !== 'EA') {
      let ip = r.i;
      if (dest.mod === 'A') {
        ip = r.i / (1 + r.i);
        pasos.push(paso('De vencida a anticipada', `i<sub>a</sub> = i<sub>v</sub> / (1 + i<sub>v</sub>) = ${dec(r.i)} / (1 + ${dec(r.i)})`, `${pct(ip)} ${PER[perD].nombre} anticipada`));
      }
      valor = ip;
      if (dest.tipo === 'nominal') {
        const kk = k(perD);
        valor = ip * kk;
        pasos.push(paso('Tasa nominal', `j = i × k = ${pct(ip)} × ${kk}`, `${pct(valor)} ${nombreTasa(dest)}`));
      }
    }
    if (!pasos.length) pasos.push(paso('Sin conversión', 'La tasa ya está en la forma pedida.', `${pct(valor)} ${nombreTasa(dest)}`));
    dest.v = valor;
    return { valor, ea: r.ea, iPer: r.i, dest, pasos };
  }

  function equivalencias(t) {
    validarTasa(t);
    const ea = tasaPeriodo(t, 'anual').ea;
    return ORDEN.map((per) => {
      const kk = k(per);
      const iv = Math.pow(1 + ea, 1 / kk) - 1;
      const ia = iv / (1 + iv);
      return { per, k: kk, iv, ia, jv: iv * kk, ja: ia * kk };
    });
  }

  // ---------------------------------------------------------------- factores
  const fpow = (i, n) => Math.exp(n * Math.log1p(i));             // (1 + i)^n
  const aN = (i, n) => -Math.expm1(-n * Math.log1p(i)) / i;       // [1 − (1 + i)^−n] / i
  const sN = (i, n) => Math.expm1(n * Math.log1p(i)) / i;         // [(1 + i)^n − 1] / i

  const NOMBRES = {
    VP: 'el valor presente (VP)', VF: 'el valor futuro (VF)', A: 'la cuota (A)', n: 'el número de periodos (n)',
  };
  function pos(x, campo, nombre) {
    if (!isFinite(x)) throw new FinError(`Ingrese ${nombre}.`, campo);
    if (!(x > 0)) throw new FinError(`${nombre.charAt(0).toUpperCase() + nombre.slice(1)} debe ser mayor que cero.`, campo);
  }
  function finito(x, campo) {
    if (!isFinite(x)) throw new FinError('El resultado sale de un rango numérico manejable. Revise la magnitud de los datos.', campo);
  }
  function noteCoherencia(perTasa, unidad) {
    return `El tiempo está en ${PER[unidad].unidades}, por eso la tasa se expresa como efectiva ${PER[unidad].nombre} antes de aplicar la fórmula.`;
  }

  // ---------------------------------------------------------------- interés compuesto
  function compuesto(d) {
    const U = PER[d.unidad];
    if (!U) throw new FinError('Seleccione la unidad en que está el tiempo.', 'unidad');
    const out = { pasos: [], avisos: [], extras: [] };
    const inc = d.incognita;
    if (inc === 'VF' || inc === 'i' || inc === 'n') pos(d.VP, 'VP', NOMBRES.VP);
    if (inc === 'VP' || inc === 'i' || inc === 'n') pos(d.VF, 'VF', NOMBRES.VF);
    if (inc !== 'n') pos(d.n, 'n', NOMBRES.n);
    let i, r;
    if (inc !== 'i') {
      validarTasa(d.tasa);
      r = tasaPeriodo(d.tasa, d.unidad);
      i = r.i;
      out.pasos.push(...r.pasos);
      out.tasaUsada = { i, per: d.unidad, ea: r.ea };
      out.notaTasa = noteCoherencia(d.tasa.per, d.unidad);
    }
    if (inc === 'VF') {
      const f = fpow(i, d.n);
      const VF = d.VP * f;
      finito(VF, 'VP');
      out.pasos.push(paso('Valor futuro', `VF = VP (1 + i)<sup>n</sup> = ${money(d.VP)} × (${dec(1 + i)})<sup>${cant(d.n)}</sup> = ${money(d.VP)} × ${num(f, 10)}`, money(VF)));
      Object.assign(out, { simbolo: 'VF', nombre: 'Valor futuro', valor: VF, texto: money(VF) });
      out.extras.push(['Intereses ganados (VF − VP)', money(VF - d.VP)]);
      out.linea = { tipo: 'compuesto', n: d.n, incognita: 'VF', unidad: d.unidad };
    } else if (inc === 'VP') {
      const f = fpow(i, d.n);
      const VP = d.VF / f;
      finito(VP, 'VF');
      out.pasos.push(paso('Valor presente', `VP = VF (1 + i)<sup>−n</sup> = ${money(d.VF)} / (${dec(1 + i)})<sup>${cant(d.n)}</sup> = ${money(d.VF)} / ${num(f, 10)}`, money(VP)));
      Object.assign(out, { simbolo: 'VP', nombre: 'Valor presente', valor: VP, texto: money(VP) });
      out.extras.push(['Intereses del periodo (VF − VP)', money(d.VF - VP)]);
      out.linea = { tipo: 'compuesto', n: d.n, incognita: 'VP', unidad: d.unidad };
    } else if (inc === 'i') {
      if (d.VF <= d.VP) throw new FinError('Para una tasa positiva el valor futuro debe ser mayor que el valor presente.', 'VF');
      const ratio = d.VF / d.VP;
      i = Math.pow(ratio, 1 / d.n) - 1;
      const kk = k(d.unidad);
      const ea = Math.pow(1 + i, kk) - 1;
      out.pasos.push(paso(`Tasa ${U.nombre}`, `i = (VF / VP)<sup>1/n</sup> − 1 = (${money(d.VF)} / ${money(d.VP)})<sup>1/${cant(d.n)}</sup> − 1 = (${num(ratio, 10)})<sup>1/${cant(d.n)}</sup> − 1`, `${pct(i)} ${U.nombre} vencida`));
      if (kk !== 1) out.pasos.push(paso('Tasa efectiva anual', `EA = (1 + i)<sup>${kk}</sup> − 1 = (${dec(1 + i)})<sup>${kk}</sup> − 1`, `${pct(ea)} EA`));
      Object.assign(out, { simbolo: 'i', nombre: `Tasa de interés ${U.nombre}`, valor: i, texto: `${pct(i)} ${U.nombre} vencida`, decimal: dec(i, 10) });
      out.extras.push(['Tasa efectiva anual', `${pct(ea)} EA`]);
      if (kk !== 1) out.extras.push(['Tasa nominal equivalente', describirTasa(T(i * kk, 'nominal', d.unidad, 'V'))]);
      out.tasaResultado = T(ea, 'EA');
      out.linea = { tipo: 'compuesto', n: d.n, incognita: 'i', unidad: d.unidad };
    } else if (inc === 'n') {
      if (d.VF <= d.VP) throw new FinError('Con una tasa positiva el valor futuro debe ser mayor que el valor presente; si no, el tiempo daría cero o negativo.', 'VF');
      const ratio = d.VF / d.VP;
      const n = Math.log(ratio) / Math.log1p(i);
      finito(n, 'VF');
      out.pasos.push(paso('Tiempo', `n = ln(VF / VP) / ln(1 + i) = ln(${num(ratio, 10)}) / ln(${dec(1 + i)})`, `${num(n, 4)} ${U.unidades}`));
      Object.assign(out, { simbolo: 'n', nombre: 'Tiempo', valor: n, texto: `${num(n, 4)} ${U.unidades}` });
      const enAnios = n / k(d.unidad);
      const meses = Math.round(enAnios * 12 * 100) / 100;
      const anios = Math.floor(meses / 12);
      const aniosMeses = `${anios} ${anios === 1 ? 'año' : 'años'} y ${num(meses - anios * 12, 2)} meses`;
      out.extras.push(['Equivale a', d.unidad === 'anual' ? aniosMeses : `${num(enAnios, 4)} años, es decir ${aniosMeses}`]);
      out.linea = { tipo: 'compuesto', n, incognita: 'n', unidad: d.unidad };
    } else {
      throw new FinError('Seleccione la variable que quiere calcular.');
    }
    return out;
  }

  // ---------------------------------------------------------------- tasas indexadas
  const INDICADORES = {
    DTF: { tipo: 'mercado', nombre: 'DTF', art: 'la', largo: 'DTF (tasa de captación de CDT a 90 días)' },
    IBR: { tipo: 'mercado', nombre: 'IBR', art: 'el', largo: 'IBR (Indicador Bancario de Referencia)' },
    IPC: { tipo: 'precios', nombre: 'IPC', art: 'el', largo: 'IPC (variación anual de precios al consumidor)' },
    UVR: { tipo: 'precios', nombre: 'UVR', art: 'la', largo: 'UVR (Unidad de Valor Real, ligada al IPC)' },
  };

  function indexada(d) {
    const IND = INDICADORES[d.indicador];
    if (!IND) throw new FinError('Seleccione el indicador.', 'indicador');
    const out = { pasos: [], avisos: [], extras: [], indicador: d.indicador };
    let resultante;
    if (IND.tipo === 'mercado') {
      out.regla = 'suma';
      const de = IND.art === 'la' ? 'de la' : 'del';
      if (!isFinite(d.valor)) throw new FinError(`Ingrese el valor ${de} ${IND.nombre}.`, 'valor');
      if (!(d.valor > 0)) throw new FinError(`El valor ${de} ${IND.nombre} debe ser mayor que 0 %.`, 'valor');
      if (!isFinite(d.puntos)) throw new FinError('Ingrese los puntos adicionales (spread).', 'puntos');
      const ind = T(d.valor, d.expr.tipo, d.expr.per, d.expr.mod);
      validarTasa(ind, 'valor');
      const ep = d.exprPuntos ? T(1, d.exprPuntos.tipo, d.exprPuntos.per, d.exprPuntos.mod) : T(1, ind.tipo, ind.per, ind.mod);
      out.pasos.push(paso('Regla del curso', `${IND.art === 'la' ? 'La' : 'El'} ${IND.nombre} es un indicador de mercado de naturaleza nominal, por eso los puntos se suman aritméticamente.`, ''));
      let base = ind.v;
      if (!mismaExpr(ind, ep)) {
        const c = convertir(ind, ep, 'valor');
        out.pasos.push(paso('Indicador en la expresión de los puntos', `Los puntos están en ${nombreTasa(ep)} y ${IND.art} ${IND.nombre} viene en ${nombreTasa(ind)}, así que primero se convierte el indicador.`, ''));
        out.pasos.push(...c.pasos);
        base = c.valor;
      }
      const total = base + d.puntos;
      resultante = T(total, ep.tipo, ep.per, ep.mod);
      out.pasos.push(paso('Tasa indexada', `${IND.nombre} + puntos = ${pct(base)} + ${num(d.puntos * 100, 4)} puntos`, describirTasa(resultante)));
      if (d.puntos < 0) out.avisos.push('Los puntos son negativos: la tasa queda por debajo del indicador. Verifique que así lo indique el enunciado.');
      validarTasa(resultante, 'puntos', true);
    } else {
      out.regla = 'composicion';
      let variacion = d.valor;
      if (d.indicador === 'UVR' && d.uvr && d.uvr.modo === 'valores') {
        const u = d.uvr;
        pos(u.inicial, 'uvrIni', 'el valor inicial de la UVR');
        pos(u.final, 'uvrFin', 'el valor final de la UVR');
        pos(u.dias, 'uvrDias', 'el número de días entre los dos valores');
        const r = u.final / u.inicial;
        variacion = Math.pow(r, 365 / u.dias) - 1;
        out.pasos.push(paso('Variación anual de la UVR', `v = (UVR<sub>final</sub> / UVR<sub>inicial</sub>)<sup>365/días</sup> − 1 = (${num(u.final, 4)} / ${num(u.inicial, 4)})<sup>365/${num(u.dias, 0)}</sup> − 1`, `${pct(variacion)} EA`));
        if (u.final < u.inicial) out.avisos.push('La UVR bajó entre las dos fechas, lo que equivale a una variación negativa (deflación).');
      } else {
        if (!isFinite(variacion)) throw new FinError(d.indicador === 'IPC' ? 'Ingrese el IPC (variación anual en %).' : 'Ingrese la variación anual de la UVR en %.', 'valor');
        if (variacion <= -1) throw new FinError('La variación debe ser mayor que -100 %.', 'valor');
        if (variacion < 0) out.avisos.push('La variación es negativa (deflación). El cálculo se hace igual, pero verifique el dato.');
      }
      validarTasa(d.spread, 'spread', true);
      let sEA = d.spread.v;
      out.pasos.push(paso('Regla del curso', `${IND.nombre === 'IPC' ? 'El IPC' : 'La UVR, que se ajusta con el IPC,'} es un indicador de precios de naturaleza efectiva, por eso se compone con el margen.`, ''));
      if (T(1, d.spread.tipo, d.spread.per, d.spread.mod).tipo !== 'EA') {
        const c = convertir(d.spread, { tipo: 'EA' }, 'spread', true);
        out.pasos.push(...c.pasos);
        sEA = c.valor;
      }
      const ea = (1 + variacion) * (1 + sEA) - 1;
      resultante = T(ea, 'EA');
      out.pasos.push(paso('Tasa indexada', `i = (1 + ${IND.nombre}) (1 + margen) − 1 = (${dec(1 + variacion)}) (${dec(1 + sEA)}) − 1`, `${pct(ea)} EA`));
      validarTasa(resultante, 'spread', true);
    }
    out.tasaIndexada = resultante;
    if (!(resultante.v > 0)) out.avisos.push('La tasa resultante es cero o negativa. Se muestra el cálculo, pero no se puede usar en los módulos de interés compuesto ni de anualidades.');
    const c = convertir(resultante, d.destino, 'destino', true);
    if (!mismaExpr(resultante, c.dest)) out.pasos.push(...c.pasos);
    out.ea = c.ea;
    out.destino = c.dest;
    Object.assign(out, {
      simbolo: 'i', nombre: 'Tasa indexada', valor: c.valor,
      texto: describirTasa(c.dest), decimal: dec(c.valor, 10),
    });
    out.extras.push(['Tasa indexada en su expresión original', describirTasa(resultante)]);
    out.extras.push(['Tasa efectiva anual', `${pct(c.ea)} EA`]);
    if (c.ea > 0) out.tasaResultado = T(c.ea, 'EA');
    return out;
  }

  // ---------------------------------------------------------------- anualidades (vencida y anticipada)
  function resolverTasa(g, creciente) {
    // g(i) monótona en i > 0; busca la raíz por bisección
    let lo = 1e-12, hi = 0.5;
    const signoLo = Math.sign(g(lo));
    let it = 0;
    while (Math.sign(g(hi)) === signoLo && it < 60) { hi *= 2; it++; }
    if (Math.sign(g(hi)) === signoLo) return NaN;
    for (let j = 0; j < 300; j++) {
      const mid = (lo + hi) / 2;
      if (Math.sign(g(mid)) === signoLo) lo = mid; else hi = mid;
      if (hi - lo < 1e-16) break;
    }
    return (lo + hi) / 2;
  }

  function anualidad(d) {
    const ant = d.modalidad === 'A';
    const P = PER[d.per];
    if (!P) throw new FinError('Seleccione la periodicidad de los pagos.', 'per');
    const out = { pasos: [], avisos: [], extras: [] };
    const inc = d.incognita;
    const base = inc === 'VP' ? 'VP' : inc === 'VF' ? 'VF' : (d.base === 'VF' ? 'VF' : 'VP');
    const fTxt = ant ? ' (1 + i)' : '';
    const nombreMod = ant ? 'anticipada' : 'vencida';

    if (inc === 'VP' || inc === 'VF') pos(d.A, 'A', NOMBRES.A);
    if (inc === 'A' || inc === 'n' || inc === 'i') pos(d[base], base, NOMBRES[base]);
    if (inc === 'n' || inc === 'i') pos(d.A, 'A', NOMBRES.A);
    if (inc !== 'n') {
      pos(d.n, 'n', NOMBRES.n);
      if (Math.abs(d.n - Math.round(d.n)) > 1e-9) out.avisos.push('El número de pagos no es entero. El cálculo se hace con la fórmula, pero en la práctica los pagos se cuentan completos.');
    }

    let i;
    if (inc !== 'i') {
      validarTasa(d.tasa);
      const r = tasaPeriodo(d.tasa, d.per);
      i = r.i;
      out.pasos.push(...r.pasos);
      out.tasaUsada = { i, per: d.per, ea: r.ea };
      out.notaTasa = `Los pagos son ${P.nombre === 'diaria' ? 'diarios' : P.nombre + 'es'}, por eso la tasa se expresa como efectiva ${P.nombre} vencida.`;
    }
    const f = ant ? 1 + i : 1;
    const fTxtNum = ant ? ` × ${dec(1 + i)}` : '';

    const pasoFP = (a) => paso('Factor de valor presente', `[1 − (1 + i)<sup>−n</sup>] / i = [1 − (${dec(1 + i)})<sup>−${cant(d.n)}</sup>] / ${dec(i)}`, num(a, 10));
    const pasoFF = (s) => paso('Factor de valor futuro', `[(1 + i)<sup>n</sup> − 1] / i = [(${dec(1 + i)})<sup>${cant(d.n)}</sup> − 1] / ${dec(i)}`, num(s, 10));
    if (inc === 'VP') {
      const a = aN(i, d.n);
      const VP = d.A * a * f;
      finito(VP, 'A');
      out.pasos.push(pasoFP(a));
      out.pasos.push(paso(`Valor presente de la anualidad ${nombreMod}`, `VP = A × factor${fTxt} = ${money(d.A)} × ${num(a, 10)}${fTxtNum}`, money(VP)));
      Object.assign(out, { simbolo: 'VP', nombre: 'Valor presente', valor: VP, texto: money(VP) });
      out.extras.push(['Suma de los pagos (n × A)', money(d.n * d.A)]);
      out.extras.push(['Intereses incluidos (n × A − VP)', money(d.n * d.A - VP)]);
    } else if (inc === 'VF') {
      const s = sN(i, d.n);
      const VF = d.A * s * f;
      finito(VF, 'A');
      out.pasos.push(pasoFF(s));
      out.pasos.push(paso(`Valor futuro de la anualidad ${nombreMod}`, `VF = A × factor${fTxt} = ${money(d.A)} × ${num(s, 10)}${fTxtNum}`, money(VF)));
      Object.assign(out, { simbolo: 'VF', nombre: ant ? 'Valor futuro al final del periodo n, un periodo después del último pago' : 'Valor futuro', valor: VF, texto: money(VF) });
      if (ant) out.extras.push(['Acumulado justo después del último pago (periodo n − 1)', money(VF / (1 + i))]);
      out.extras.push(['Suma de los pagos (n × A)', money(d.n * d.A)]);
      out.extras.push(['Intereses ganados (VF − n × A)', money(VF - d.n * d.A)]);
    } else if (inc === 'A') {
      let A;
      if (base === 'VP') {
        const a = aN(i, d.n);
        A = d.VP / (a * f);
        out.pasos.push(pasoFP(a));
        out.pasos.push(paso(`Cuota de la anualidad ${nombreMod}`, ant ? `A = VP / [factor × (1 + i)] = ${money(d.VP)} / (${num(a, 10)}${fTxtNum})` : `A = VP / factor = ${money(d.VP)} / ${num(a, 10)}`, money(A)));
        out.extras.push(['Suma de los pagos (n × A)', money(d.n * A)]);
        out.extras.push(['Intereses incluidos (n × A − VP)', money(d.n * A - d.VP)]);
      } else {
        const s = sN(i, d.n);
        A = d.VF / (s * f);
        out.pasos.push(pasoFF(s));
        out.pasos.push(paso(`Cuota de la anualidad ${nombreMod}`, ant ? `A = VF / [factor × (1 + i)] = ${money(d.VF)} / (${num(s, 10)}${fTxtNum})` : `A = VF / factor = ${money(d.VF)} / ${num(s, 10)}`, money(A)));
        out.extras.push(['Suma de los pagos (n × A)', money(d.n * A)]);
        out.extras.push(['Intereses ganados (VF − n × A)', money(d.VF - d.n * A)]);
      }
      finito(A, base);
      Object.assign(out, { simbolo: 'A', nombre: `Cuota ${P.nombre} ${nombreMod}`, valor: A, texto: money(A) });
    } else if (inc === 'n') {
      const Af = d.A * f;
      let n;
      if (base === 'VP') {
        const x = 1 - (d.VP * i) / Af;
        if (!(x > 0)) {
          const interes = (ant ? d.VP - d.A : d.VP) * i;
          throw new FinError(`La cuota no alcanza a cubrir los intereses: el saldo genera ${money(interes)} de interés en el primer periodo${ant ? ' (después del pago de hoy)' : ''} y la cuota es de ${money(d.A)}, así que la deuda nunca se termina de pagar. Aumente la cuota o revise la tasa.`, 'A');
        }
        n = -Math.log(x) / Math.log1p(i);
        const AfTxt = ant ? `[${money(d.A)} × ${dec(1 + i)}]` : money(d.A);
        out.pasos.push(paso('Número de pagos', `n = −ln[1 − VP i / A${fTxt}] / ln(1 + i) = −ln[1 − ${money(d.VP)} × ${dec(i)} / ${AfTxt}] / ln(${dec(1 + i)})`, `${num(n, 4)} pagos`));
      } else {
        n = Math.log(1 + (d.VF * i) / Af) / Math.log1p(i);
        const AfTxt = ant ? `[${money(d.A)} × ${dec(1 + i)}]` : money(d.A);
        out.pasos.push(paso('Número de pagos', `n = ln[VF i / A${fTxt} + 1] / ln(1 + i) = ln[${money(d.VF)} × ${dec(i)} / ${AfTxt} + 1] / ln(${dec(1 + i)})`, `${num(n, 4)} pagos`));
      }
      finito(n, base);
      Object.assign(out, { simbolo: 'n', nombre: 'Número de pagos', valor: n, texto: `${num(n, 4)} pagos ${P.nombre === 'diaria' ? 'diarios' : P.nombre + 'es'}` });
      const ent = Math.round(n);
      if (Math.abs(n - ent) < 1e-6) {
        out.ajuste = { entero: true, m: ent, A: d.A };
      } else {
        const m = Math.ceil(n);
        let X, periodoX, sobra = null;
        if (base === 'VP') {
          if (!ant) { X = (d.VP - d.A * aN(i, m - 1)) * fpow(i, m); periodoX = m; }
          else { X = (d.VP - d.A * aN(i, m - 1) * (1 + i)) * fpow(i, m - 1); periodoX = m - 1; }
        } else if (!ant) {
          X = d.VF - d.A * sN(i, m - 1) * (1 + i); periodoX = m;
        } else {
          X = d.VF / (1 + i) - d.A * sN(i, m - 1) * (1 + i); periodoX = m - 1;
        }
        if (X <= 0.005) {
          sobra = -X;
          out.ajuste = { entero: false, m, teorico: n, sinPagoFinal: true, completos: m - 1, excedente: sobra * (ant ? 1 + i : 1), A: d.A };
        } else {
          out.ajuste = { entero: false, m, teorico: n, completos: m - 1, X, periodoX, A: d.A };
        }
      }
    } else if (inc === 'i') {
      validarPer(d.per);
      let g;
      if (d.n === 1 && ((base === 'VF' && !ant) || (base === 'VP' && ant))) {
        throw new FinError(base === 'VF' ? 'Con un solo depósito al final del periodo el valor futuro es igual a la cuota, así que la tasa no influye y no se puede despejar.' : 'Con un solo pago hecho hoy el valor presente es igual a la cuota, así que la tasa no influye y no se puede despejar.', 'n');
      }
      if (base === 'VP') {
        if (d.A * d.n <= d.VP) throw new FinError('Con esos datos la suma de los pagos no supera el valor presente, así que no hay una tasa positiva que los iguale.', 'A');
        if (ant && d.A >= d.VP) throw new FinError('En una anualidad anticipada el primer pago se hace hoy; si la cuota es igual o mayor que el valor presente no existe una tasa positiva.', 'A');
        g = (x) => d.A * aN(x, d.n) * (ant ? 1 + x : 1) - d.VP;
      } else {
        if (d.A * d.n >= d.VF) throw new FinError('Con esos datos la suma de los depósitos ya alcanza el valor futuro, así que no hay una tasa positiva que los iguale.', 'A');
        g = (x) => d.A * sN(x, d.n) * (ant ? 1 + x : 1) - d.VF;
      }
      i = resolverTasa(g);
      if (!isFinite(i)) throw new FinError('No fue posible encontrar una tasa positiva con esos datos.', 'A');
      const kk = k(d.per);
      const ea = Math.pow(1 + i, kk) - 1;
      out.pasos.push(paso('Método', `La tasa no se puede despejar; se busca numéricamente (bisección) la i que cumple ${base} = A × ${base === 'VP' ? 'factor de valor presente' : 'factor de valor futuro'}${ant ? ' × (1 + i)' : ''}.`, ''));
      const fac = base === 'VP' ? aN(i, d.n) : sN(i, d.n);
      out.pasos.push(paso('Comprobación', `${money(d.A)} × ${num(fac, 10)}${ant ? ` × ${dec(1 + i)}` : ''}`, money(d.A * fac * (ant ? 1 + i : 1))));
      Object.assign(out, { simbolo: 'i', nombre: `Tasa ${P.nombre} vencida`, valor: i, texto: `${pct(i)} ${P.nombre} vencida`, decimal: dec(i, 10) });
      out.extras.push(['Tasa efectiva anual', `${pct(ea)} EA`]);
      if (kk !== 1) out.extras.push(['Tasa nominal equivalente', describirTasa(T(i * kk, 'nominal', d.per, 'V'))]);
      out.tasaResultado = T(ea, 'EA');
    } else {
      throw new FinError('Seleccione la variable que quiere calcular.');
    }
    out.linea = { tipo: 'anualidad', modalidad: ant ? 'A' : 'V', incognita: inc, base, n: inc === 'n' ? out.valor : d.n, per: d.per, ajuste: out.ajuste || null };
    return out;
  }
  function validarPer(per) { if (!PER[per]) throw new FinError('Seleccione la periodicidad de los pagos.', 'per'); }

  // ---------------------------------------------------------------- anualidad perpetua
  function perpetua(d) {
    const ant = d.modalidad === 'A';
    const P = PER[d.per];
    if (!P) throw new FinError('Seleccione la periodicidad de los pagos.', 'per');
    const out = { pasos: [], avisos: [], extras: [] };
    const inc = d.incognita;
    let i;
    if (inc !== 'i') {
      validarTasa(d.tasa);
      const r = tasaPeriodo(d.tasa, d.per);
      i = r.i;
      out.pasos.push(...r.pasos);
      out.tasaUsada = { i, per: d.per, ea: r.ea };
      out.notaTasa = `Los pagos son ${P.nombre}es, por eso la tasa se expresa como efectiva ${P.nombre} vencida.`;
    }
    if (inc === 'VP') {
      pos(d.A, 'A', 'el pago periódico (A)');
      const VP = ant ? (d.A * (1 + i)) / i : d.A / i;
      finito(VP, 'A');
      out.pasos.push(paso(`Capital de la perpetuidad ${ant ? 'anticipada' : 'vencida'}`, ant ? `VP = A (1 + i) / i = ${money(d.A)} × ${dec(1 + i)} / ${dec(i)}` : `VP = A / i = ${money(d.A)} / ${dec(i)}`, money(VP)));
      Object.assign(out, { simbolo: 'VP', nombre: 'Capital requerido', valor: VP, texto: money(VP) });
      out.extras.push(['Rendimiento del capital por periodo', `${money((ant ? VP - d.A : VP) * i)}${ant ? ' (sobre el saldo que queda después del pago de hoy)' : ''}`]);
    } else if (inc === 'A') {
      pos(d.VP, 'VP', 'el capital disponible (VP)');
      const A = ant ? (d.VP * i) / (1 + i) : d.VP * i;
      out.pasos.push(paso(`Pago sostenible de la perpetuidad ${ant ? 'anticipada' : 'vencida'}`, ant ? `A = VP i / (1 + i) = ${money(d.VP)} × ${dec(i)} / ${dec(1 + i)}` : `A = VP i = ${money(d.VP)} × ${dec(i)}`, money(A)));
      Object.assign(out, { simbolo: 'A', nombre: `Pago ${P.nombre} sostenible`, valor: A, texto: money(A) });
    } else if (inc === 'i') {
      pos(d.VP, 'VP', 'el capital disponible (VP)');
      pos(d.A, 'A', 'el pago periódico (A)');
      if (ant && d.A >= d.VP) throw new FinError('En una perpetuidad anticipada el primer pago sale hoy del capital; el pago debe ser menor que el capital.', 'A');
      i = ant ? d.A / (d.VP - d.A) : d.A / d.VP;
      out.pasos.push(paso('Tasa del periodo', ant ? `i = A / (VP − A) = ${money(d.A)} / (${money(d.VP)} − ${money(d.A)})` : `i = A / VP = ${money(d.A)} / ${money(d.VP)}`, `${pct(i)} ${P.nombre} vencida`));
      const kk = k(d.per);
      const ea = Math.pow(1 + i, kk) - 1;
      Object.assign(out, { simbolo: 'i', nombre: `Tasa ${P.nombre} vencida`, valor: i, texto: `${pct(i)} ${P.nombre} vencida`, decimal: dec(i, 10) });
      out.extras.push(['Tasa efectiva anual', `${pct(ea)} EA`]);
      out.tasaResultado = T(ea, 'EA');
    } else {
      throw new FinError('Seleccione la variable que quiere calcular.');
    }
    out.linea = { tipo: 'perpetua', modalidad: ant ? 'A' : 'V', incognita: inc, per: d.per };
    return out;
  }

  const Fin = {
    PER, ORDEN, INDICADORES, FinError, setBaseDias, getBaseDias, k,
    num, pct, dec, money, cant, leerNumero,
    T, mismaExpr, sigla, nombreTasa, describirTasa, validarTasa,
    aPeriodicaVencida, tasaPeriodo, convertir, equivalencias,
    fpow, aN, sN,
    compuesto, indexada, anualidad, perpetua,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Fin;
  else global.Fin = Fin;
})(typeof window !== 'undefined' ? window : globalThis);
