# Estado — SyncWareApp

## Experimental: módulo RFID (pistola Chainway SR160) — 2026-09-24

Módulo nuevo, separado a propósito del flujo real de Despacho (no toca
`DespachoEscanearScreen`/`escanearCaja`): reconocer notas de entrega
etiquetadas con RFID al escanearlas con la pistola Chainway SR160. Backend en
`api-app` (ver su STATUS.md) — tablas `rfid_tags`/`rfid_lecturas`, endpoints
`/api/rfid/*`.

El SR160 no tiene SDK Android — se empareja como teclado Bluetooth (HID) y
tipea el EPC de cada tag leído donde esté el cursor, exactamente el mismo
mecanismo que ya usa `EscanerInput.js` (`MODO_BLUETOOTH`) para el lector de
dedo Bluetooth existente. Se extrajo ese patrón (input oculto siempre
enfocado, `showSoftInputOnFocus={false}`, `blurOnSubmit={false}`, confirma en
`onSubmitEditing`) a un componente propio `RfidLectorInput.js`, sin el toggle
de cámara (no aplica acá) y **sin gatear la próxima lectura por el estado de
red** — en modo inventario (gatillo sostenido) pueden llegar varias lecturas
en ráfaga y no hay que perderlas esperando el round-trip de la anterior.

Piezas nuevas, colgadas del stack `DespachoNavigator.js` (entrada: botón
"RFID (experimental)" en `DespachoIniciarScreen.js`):

- `RfidMenuScreen.js` — landing con aviso de "experimental".
- `RfidAsociarScreen.js` — lectura de **un** tag a la vez (a propósito, para
  no ligar por error un lote entero al mismo tag): lee EPC, tipea nº de
  nota, `POST /rfid/tags`. Avisa (sin bloquear) si el EPC ya estaba asociado
  a otra nota o si la nota ya tenía otro tag.
- `RfidEscanearScreen.js` — lectura continua tipo inventario: al montar
  cachea `GET /rfid/tags` en memoria (`Map` epc→nota) para resolver cada
  lectura localmente, sin round-trip por tag. "Iniciar lectura" arranca una
  sesión (`sesion_id` local), acumula tags distintos con contador de
  repeticiones, "Detener y guardar" manda el lote a `POST /rfid/lecturas`.
- `rfidService.js` — mismo patrón que `despachoService.js` sobre `api.js`.
- `Rfid.styles.js` — hoja propia, no se mezcla con `Despacho.styles.js`.
- Ambas pantallas de captura tienen un modal "Escribir EPC manualmente"
  (mismo patrón que `DespachoNotasCreditoScreen`) — sirve tanto de respaldo
  en campo si falla el emparejamiento Bluetooth, como para poder ejercitar
  el flujo sin la pistola en mano (el input HID real es invisible/sin
  teclado táctil, `showSoftInputOnFocus={false}`).

### Fix: EPC pegados en modo inventario (2026-09-24, prueba real con la SR160)

Primera prueba con la pistola real (Escanear, gatillo sostenido) mostró
lecturas con 2-6 tags concatenados en un solo renglón, sin separador — el fix
inicial (input sin controlar + `.clear()` imperativo, ver abajo) no lo
resolvía porque la causa no era una carrera de React: la SR160 en modo
inventario hace rondas de barrido y **manda un solo Enter al final de cada
ronda**, con todos los EPC detectados en esa ronda tipeados uno atrás de otro
— no un Enter por tag.

La resolvió `Proyectos/sistema_operaciones` (`ETIQUETA_RFID_DESPACHO.md`,
`api/src/services/etiquetaRfid.ts`): ese sistema ya graba los tags de estas
notas con `^RFW`, y el EPC que escribe **es el número de nota** con ceros a
la izquierda hasta 24 caracteres (`nota.replace(/\D/g,'').padStart(24,'0')`)
— no un ID opaco. Longitud fija → cualquier texto capturado se puede partir
de forma confiable en bloques de 24.

`src/utils/rfid.js` (nuevo):

- `extraerEpcs(textoBruto)` — parte el buffer en EPCs de 24 caracteres,
  descarta cualquier remanente incompleto al final.
- `decodificarNotaDesdeEpc(epc)` — si el EPC son 24 dígitos decimales, la
  nota es directo `Number(epc)` (saca los ceros); si no calza ese formato
  (tag no grabado por ese flujo), devuelve `null`.

`RfidEscanearScreen.onLectura` ahora parte cada flush con `extraerEpcs` y
registra cada EPC por separado (`registrarEpc`), en vez de tratar todo el
texto como un único código. La resolución de nota prioriza
`decodificarNotaDesdeEpc` (instantánea, sin tabla) y cae al mapeo manual
(`rfid_tags`) solo si el EPC no tiene ese formato — para las notas de este
lote (grabadas por `sistema_operaciones`), **`RfidAsociarScreen` ya no hace
falta**: solo queda como respaldo para tags no estándar. `RfidAsociarScreen`
también decodifica y precarga el campo de nota cuando el EPC calza.

La entrada manual de ambas pantallas ahora rellena con ceros a 24 igual que
`sistema_operaciones` — se puede probar tipeando solo el nº de nota
(`471103`) sin el EPC completo.

## Probado

- `npm test` completo (40 tests, todos verdes) tras agregar el módulo y
  después del fix de EPC pegados — no rompe nada existente.
- Caso real reportado por el usuario (3 EPC de una ronda de inventario
  concatenados en un solo renglón) reproducido en un test descartable con
  `extraerEpcs` — separa los 3 correctamente. `decodificarNotaDesdeEpc`
  verificado contra el ejemplo de `ETIQUETA_RFID_DESPACHO.md`
  (`000000000000000000471103` → `471103`) y contra un EPC no estándar
  (devuelve `null`, cae al mapeo manual).

### Integración real: prueba acotada a MERIDA (2026-09-24)

A pedido del usuario, `RfidEscanearScreen` pasó de loguear solo en
`rfid_lecturas` (tablas propias, aisladas) a **registrar de verdad** cada
nota reconocida contra un rutagrama real — mismo endpoint que usa la pantalla
normal de Despacho (`DespachoService.escanear`, sin `caja`: el server la
autoincrementa, correcto acá porque cada EPC distinto es una caja física
aunque decodifique a la misma nota). Acotado a propósito a una sola ruta,
`region:MERIDA` (mismo código que `codigoRegion('MERIDA')` en
`constants/rutasRegiones.js` y que `REGIONES['region:MERIDA']` en
`despacho.controller.js`) — no es un selector genérico de rutas.

El rutagrama de Merida se comparte con el flujo normal vía
`leerActivos()`/`agregarActivo()` (helpers ya exportados de
`DespachoIniciarScreen.js`, ahora importados desde acá): si ya hay uno
abierto lo reusa, si no lo inicia (`DespachoService.iniciar`). Por eso
también aparece en la lista "rutas abiertas" de `DespachoIniciarScreen` — se
puede seguir/cerrar/finalizar desde ahí con el flujo normal, esta pantalla
solo escanea.

Cada renglón de la lista de lecturas muestra el resultado real del
`escanear` (✓ registrada / ⚠ advertencia del server / ✗ error), no solo el
conteo local. `decodificarNotaDesdeEpc` ya devolvía la nota sin ceros a la
izquierda (`String(Number(epc))`), así que ya llega en el formato que espera
el endpoint real — no hizo falta tocar nada ahí.

**Notas de la ruta visibles (2026-09-24)**: se agregó la lista completa de
notas de MERIDA (mismo `DespachoService.pendientes` que usa "Notas de esta
ruta" en Despacho normal — `cli_des` + `fact_num`), a pedido del usuario para
ver contra qué se está probando. Se resalta en verde (`itemRowMatch`) apenas
una lectura RFID de la sesión registra esa nota con éxito
(`notasReconocidasSet`, derivado de `lecturas` con `useMemo` — reactivo, sin
estado aparte); en gris atenuado (`itemRowYaEscaneada`) si ya estaba
escaneada de una sesión anterior (campo `ya_escaneada` del endpoint). A
diferencia de "Notas de esta ruta" en `DespachoEscanearScreen` (que arranca
cerrada por performance en rutas de 1000+ notas), acá arranca siempre
visible — Merida es chica y es justamente lo que se quiere ver en la prueba;
igual se capa el render a 200 filas por las dudas.

**Caveat no resuelto (lógica compartida de `despacho.controller.js`, no
tocada)**: `sumarCaja` tiene un `throttleCaja(id, nota)` que ignora como
"repetido" un segundo escaneo de la MISMA nota dentro de una ventana corta
cuando no se manda `caja` explícita. Si una nota tiene más de un tag (más de
una caja) y ambos se leen casi al mismo tiempo en una misma ronda de
inventario, el segundo podría no sumar caja. No se tocó ese código (es del
flujo real compartido) — a verificar en la prueba con notas multi-caja.

## Pendiente

- **Confirmar en la pistola real** que ya no se pegan lecturas de distintas
  rondas (el fix se validó con datos de prueba, no todavía con la SR160 en
  mano tras el cambio de EPC).
- **Probar la integración con MERIDA en la pistola real**: iniciar/reusar el
  rutagrama, escanear notas reales de esa ruta, confirmar en `detalle` que
  quedan marcadas igual que con el escaneo normal, y revisar el caveat del
  throttle con una nota de más de una caja.
- Sin rol/permiso especial por ahora, cualquier usuario logueado con acceso
  a Despacho ve el botón "RFID (experimental)".
- `RfidAsociarScreen` quedó como flujo secundario (tags no estándar); evaluar
  si conviene ocultarlo o dejarlo menos visible ahora que la mayoría de los
  tags se resuelven solos.

## 2026-09-09 — Facturas: solo entrada manual + offline reactivado

Rama `feat/facturas-manual-offline` (parte de `feat/escaneo-unificado`, ya mergeada a `main`).

Cambios en el módulo de escaneo de facturas para extender `fec_venc`:

- **Se quitó el lector de código de barras por cámara** de `FacturasScreen.js`. La pantalla
  ahora solo tiene la entrada manual (el vendedor escribe el número de factura, teclado
  numérico). Se eliminaron `CameraView`/`useCameraPermissions`, el gate de permiso de cámara,
  `handleBarCodeScanned`, `scanCooldown`, `liberarEscaneo` y los estilos huérfanos
  (`cameraBox`, `cameraContainer`, `scanButton`, etc. en `FacturasScreen.styles.js`).
  `expo-camera` sigue en el proyecto: lo usan ~12 pantallas más (Despacho, Lotes, GuiaCarga,
  ChequeoGuiaCarga, RecepcionGuias...). No se tocó `package.json` ni los permisos de `app.json`.
- **Se reactivó el modo offline** (estaba comentado desde `f79f66f`, "online-only"):
  - `facturasSyncQueue.js`: `encolarFactura` vuelve a marcar `origen` `'online'`/`'offline'`
    según haya señal al momento de guardar.
  - `FacturasScreen.js`: `registrarEscaneo` ya no exige conexión — siempre encola primero;
    con señal sincroniza el ítem al toque, sin señal muestra `AvisoOfflineModal` y queda
    pendiente. Se restauró el `useEffect` de `iniciarAutoSync` (sube los pendientes solo al
    recuperar señal por NetInfo) y el render de `AvisoOfflineModal`.
  - La corroboración contra Profit (`CorroborarFacturaModal`, datos reales de cliente/monto/
    vencimiento) se mantiene **solo cuando hay conexión** al ingresar; offline se salta y se
    encola directo con el número tecleado. El server resuelve la letra A/B al sincronizar;
    si el número sin letra calza con serie A y B a la vez queda `'ambiguo'` (terminal, se
    revisa a mano).
- **Banner de info fijo** en `FacturasScreen.js` (siempre visible, no se puede cerrar):
  aclara que las facturas de serie B siempre empiezan con `72` y que hay que ignorar los
  `00` iniciales que trae impresos la factura física. Estilos `infoBanner*` en
  `FacturasScreen.styles.js`. Motivo: sin lector de código de barras el vendedor tipea el
  número a mano y las de serie B (8 dígitos, ej. `72150775`) el server las toma directo
  (`SOLO_DIGITOS_DIRECTO`), sin resolución de serie — pero solo si se tipean completas
  con el `72` al frente.
- Lado `api-app`: sin cambios. `POST /facturas/batch-scan` ya acepta `origen`, la migración
  `sql/2026-09-origen-foto-facturas-cargadas.sql` ya está corrida en `app` (columnas `origen`
  y `foto_path` existen; ya hay filas con `origen='online'`).

### Endurecimiento: el historial local NO se borra nunca (2026-09-10)

Requisito: las facturas guardadas en el teléfono no se pueden borrar solas. Se auditó
`facturasSyncQueue.js` y se encontraron y corrigieron cuatro vías de pérdida:

- **Poda por antigüedad y tope de cantidad.** `podarResueltos` descartaba las facturas ya
  resueltas (sincronizadas/duplicadas) con más de 7 días y recortaba el total a 500
  registros, en cada `obtenerFacturas()` (que corre en cada foco de pantalla y en cada
  escaneo). Se eliminó por completo: no hay retención por fecha ni límite de registros.
  `obtenerFacturas()` ahora solo lee, ya no reescribe el storage al leer (era otra ventana
  de carrera).
- **Ítems con `fecha_escaneo` corrupta.** El filtro de poda mandaba al `catch` (o a `NaN <=
  7 === false`) los registros con fecha ilegible y los borraba en silencio. Desaparece con
  el punto anterior.
- **Carrera de escritura entre flujos concurrentes.** `sincronizarPendientes` hacía
  read-all / (red) / write-all sobre la clave `facturas`. Si mientras el POST estaba en
  vuelo entraba un `encolarFactura` nuevo (auto-sync de NetInfo + "Sincronizar ahora" +
  "Agregar" pueden solaparse), el `guardarLista` final pisaba con su copia vieja y el
  escaneo recién agregado se perdía. Ahora: (1) toda mutación de la lista pasa por un lock
  serie (`conLock`); (2) el envío por red se hace **fuera** del lock y los resultados se
  aplican **dentro**, releyendo la lista y fusionando por `id_local` — un ítem sin parche
  queda intacto.
- **`'invalido'` borraba la fila.** Cuando el server devolvía `status: 'invalido'` en el
  batch, el cliente hacía `porId.delete(id_local)` y la fila desaparecía del historial.
  Ahora se **marca** `status: 'invalido'` y queda visible; solo sale con "Limpiar
  historial".

Única vía que borra algo: el botón **"Limpiar historial"** (`limpiarHistorialResuelto`),
acción explícita del usuario con diálogo de confirmación, y solo toca lo ya resuelto —
los pendientes se conservan siempre.

### Tests

Se agregó Jest al proyecto (`jest`, `jest-expo`, `@testing-library/react-native`,
`react-test-renderer`; `npm test`). Config en `jest.config.js`, mocks base en `jest/`.

- `src/services/__tests__/facturasSyncQueue.test.js` — 25 casos: encolado online/offline,
  duplicado local, que el historial no se poda (facturas viejas de 100/300/365 días y
  600 registros siguen ahí), `limpiarHistorialResuelto` conserva pendientes, todos los
  estados de `sincronizarPendientes` (ok / no_encontrada / invalido-no-borra / ambiguo /
  error HTTP → fallido en el tope / caída de red deja 'pendiente'), `soloIdLocal`, y tres
  pruebas de concurrencia (encolar durante un sync en vuelo, dos "Agregar" en paralelo,
  dos syncs solapados) que verifican que no se pierde ni se duplica nada.
- `src/screens/__tests__/FacturasScreen.test.js` — 8 casos: render sin UI de cámara,
  banner de serie B, carga del historial persistido, "Agregar" abre el modal, formato
  inválido no encola, flujo con conexión (corrobora contra Profit → encola → sincroniza),
  flujo sin conexión (salta corroboración → `AvisoOfflineModal`), duplicado local, y
  "Limpiar historial" tras confirmación.

Total: 33 tests, verdes.

### Pendiente

- Probar en dispositivo real (development build o APK, SDK 54): ingresar factura con wifi
  apagado → debe encolar y mostrar el aviso offline; reactivar wifi → el auto-sync debe
  subir el pendiente solo. Confirmar en MySQL `app.facturas_cargadas` que las filas nuevas
  traen `origen='offline'`.
- Merge de `feat/facturas-manual-offline` a `main` y build EAS (cuenta `ccristmedicals`,
  proyecto `Cristmedicals`).

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
