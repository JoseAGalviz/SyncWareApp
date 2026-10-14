# Módulo experimental RFID (pistola Chainway SR160) — Rutagrama

Fecha: 2026-09-24

## Objetivo

Reconocer notas de entrega etiquetadas con RFID al escanearlas con una
pistola Chainway SR160, comparar contra el lote ya etiquetado y registrar lo
escaneado. Empezó como módulo separado del flujo real de Despacho, para
probar la tecnología sin riesgo; terminó integrado de verdad contra un
rutagrama real, acotado a la ruta MERIDA como prueba controlada.

## Hardware: Chainway SR160

- **No tiene SDK Android/iOS** (solo un SDK Windows en C#, confirmado contra
  `chainway.net`/`chainwayeurope.com/download` y el manual oficial). Es un
  "scanning gun": en modo RFID tipea el dato leído directo donde esté el
  cursor vía Bluetooth HID (emulación de teclado), igual que un lector de
  código de barras genérico — **no hace falta módulo nativo**.
- En **modo inventario** (gatillo sostenido) hace rondas de barrido y manda
  **un solo Enter al final de cada ronda**, con todos los EPC detectados en
  esa ronda tipeados pegados uno atrás del otro — no un Enter por tag.
  Confirmado en prueba real (un renglón con 2–6 EPC concatenados sin
  separador).

## Formato del EPC (descubierto en `Proyectos/sistema_operaciones`)

El EPC grabado en estos tags **no es un ID opaco**: es el número de nota con
ceros a la izquierda hasta 24 caracteres. Mismo criterio usado al imprimir
las etiquetas (`sistema_operaciones/api/src/services/etiquetaRfid.ts`):

```js
epcHex = nota.replace(/\D/g, "").padStart(24, "0").slice(-24);
// nota 471103 -> "000000000000000000471103"
```

Esto permite:

1. **Partir cualquier lectura pegada** en EPCs individuales, cortando de a
   24 caracteres (longitud fija) — soluciona el problema de las rondas de
   inventario sin Enter por tag.
2. **Decodificar la nota directo del EPC** (`Number(epc)`, saca los ceros),
   sin necesitar una tabla de mapeo manual para los tags de este lote.

## Arquitectura

### Backend — `api-app`

- `sql/2026-09-crear-tablas-rfid-experimental.sql` — DB `app`
  (`getMysqlPool()`), mismo pool que `usuarios`/`catalogo_links`/
  `rutagramas_app`. **Ya corrida** contra la base real (192.168.4.23).
  - `rfid_tags` (epc PK, nota, usuario, fechas) — mapeo manual, ahora
    secundario (fallback para tags que no traen el nº de nota codificado).
  - `rfid_lecturas` — log de cada sesión de escaneo (auditoría propia,
    aparte del registro real contra el rutagrama).
- `src/controllers/rfid.controller.js` + `src/routes/rfid.route.js`, montado
  en `/api/rfid` (`server.js`). Sin JWT, mismo patrón que
  `despacho.controller.js` (`usuario_id` resuelto contra `usuarios`).
  - `GET/POST /tags`, `DELETE /tags/:epc`, `POST/GET /lecturas`.

### Frontend — `SyncWareApp`

Colgado del stack `DespachoNavigator.js` (entrada: botón
"RFID (experimental)" en `DespachoIniciarScreen.js`):

| Archivo | Qué hace |
|---|---|
| `src/utils/rfid.js` | `extraerEpcs()` parte un buffer en bloques de 24 caracteres. `decodificarNotaDesdeEpc()` saca el nº de nota del EPC o devuelve `null`. |
| `src/components/RfidLectorInput.js` | Captura las pulsaciones HID de la pistola: input **sin controlar** (`defaultValue`, sin `value`/`onChangeText`), se limpia con `inputRef.current.clear()` imperativo en `onSubmitEditing` — evita la carrera de un input controlado cuando llegan lecturas muy seguidas. Mismo mecanismo que `EscanerInput.js` (`MODO_BLUETOOTH`, usado para otro lector Bluetooth), sin el toggle de cámara. |
| `src/screens/RfidMenuScreen.js` | Landing del módulo. |
| `src/screens/RfidAsociarScreen.js` | Asociación manual EPC↔nota, un tag a la vez — ahora secundaria (fallback para tags no estándar); precarga la nota si el EPC ya la trae codificada. |
| `src/screens/RfidEscanearScreen.js` | Pantalla principal. Ver detalle abajo. |
| `src/services/rfidService.js` | Cliente de `/api/rfid/*`. |
| `src/styles/Rfid.styles.js` | Hoja propia, no se mezcla con `Despacho.styles.js`. |

### `RfidEscanearScreen` — flujo completo

1. **Rutagrama real de MERIDA**: al entrar, busca si ya hay uno abierto
   (`leerActivos()` de `DespachoIniciarScreen.js`, filtrado por
   `ruta_codigo === 'region:MERIDA'`); si no, botón "Iniciar rutagrama
   MERIDA" (`DespachoService.iniciar` + `agregarActivo`, mismas funciones que
   usa la pantalla normal de Despacho — por eso también aparece en su lista
   de "rutas abiertas").
2. **Notas de la ruta visibles**: lista completa de notas de MERIDA
   (`DespachoService.pendientes`, mismo endpoint que "Notas de esta ruta" en
   Despacho normal) — cliente + nº de nota. Se resalta en **verde** apenas
   una lectura RFID de la sesión la registra con éxito; en **gris atenuado**
   si ya estaba escaneada de antes.
3. **Iniciar lectura**: activa `RfidLectorInput` (gatillo sostenido = modo
   inventario). Cada flush puede traer varios EPC pegados — se parten con
   `extraerEpcs` y se procesan uno por uno.
4. Por cada EPC **nuevo**: se decodifica la nota (directo del EPC, o del
   mapeo manual como fallback) y, si hay nota, se llama **de verdad** al
   mismo endpoint que usa Despacho (`DespachoService.escanear`, sin `caja` —
   el server la autoincrementa, correcto porque cada EPC/tag físico distinto
   es una caja aunque decodifique la misma nota). El resultado real (✓
   registrada / ⚠ advertencia / ✗ error) se muestra en el renglón.
5. Lecturas repetidas del mismo EPC (normal en modo inventario, el mismo tag
   se vuelve a detectar mientras sigue en rango) solo suman al contador
   local, no vuelven a llamar al server.
6. **Detener y guardar**: cierra la sesión y guarda el resumen en
   `rfid_lecturas` (auditoría propia) — no deshace ni afecta lo ya
   registrado en el rutagrama real.
7. Entrada manual (`Escribir EPC manualmente`) en ambas pantallas, para
   probar sin la pistola en mano o como respaldo si falla el emparejamiento
   Bluetooth — acepta el EPC completo o solo el nº de nota (se rellena con
   ceros igual que `sistema_operaciones`).
8. **Escanear factura**: la factura de Profit NO lleva tag RFID (solo la nota
   de entrega se etiqueta al imprimir, ver `etiquetaRfid.ts`), así que no
   entra por `RfidLectorInput`. `RfidEscanearScreen` suma una sección propia
   con `EscanerInput` (cámara o lector bluetooth genérico — mismo componente
   que usa `DespachoEscanearScreen`), que llama al mismo endpoint unificado
   `escanear` con el código leído tal cual (el backend decide si es caja o
   factura). Así un pedido completo — cajas por RFID + factura por cámara/
   lector — se cierra sin salir de esta pantalla ni volver a Despacho normal.
   Lista propia de "Facturas escaneadas" en la sesión, independiente de la
   lista de tags RFID (no se resetea con "Iniciar lectura"/"Detener y
   guardar" del inventario RFID, que solo aplica a `rfid_lecturas`).

## Bug detectado y mitigado en el cliente

Lecturas reales de la SR160 traen algunos EPC con el patrón de ceros
INVERTIDO respecto al documentado: dígitos de la nota al inicio, ceros de
relleno al final (ej. nota 507725 leída como
`005077250000000000000000` en vez de `000000000000000000507725`).
`Number(epc)` sobre ese patrón daba un número gigante (`5.07725e+21`) que el
server rechazaba con "No se pudo procesar el escaneo" — visto en sesión real
(87 lecturas, varias con este error).

Causa no confirmada: puede ser la impresora (`^RFW,H` en `etiquetaRfid.ts`
escribe 96 bits corridos; si el banco EPC físico del tag es más largo, el
resto queda en 0 DESPUÉS de lo escrito) o el lector/`extraerEpcs`
desalineándose contra un banco EPC más largo que 24 hex. Pendiente verificar
contra la impresora/tags reales.

Mitigación en `decodificarNotaDesdeEpc` (`src/utils/rfid.js`): prueba
primero la convención documentada (ceros a la izquierda); si el resultado no
es un nº de nota plausible (techo `NOTA_MAX_PLAUSIBLE = 70.000.000`, antes
del rango de N/D y N/C), reintenta quitando los ceros de relleno de la
derecha antes de descartar el EPC.

## Lentitud durante el escaneo — mitigada

Reportado con sesiones largas (87 lecturas). Dos causas, ambas en el cliente:

1. `registrarEnRutagramaReal` disparaba un POST por cada EPC nuevo sin
   encolar — una ronda de inventario con el gatillo sostenido puede traer
   decenas de tags nuevos de golpe, así que se mandaban decenas de requests
   en paralelo contra el mismo rutagrama, saturando el pool de MySQL del
   server. Ahora se encolan y disparan de a uno (mismo componente, promesa
   encadenada) — la lectura de tags no depende de la red, el registro real
   se pone al día un poco después.
2. La lista "Lecturas de esta sesión" (`FlatList` sin scroll propio, anidada
   en el `ScrollView` de la pantalla, igual que "Notas de la ruta" arriba)
   no virtualiza sola — sin tope, cada tag nuevo re-renderizaba la lista
   completa. Ahora se renderizan como máximo las últimas 150 (dato completo
   igual se guarda con "Detener y guardar").

## Caveat conocido, no resuelto

`sumarCaja` (`despacho.controller.js`, lógica compartida, no tocada) tiene
un `throttleCaja(id, nota)` que ignora como "repetido" un segundo escaneo de
la MISMA nota dentro de una ventana corta cuando no se manda `caja`
explícita. Si una nota tiene más de un tag (más de una caja) y ambos se leen
casi al mismo tiempo en una misma ronda de inventario, el segundo podría no
sumar caja. Pendiente de verificar con una nota real de varias cajas.

## Pendiente

- Confirmar en la pistola real que ya no se pegan lecturas de distintas
  rondas tras el fix de `extraerEpcs`.
- Probar la integración con MERIDA de punta a punta: iniciar/reusar
  rutagrama, escanear notas reales, confirmar en `detalle` (MySQL
  `rutagramas`) que quedan marcadas igual que con el escaneo normal.
- Revisar el caveat del `throttleCaja` con una nota multi-caja.
- Sin rol/permiso especial por ahora: cualquier usuario logueado con acceso
  a Despacho ve el botón "RFID (experimental)".
- `RfidAsociarScreen` quedó como flujo secundario — evaluar si conviene
  ocultarlo ahora que la mayoría de los tags se resuelven solos.

## Ver también

- `STATUS.md` de este repo y de `api-app` — historial completo con fechas y
  contexto de cada cambio.
- `Proyectos/sistema_operaciones/ETIQUETA_RFID_DESPACHO.md` — cómo se graban
  los tags (origen del formato de EPC usado acá).
