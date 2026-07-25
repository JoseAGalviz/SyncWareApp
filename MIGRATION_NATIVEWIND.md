# Migración a NativeWind + tema oscuro/verde — estado

Pedido: rediseño completo de la app con NativeWind, tema oscuro, acento verde
(el verde que ya existía en Theme.js: `#10B981`). Migración COMPLETA elegida
por el usuario (no solo re-tema con StyleSheet).

## Hecho

1. **Infra NativeWind instalada y probada** (compila OK, verificado con
   `CI=1 npx expo start --port XXXX` + `curl .../index.bundle?platform=android&dev=true`
   — no hay simulador/dispositivo en este entorno, solo se validó que el bundle
   compila sin errores, **falta probar visualmente en dispositivo/emulador real**):
   - `nativewind@4.2.6` + `tailwindcss@3.4.17` en package.json
   - `babel.config.js`: agregado `nativewind/babel` + `jsxImportSource: 'nativewind'`
     en preset expo (se mantuvo `react-native-reanimated/plugin` y `react-native-dotenv`)
   - `metro.config.js`: envuelto con `withNativeWind(config, { input: './global.css' })`,
     se preservó el proxy middleware existente (`/api` -> `98.94.185.164.nip.io`)
   - `tailwind.config.js` creado, `darkMode: 'class'`, paleta custom:
     `primary` (#10B981/#059669/#34D399), `surface.base/raised/card/border`
     (#0B1120/#111827/#1A2333/#2A3446), `ink` (#E5E7EB/#94A3B8/#64748B),
     `warning`/`danger`/`info`
   - `global.css` con las 3 directivas `@tailwind`
   - `App.js`: `import "./global.css"` agregado como primera línea
   - `app.json`: `userInterfaceStyle` light->dark, splash `backgroundColor` ->
     `#0B1120`

2. **`src/constants/Theme.js` re-coloreado a dark+verde.** Casi TODA la app
   lee colores vía `Theme.colors.X` o `COLORS.X` (re-export en
   `src/constants/Colors.js`) — nunca hex directo salvo 2 excepciones (ver
   abajo) — así que este cambio re-temátiza automáticamente ~19 de 21
   pantallas sin tocarlas una por una. Mismas claves que antes, valores
   nuevos (ver el archivo).

3. **Fix de contraste global aplicado (importante, no revertir):** la clave
   `Theme.colors.dark` se usaba para DOS cosas distintas — fondo de navbars/
   badges (backgroundColor) Y color de texto de encabezados (color). Con tema
   oscuro, un texto casi negro sobre fondo oscuro queda invisible. Se hizo un
   `perl` sed con lookbehind negativo que cambió **solo** los usos de texto/
   icono (`color: Theme.colors.dark` y `color={Theme.colors.dark}`) a
   `Theme.colors.text`, sin tocar ningún `backgroundColor: Theme.colors.dark`
   (esos siguen bien, es fondo oscuro legítimo en navbars/badges). Archivos
   tocados: `CoberturaVendedoresScreen.styles.js`, `LotesScreen.styles.js`,
   `HomeScreen.styles.js`, `RutasVendedoresScreen.styles.js`,
   `RutagramaScreen.styles.js`, `GuiaCargaScreen.styles.js`,
   `HomeScreenConductor.styles.js`, `MatrixExcelScreen.styles.js`,
   `RecepcionGuiasScreen.styles.js`, `UserDataScreen.styles.js`,
   `ChequeoGuiaCargaScreen.js`, `DespachoScreen.styles.js`,
   `CargarRutaScreen.styles.js`, `MontarPedidoScreen.styles.js`,
   `VisitaScreen.styles.js`, `LotesScreen.js`, `FacturasScreen.styles.js`.

4. **`MontarPedidoScreen.styles.js`**: caja de error con hex hardcodeado
   (`#fef2f2`/`#fecaca`, rojo clarito ilegible en dark) -> reemplazado por
   `Theme.colors.errorLight` / `Theme.colors.error`.

5. **`src/screens/LoginScreen.js`**: migrada 100% a NativeWind (className).
   Se borró `src/styles/LoginScreen.styles.js` (ya no se usa, nadie más lo
   importaba). Botón de login nativo `<Button>` reemplazado por
   `TouchableOpacity` con estilo moderno (antes usaba el `<Button>` feo de
   RN puro).

## Pendiente (en orden sugerido)

- [ ] **`src/screens/HomeScreen.js`** — YA LEÍDA y analizada, falta escribir
  la versión NativeWind. 632 líneas, usa `src/styles/HomeScreen.styles.js`
  (StyleSheet, aún no borrado). Detalles a preservar: botón sync con
  ActivityIndicator, caja "Clientes asignados", 4 botones de acción grandes
  (Negociaciones, Cobranza Preventiva, Cartera de Clientes, Comparador,
  Catálogo — los últimos 2 tienen colores hardcodeados intencionales
  `#7B5EA7` y `#E07B39`, son accents de marca, mantenerlos como
  `bg-[#7B5EA7]`/`bg-[#E07B39]` arbitrary values, NO llevarlos a la paleta
  del tema), sección de KPIs (varias tarjetas con labels/valores), overlay
  de sincronización, modal de descuento para generar PDF de Cobranza
  Preventiva. Header usa `Theme.colors.dark` como fondo (bien, no tocar) y
  `COLORS.WHITE` para el ícono del menú (bien).

- [ ] **17 pantallas restantes** a convertir de StyleSheet a NativeWind
  (className), una por una, verificando compilación del bundle después de
  cada una (ver método de prueba abajo — no hay emulador en este entorno):
  `DocumentosScreen.js`, `UserDataScreen.js`, `CoberturaVendedoresScreen.js`,
  `MatrixExcelScreen.js`, `PedidosHistorialScreen.js`,
  `PotencialCiudadesScreen.js`, `RutasVendedoresScreen.js`,
  `DespachoScreen.js`, `RutagramaScreen.js`, `LotesScreen.js`,
  `FacturasScreen.js`, `CargarRutaScreen.js`, `RecepcionGuiasScreen.js`,
  `ChequeoGuiaCargaScreen.js`, `VisitaScreen.js`, `GuiaCargaScreen.js`,
  `MontarPedidoScreen.js`, `HomeScreenConductor.js`.

  **Caso especial: `VisitaScreen.js`** tiene su PROPIO objeto `Colors` local
  hardcodeado con valores de tema CLARO (`BACKGROUND: '#F8FAFC'`,
  `LIGHT_BACKGROUND: '#E3F6F2'`, `ERROR: '#FF3B30'`, `TEXT: COLORS.SECONDARY`)
  que bypasea el Theme global — no se tocó en el fix de contraste a propósito.
  Necesita reescritura manual completa de esos colores al migrarla, no un
  simple find/replace.

  `CargarRutaScreen.js` y `GuiaCargaScreen.js` tienen un `const COLORS` local
  pero SOLO alias a `GlobalColors` (Theme) — no son casos especiales, se
  re-temátizan solos, tratarlos como cualquier otra pantalla al migrar a
  className.

## Método de prueba usado (sin emulador disponible)

```bash
cd SyncWareApp
CI=1 npx expo start --port 8099 > /tmp/expo.log 2>&1 &
sleep 8
curl -s "http://localhost:8099/index.bundle?platform=android&dev=true" -o /tmp/bundle.js -w "HTTP %{http_code}\n" --max-time 90
kill %1   # o el pid guardado
```
Esto solo confirma que compila (sin errores de sintaxis/módulos). **No
reemplaza probar visualmente en un dispositivo o emulador real** — falta
hacer eso en algún momento antes de dar la migración por terminada.

## Nota aparte (no relacionada a este tema, pero sigue pendiente)

Del trabajo de la API (api-app): los fixes de `fact_num` VarChar
(`facturas.controller.js:178`) y la remoción del JWT siguen commiteados y
pusheados a GitHub pero **no desplegados** en el server Windows de
producción (`C:\Users\Josea\Desktop\api-app`). Falta `git pull` + reiniciar
el proceso Node ahí.
