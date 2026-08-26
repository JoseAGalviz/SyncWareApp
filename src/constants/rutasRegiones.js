// Agrupación por región de las rutas de despacho (dbo.segmento no tiene columna de
// región — el mapeo es manual, a mano de la descripción de cada código). Compartido entre
// DespachoIniciarScreen y DespachoNotasCreditoScreen para no duplicar el criterio.

export const RUTAS_CRUZADAS = [
  { codigo: 'barquisimeto1', label: 'ENVIOS BARQUISIMETO (BQTO → S/C)', region: 'ENLASE' },
  { codigo: 'barquisimeto2', label: 'ENVIOS S/C (S/C → BQTO)', region: 'ENLASE' },
];

const REGION_POR_CODIGO = {
  '000145': 'CARACAS', '50': 'CARACAS', '51': 'CARACAS',
  '05': 'BARINAS', '19': 'BARINAS', '41': 'BARINAS',
  '06': 'MERIDA', '18': 'MERIDA', '22': 'MERIDA', '25': 'MERIDA',
  '02': 'TACHIRA', '04': 'TACHIRA', '15': 'TACHIRA', '23': 'TACHIRA', '24': 'TACHIRA', '27': 'TACHIRA', '47': 'TACHIRA',
  '01': 'TACHIRA', '03': 'TACHIRA', '14': 'TACHIRA',
  '11': 'TRUJILLO', '26': 'TRUJILLO', '40': 'TRUJILLO',
  '17': 'ZULIA', '38': 'ZULIA', '39': 'ZULIA',
  '12': 'CARABOBO', '13': 'CARABOBO', '37': 'CARABOBO',
  '08': 'PORTUGUESA', '20': 'PORTUGUESA', '43': 'PORTUGUESA', '44': 'PORTUGUESA',
  '07': 'APURE', '21': 'APURE',
  '10': 'ARAGUA', '31': 'ARAGUA',
  '16': 'FALCON', '49': 'FALCON',
  '42': 'BARQUISIMETO / YARACUY / LARA', '48': 'BARQUISIMETO / YARACUY / LARA',
};

const ORDEN_REGIONES = [
  'CARACAS', 'BARINAS', 'MERIDA', 'TACHIRA', 'TRUJILLO', 'ZULIA', 'CARABOBO',
  'PORTUGUESA', 'APURE', 'ARAGUA', 'FALCON', 'BARQUISIMETO / YARACUY / LARA',
  'ENLASE', 'NACIONAL / SIN REGION FIJA',
];

// Regiones donde un solo tap arranca el despacho con TODOS sus códigos juntos (ver
// resolverRutaInfo/REGIONES en api-app/despacho.controller.js — debe mantenerse igual).
// ENLASE (rutas cruzadas) y NACIONAL/SIN REGION FIJA quedan afuera: ahí cada código se
// sigue seleccionando individualmente.
export const REGIONES_AGRUPABLES = new Set(
  ORDEN_REGIONES.filter(r => r !== 'ENLASE' && r !== 'NACIONAL / SIN REGION FIJA')
);

export const codigoRegion = (region) => `region:${region}`;

// segmentos: [{ codigo, descripcion }] tal como llega de DespachoService.segmentos().
export function agruparRutas(segmentos) {
  const opciones = [
    ...segmentos.map(s => ({
      codigo: s.codigo,
      label: `${s.codigo} - ${s.descripcion}`,
      region: REGION_POR_CODIGO[s.codigo] || 'NACIONAL / SIN REGION FIJA',
    })),
    ...RUTAS_CRUZADAS,
  ];

  const porRegion = new Map();
  for (const opcion of opciones) {
    if (!porRegion.has(opcion.region)) porRegion.set(opcion.region, []);
    porRegion.get(opcion.region).push(opcion);
  }

  const regionesOrdenadas = [...ORDEN_REGIONES, ...[...porRegion.keys()].filter(r => !ORDEN_REGIONES.includes(r))];
  return regionesOrdenadas
    .filter(region => porRegion.has(region))
    .map(region => ({ region, opciones: porRegion.get(region) }));
}
