// Formato de EPC usado por sistema_operaciones al grabar los tags RFID de las
// notas de despacho (Proyectos/sistema_operaciones/ETIQUETA_RFID_DESPACHO.md,
// api/src/services/etiquetaRfid.ts): epc = dígitos de la nota, con ceros a la
// izquierda hasta 24 caracteres — NO es un EPC opaco, el nº de nota va
// directo adentro (nota 471103 -> "000000000000000000471103").
//
// La SR160 en modo inventario (gatillo sostenido) no manda un Enter por tag:
// hace rondas de barrido y al final de cada ronda tipea TODOS los EPC que
// detectó en esa ronda, pegados uno atrás del otro, con un solo Enter al
// final (confirmado en prueba real: un renglón con 2-6 EPC concatenados sin
// separador). Como el EPC tiene longitud fija, cualquier texto capturado se
// puede partir de forma confiable en bloques de 24 caracteres.
export const LONGITUD_EPC = 24;

export function extraerEpcs(textoBruto) {
  const limpio = String(textoBruto || '').trim().toUpperCase().replace(/\s+/g, '');
  const epcs = [];
  for (let i = 0; i + LONGITUD_EPC <= limpio.length; i += LONGITUD_EPC) {
    epcs.push(limpio.slice(i, i + LONGITUD_EPC));
  }
  return epcs;
}

// Techo de lo que puede ser un nº de nota real — por debajo del rango donde
// despacho.controller.js reconoce N/D (70.000.000-71.000.000) y N/C
// (71.000.000-72.000.000), que no llevan tag RFID. Sirve para descartar un
// EPC mal decodificado (ver decodificarNotaDesdeEpc) en vez de mandarlo al
// server como si fuera una nota válida.
const NOTA_MAX_PLAUSIBLE = 70000000;

function notaDesdeDigitos(digitos) {
  const n = Number(digitos || '0');
  if (!Number.isFinite(n) || n <= 0 || n >= NOTA_MAX_PLAUSIBLE) return null;
  return String(n);
}

// Decodifica el nº de nota directo del EPC (mismo criterio que construirZpl
// en sistema_operaciones, a la inversa: nota.padStart(24,'0'), ceros a la
// IZQUIERDA). Devuelve null si el EPC no tiene este formato (24 dígitos
// decimales) — por ejemplo un tag genérico no grabado por ese flujo — para
// que el caller caiga al mapeo manual (rfid_tags).
//
// En lecturas reales de la SR160 aparecen tags con el patrón INVERTIDO: los
// dígitos de la nota al INICIO y ceros de relleno al FINAL (ej. nota 507725
// leída como "005077250000000000000000" en vez de
// "000000000000000000507725"). Causa no confirmada — puede ser la impresora
// (el `^RFW,H` de etiquetaRfid.ts escribe 96 bits corridos y el resto del
// banco EPC del tag, si es más largo, queda en 0 después) o el lector/
// extraerEpcs desalineándose contra un banco EPC más largo que 24 hex. Sin
// esto, `Number(epc)` sobre ese patrón da un número gigante (ej. 5.07725e21)
// que el server rechaza — se prueba primero la convención documentada
// (ceros a la izquierda) y, si no da un nº de nota plausible, se reintenta
// quitando los ceros de relleno de la derecha antes de descartar el EPC.
export function decodificarNotaDesdeEpc(epc) {
  const str = String(epc || '');
  if (!/^\d{24}$/.test(str)) return null;
  return notaDesdeDigitos(str.replace(/^0+/, '')) || notaDesdeDigitos(str.replace(/0+$/, ''));
}
