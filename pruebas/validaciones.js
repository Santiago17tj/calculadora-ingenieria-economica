// Corre los cinco ejercicios de validación con el motor de cálculo y los compara con los valores del documento.
// Uso: node pruebas/validaciones.js
const Fin = require('../js/motor.js');
const mensual = { tipo: 'periodica', per: 'mensual', mod: 'V' };

const casos = [
  ['Ejercicio 1. Interés compuesto, VF', 19722540.49, 2,
    () => Fin.compuesto({ incognita: 'VF', VP: 15000000, n: 30, unidad: 'mensual', tasa: Fin.T(0.108, 'nominal', 'trimestral', 'A') }).valor],
  ['Ejercicio 2. Oferta A, DTF + 4,20 puntos NTA (mensual vencida)', 0.0107695351, 10,
    () => Fin.indexada({ indicador: 'DTF', valor: 0.0845, puntos: 0.042, expr: { tipo: 'nominal', per: 'trimestral', mod: 'A' }, destino: mensual }).valor],
  ['Ejercicio 2. Oferta B, IBR + 3,60 puntos NMV (mensual vencida)', 0.0104166667, 10,
    () => Fin.indexada({ indicador: 'IBR', valor: 0.089, puntos: 0.036, expr: { tipo: 'nominal', per: 'mensual', mod: 'V' }, destino: mensual }).valor],
  ['Ejercicio 2. Oferta C, IPC + 6,80 % EA (mensual vencida)', 0.0096739794, 10,
    () => Fin.indexada({ indicador: 'IPC', valor: 0.051, spread: Fin.T(0.068, 'EA'), destino: mensual }).valor],
  ['Ejercicio 2. Oferta D, UVR + 7,10 % EA (mensual vencida)', 0.0100034356, 10,
    () => Fin.indexada({ indicador: 'UVR', valor: NaN, uvr: { modo: 'valores', inicial: 391.8634, final: 412.3058, dias: 365 }, spread: Fin.T(0.071, 'EA'), destino: mensual }).valor],
  ['Ejercicio 3. Anualidad vencida, cuota', 2518181.13, 2,
    () => Fin.anualidad({ modalidad: 'V', incognita: 'A', base: 'VP', VP: 72000000, n: 36, per: 'mensual', tasa: Fin.T(0.168, 'EA') }).valor],
  ['Ejercicio 4. Anualidad anticipada, VP', 89253917.85, 2,
    () => Fin.anualidad({ modalidad: 'A', incognita: 'VP', A: 4200000, n: 24, per: 'mensual', tasa: Fin.T(0.132, 'nominal', 'trimestral', 'V') }).valor],
  ['Ejercicio 5. Perpetuidad vencida, capital', 375033549.11, 2,
    () => Fin.perpetua({ modalidad: 'V', incognita: 'VP', A: 18000000, per: 'semestral',
      tasa: Fin.T(Fin.indexada({ indicador: 'IPC', valor: 0.051, spread: Fin.T(0.045, 'EA'), destino: { tipo: 'EA' } }).valor, 'EA') }).valor],
];

let fallas = 0;
for (const [nombre, esperado, dec, calc] of casos) {
  const v = calc();
  const ok = Math.abs(Number(v.toFixed(dec)) - esperado) < Math.pow(10, -dec) / 2;
  if (!ok) fallas++;
  console.log(`${ok ? 'OK   ' : 'FALLA'}  ${nombre}: ${v.toFixed(dec)} (documento: ${esperado.toFixed(dec)})`);
}
console.log(fallas ? `\n${fallas} ejercicio(s) no coinciden.` : '\nLos cinco ejercicios coinciden con el documento.');
process.exit(fallas ? 1 : 0);
