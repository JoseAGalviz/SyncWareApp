# Estado — SyncWareApp

## En progreso: módulo Despacho reemplaza el flujo Ruta/Carga

Se dio de baja el flujo viejo de `CargarRutaScreen` + `RutagramaScreen` (carga de ruta y su pantalla de detalle) junto con los servicios que usaban (`facturasSync.js`, `rutagramasService.js`, `utils/uuid.js`) y se está reemplazando por un módulo `Despacho` nuevo, calcado del flujo real del sistema `visor` (`lista.php` + `registro.php` — ver `despacho.controller.js` en `api-app` para la lógica de negocio).

Piezas nuevas:
- `navigation/DespachoNavigator.js`
- `screens/DespachoIniciarScreen.js`, `DespachoEscanearScreen.js`, `DespachoVerificarScreen.js`, `DespachoNotasCreditoScreen.js`
- `services/despachoService.js` — dos fases: escaneo de caja por nota, luego verificación por factura y cierre
- `styles/Despacho.styles.js`
- `src/components/` — nuevo, sin revisar contenido en este resumen

También hay retoques generales en `Theme.js`, navegadores (`AppNavigatorConductor`, `AppNavigatorDespachador`), `CustomDrawerContent`, y ajustes menores en varias pantallas existentes (`FacturasScreen`, `LotesScreen`, `ChequeoGuiaCargaScreen`, etc.) — no revisados en detalle en este status, ver diff completo si hace falta.

## Pendiente

- Confirmar que ningún flujo real todavía dependía de `CargarRutaScreen`/`RutagramaScreen` antes de darlos de baja del todo (quedan recuperables del historial de git si hace falta).
- Probar el módulo Despacho de punta a punta en dispositivo real (escaneo + verificación + cierre).
- Revisar `src/components/` nuevo y documentar qué contiene.

---

# 2026-09-08 — Facturas online-only + Rutagrama: UX de escaneo y perf

## Builds

- **build 25** (`versionCode 25`, commit `f79f66f`): facturas escaneo online-only + historial de rutagrama por ruta.
- **build 26** (`versionCode 26`, commit `3b50831`): UX de la pantalla de escaneo + perf. En cola al momento de escribir esto.
- Ambos son `--profile production` (APK), cuenta EAS `ccristmedicals`, proyecto `Cristmedicals`.

## Facturas (`FacturasScreen.js`, `facturasSyncQueue.js`) — commit `f79f66f`

Módulo **offline desactivado** (comentado, reversible):

- Sin `iniciarAutoSync` (no hay sync automático al recuperar señal).
- `registrarEscaneo` exige conexión al momento del escaneo; sin señal → alerta y NO guarda.
- Sin `AvisoOfflineModal`; `origen` fijo `'online'`.
- La cola persistente (`facturasSyncQueue`) se mantiene SOLO como reintento de los ítems que el
  server devuelve `status:'error'` (factura marcada en Profit pero historial encolado en el
  outbox del lado server — ver `api-app/STATUS.md`). Se reintentan con "Sincronizar ahora".
- `FacturasScreen` maneja el nuevo `status:'error'` mostrando "quedá pendiente, reintentá".

## Historial de rutagrama por ruta (`DespachoHistorialScreen.js`, `despachoService.js`) — commit `f79f66f`

- La pantalla pasó de historial por usuario (`userData.id`) a **por ruta**: selector de ruta
  (`DespachoService.historialRutas()`) + `historial(ruta, { segmento, desde, hasta })`.
- **Quitado** el botón "Limpiar historial" (era `setItems([])` local, sin sentido con datos
  compartidos por ruta).
- **Agregado** filtro por fecha de cierre: chips `Todo / 7 días / 30 días / Hoy` que mandan
  `desde`/`hasta` (YYYY-MM-DD) al endpoint. `Todo` = sin rango (comportamiento previo).
- `despachoService.historial` cambió de firma: `(ruta, { segmento, desde, hasta })`. Único
  caller actualizado.
- OJO: el server separa los cierres de rutas `region:*` por subgrupo, así que en el historial
  aparecen bajo el nombre del subgrupo real (`"PANAMERICANA"`, etc.), no bajo `"TACHIRA"`.
  Ver `api-app/STATUS.md`.

## Pantalla de escaneo (`DespachoEscanearScreen.js`, `Despacho.styles.js`) — commit `3b50831`

UX:

- Alertas de escaneo explícitas: `SE ESCANEÓ NOTA X` / `SE ESCANEÓ FACTURA X`, con el detalle
  de lo pendiente (cajas faltantes, factura por escanear). Antes decía "Factura verificada" +
  "Nota X" y confundía al operador.
- `pendienteTexto(fila)` — helper: resumen en texto plano de lo que le falta a un pedido
  (cajas faltantes + factura, con número si se conoce). `null` si está completo. NC/ND no cuentan.
- Renglón completo (cajas + factura, o NC/ND) → fondo verde (`itemRowCompleto` en los estilos)
  + `COMPLETO ✓`; incompleto → `PENDIENTE: ...` en naranja.
- Pantalla **"Revisá antes de cerrar"** (`RevisarCierreModal`): al tocar "Finalizar y cerrar
  ruta" abre una pantalla full-screen que lista TODO lo escaneado, marca lo pendiente, y pide
  confirmación. Si hay un bloqueo duro del server (pedido con factura pero sin cajas, anuladas)
  el botón de cerrar queda deshabilitado con el motivo, y el operador ve QUÉ pedido es y puede
  volver a escanear o quitarlo ("Volver al escaneo" no pierde progreso — vive en el server).
  Si solo falta alguna factura (no bloquea) → warning + botón "Sí, cerrar así".
  Reemplaza el `Alert.alert` chico.

Performance (rutas grandes, 1000+ notas):

- "Notas de esta ruta" arranca **cerrada** (`pendAbierto=false`) y se carga recién al abrirla;
  `cargarTodo` ya no trae `pendientes`.
- Tope de **120** notas renderizadas + props de virtualización; filtro por defecto
  **"Con factura"** (lo accionable).
- Refresh post-escaneo usa `listarDetalle(..., { rapido: true })` → el backend salta el lookup
  a Profit (ver `?rapido=1` en `api-app/STATUS.md`). Poll de fondo 25s → **45s**.

## Probado

- El flujo de escaneo/cierre + el gate (`calcularResumenCierre`) se probó end-to-end contra las
  bases reales desde `api-app` (ver `api-app/STATUS.md`): cajas faltantes bloquea, factura
  faltante no, `finalizar` cierra igual. Los agregados de esta pantalla (`pendienteTexto`,
  `RevisarCierreModal`) son consistentes con esa lógica por revisión de código.
- **En dispositivo**: falta. Iterar con dev build o probar el APK build 26.

## Pendiente

- Probar build 26 en dispositivo real: mensajes de escaneo, renglón verde, pantalla "Revisá
  antes de cerrar", filtro de historial, perf con una ruta grande.
- Push de `feat/escaneo-unificado` (o merge a `main`).
- Dev workflow: el proyecto es SDK 54 + `expo-dev-client`. Expo Go de la Play Store ya es
  SDK 57 y no sirve. Para live reload: development build, o Expo Go viejo SDK 54
  (`expo.dev/go?sdkVersion=54&platform=android`).
