// Claves de observación activas en webdevoluciones. Copia de
// CLAVES_OBSERVACION en api-app (devoluciones.controller.js), que es quien
// valida — esta copia existe para armar la novedad sin señal. Mantener las
// dos sincronizadas. `revision` es solo informativo.
export const TIPOS_NOVEDAD = [
  { valor: 'Reposicion', etiqueta: 'Reposición' },
  { valor: 'Devolucion', etiqueta: 'Devolución' },
];

export const CLAVES_OBSERVACION = {
  Reposicion: [
    { clave: 'R01', texto: 'Faltante de mercancía', revision: 'Cámaras' },
    { clave: 'R02', texto: 'Producto dañado por defecto de fábrica', revision: null },
    { clave: 'R03', texto: 'Producto dañado por mala manipulación', revision: 'Cámaras' },
    { clave: 'R04', texto: 'Mercancía maltratada en tránsito', revision: null },
    { clave: 'R05', texto: 'Devolución por presentación del producto', revision: null },
    { clave: 'R06', texto: 'Reposición por presentación invertida', revision: 'Cámaras' },
    { clave: 'R07', texto: 'Productos derramados', revision: 'Cámaras' },
    { clave: 'R08', texto: 'Productos partidos (ampollas, jarabes)', revision: null },
    { clave: 'R09', texto: 'Reposición por fecha de vencimiento', revision: null },
    { clave: 'R10', texto: 'Envío de excedente de inventario', revision: 'Cámaras' },
  ],
  Devolucion: [
    { clave: 'D01', texto: 'Pedido doble', revision: 'Supervisión' },
    { clave: 'D03', texto: 'Error de cliente', revision: 'Supervisión' },
    { clave: 'D04', texto: 'No solicitó el cliente', revision: 'Supervisión' },
    { clave: 'D05', texto: 'No lo tiene codificado en el sistema', revision: null },
    { clave: 'D07', texto: 'Producto mal procesado', revision: null },
    { clave: 'D08', texto: 'Producto con código de barra malo', revision: null },
    { clave: 'D09', texto: 'Pedido rechazado', revision: null },
    { clave: 'D10', texto: 'Devolución por precios', revision: null },
    { clave: 'D11', texto: 'Devolución por parte de pago', revision: null },
    { clave: 'D12', texto: 'Devolución por fecha de vencimiento', revision: null },
    { clave: 'D13', texto: 'Devolución por presentación del producto', revision: null },
    { clave: 'D14', texto: 'Producto mal enviado', revision: null },
    { clave: 'D15', texto: 'Falla de verificación del pedido en OCR del operador', revision: 'Supervisión' },
    { clave: 'D16', texto: 'Devolución con nota de crédito', revision: 'Cámaras' },
  ],
};

export const MAX_FOTOS = 4;
