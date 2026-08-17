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
