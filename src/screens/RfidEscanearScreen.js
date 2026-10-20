import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, FlatList, Modal } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import RfidLectorInput from '../components/RfidLectorInput';
import EscanerInput from '../components/EscanerInput';
import { useModoEscaneo } from '../hooks/useModoEscaneo';
import styles from '../styles/Rfid.styles';
import Theme from '../constants/Theme';
import { RfidService } from '../services/rfidService';
import { DespachoService } from '../services/despachoService';
import { leerActivos, agregarActivo } from './DespachoIniciarScreen';
import { extraerEpcs, decodificarNotaDesdeEpc } from '../utils/rfid';

// Facturas: mismo formato y misma limpieza que DespachoEscanearScreen (ahí se
// escanean con cámara/lector, no tienen tag RFID).
const limpiarCodigo = (raw) => String(raw || '').trim().replace(/\s+/g, '').toUpperCase();
const FORMATO_VALIDO_FACTURA = /^([AB]\d{7}|\d{1,10})$/i;

// Fecha y hora de creación de la nota en Profit (not_ent.fe_us_in, viene como `fecha`
// en DespachoService.pendientes), ej. "24/09 08:41 a. m.".
const formatoFechaHora = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const fecha = d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' });
  const hora = d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  return `${fecha} ${hora}`;
};

const generarSesionId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Prueba acotada a una sola ruta a propósito (pedido explícito) — no es un
// selector genérico de rutas. Mismo código que usa DespachoIniciarScreen
// (constants/rutasRegiones.js: codigoRegion('MERIDA')) y que reconoce
// REGIONES en despacho.controller.js.
const RUTA_CODIGO_MERIDA = 'region:MERIDA';

const FacturaItem = React.memo(({ item }) => (
  <View style={styles.itemRow}>
    <View style={styles.itemInfo}>
      <Text style={styles.itemNota}>{item.mensajeTitulo}</Text>
      <Text
        style={[
          styles.itemDetalle,
          {
            fontWeight: '600',
            color:
              item.resultado === 'ok'
                ? Theme.colors.successDark
                : item.resultado === 'advertencia'
                ? Theme.colors.warning
                : Theme.colors.error,
          },
        ]}
      >
        {item.resultado === 'ok' ? '✓' : item.resultado === 'advertencia' ? '⚠' : '✗'} {item.mensaje}
      </Text>
    </View>
  </View>
));

const LecturaItem = React.memo(({ item }) => (
  <View style={[styles.itemRow, !item.nota && styles.itemRowDesconocido]}>
    <View style={styles.itemInfo}>
      <Text style={styles.itemNota}>{item.nota ? `Nota ${item.nota}` : 'TAG SIN ASOCIAR'}</Text>
      <Text style={styles.itemDetalle}>{item.epc} · leído {item.vecesLeido}x</Text>
      {item.registroReal === 'pendiente' && (
        <Text style={styles.itemDetalle}>Registrando en el rutagrama…</Text>
      )}
      {item.registroReal === 'ok' && (
        <Text style={[styles.itemDetalle, { color: Theme.colors.successDark, fontWeight: '600' }]}>✓ {item.registroMensaje}</Text>
      )}
      {item.registroReal === 'advertencia' && (
        <Text style={[styles.itemDetalle, { color: Theme.colors.warning, fontWeight: '600' }]}>⚠ {item.registroMensaje}</Text>
      )}
      {item.registroReal === 'error' && (
        <Text style={[styles.itemDetalle, { color: Theme.colors.error, fontWeight: '600' }]}>✗ {item.registroMensaje}</Text>
      )}
    </View>
  </View>
));

// Lectura continua tipo inventario: se sostiene el gatillo de la pistola y se
// van acumulando todas las notas distintas en rango. El mapeo EPC->nota se
// resuelve en memoria (cache cargado al montar), sin round-trip por lectura,
// para no perder tags en una ráfaga rápida.
//
// Prueba acotada a MERIDA: cada nota reconocida se registra DE VERDAD contra
// un rutagrama real de esa ruta (mismo endpoint que usa Despacho,
// `DespachoService.escanear`) — no es un log aparte, el resto del sistema
// (app de Despacho, visor) ve estos escaneos. El rutagrama se comparte con
// el flujo normal vía `leerActivos()`/`agregarActivo()` (DespachoIniciarScreen):
// si ya hay uno de Merida abierto se reusa, si no se inicia uno nuevo.
export default function RfidEscanearScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [userData, setUserData] = useState(null);
  const [cargandoCache, setCargandoCache] = useState(true);
  const [escaneando, setEscaneando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [lecturas, setLecturas] = useState([]);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualValor, setManualValor] = useState('');
  const [rutagrama, setRutagramaState] = useState(null); // {rutagramaId, rutaCodigo, rutaDesc}
  const [cargandoRutagrama, setCargandoRutagrama] = useState(true);
  const [iniciandoRutagrama, setIniciandoRutagrama] = useState(false);

  const [facturas, setFacturas] = useState([]);
  const [scannedFactura, setScannedFactura] = useState(false);
  const { modo: modoFactura, setModo: setModoFactura } = useModoEscaneo();

  const tagsMapRef = useRef(new Map()); // epc -> nota
  const indiceRef = useRef(new Map());  // epc -> índice en `lecturas`
  const sesionIdRef = useRef(null);
  const rutagramaRef = useRef(null);
  const userDataRef = useRef(null);
  const ultimoEscaneoFacturaRef = useRef({ codigo: '', ts: 0 });
  const colaRegistroRef = useRef(Promise.resolve());

  const setRutagrama = useCallback((val) => { rutagramaRef.current = val; setRutagramaState(val); }, []);

  useEffect(() => {
    AsyncStorage.getItem('userData').then((str) => { if (str) { const u = JSON.parse(str); userDataRef.current = u; setUserData(u); } });
  }, []);

  const buscarRutagramaActivo = useCallback(async () => {
    setCargandoRutagrama(true);
    try {
      const activos = await leerActivos();
      const merida = activos.find((a) => a.rutaCodigo === RUTA_CODIGO_MERIDA);
      if (merida) setRutagrama(merida);
    } catch (e) {
      console.error('Error buscando rutagrama activo de Merida', e);
    } finally {
      setCargandoRutagrama(false);
    }
  }, [setRutagrama]);

  // También al recuperar foco: puede haberse iniciado/cerrado el rutagrama de
  // Merida desde la pantalla normal de Despacho mientras tanto.
  useEffect(() => { if (isFocused && userData?.id) buscarRutagramaActivo(); }, [isFocused, userData?.id, buscarRutagramaActivo]);

  const iniciarRutagramaMerida = useCallback(async () => {
    if (!userData?.id) return;
    setIniciandoRutagrama(true);
    try {
      const resultado = await DespachoService.iniciar({ usuario_id: userData.id, ruta_codigo: RUTA_CODIGO_MERIDA });
      const nuevo = { rutagramaId: resultado.rutagrama_id, rutaCodigo: resultado.ruta_codigo, rutaDesc: resultado.ruta_desc };
      await agregarActivo(nuevo);
      setRutagrama(nuevo);
      showMessage({ message: 'Rutagrama MERIDA iniciado', description: nuevo.rutaDesc, type: 'success', duration: 2200 });
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo iniciar el rutagrama de Merida.';
      showMessage({ message: 'Error', description: msg, type: 'danger', duration: 2800 });
    } finally {
      setIniciandoRutagrama(false);
    }
  }, [userData, setRutagrama]);

  const cargarCache = useCallback(async () => {
    setCargandoCache(true);
    try {
      const res = await RfidService.listarTags();
      const mapa = new Map();
      (res?.items || []).forEach((t) => mapa.set(t.epc, t.nota));
      tagsMapRef.current = mapa;
    } catch (e) {
      console.error('Error cargando mapeo RFID', e);
      showMessage({ message: 'No se pudo cargar el mapeo de tags', type: 'warning', duration: 2400 });
    } finally {
      setCargandoCache(false);
    }
  }, []);

  useEffect(() => { if (isFocused) cargarCache(); }, [isFocused, cargarCache]);

  // Notas de la ruta MERIDA (mismo endpoint que usa "Notas de esta ruta" en
  // Despacho normal): se ven todas de entrada, y se resaltan en verde apenas
  // una lectura RFID hace match — así se ve visualmente qué falta.
  const [notasRuta, setNotasRuta] = useState([]);
  const [cargandoNotasRuta, setCargandoNotasRuta] = useState(false);

  const cargarNotasRuta = useCallback(async () => {
    const ruta = rutagramaRef.current;
    const usuario = userDataRef.current;
    if (!ruta || !usuario) return;
    setCargandoNotasRuta(true);
    try {
      const res = await DespachoService.pendientes(ruta.rutagramaId, usuario.id);
      setNotasRuta(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error('Error cargando notas de la ruta MERIDA', e);
      showMessage({ message: 'No se pudieron cargar las notas de la ruta', type: 'warning', duration: 2400 });
    } finally {
      setCargandoNotasRuta(false);
    }
  }, []);

  useEffect(() => { if (rutagrama?.rutagramaId) cargarNotasRuta(); }, [rutagrama?.rutagramaId, cargarNotasRuta]);

  // Notas reconocidas por RFID en esta sesión (registradas con éxito contra
  // el rutagrama real) — para resaltar el match en la lista de arriba.
  const notasReconocidasSet = useMemo(() => {
    const set = new Set();
    lecturas.forEach((l) => {
      if (l.nota && (l.registroReal === 'ok' || l.registroReal === 'advertencia')) set.add(String(l.nota));
    });
    return set;
  }, [lecturas]);

  const actualizarRegistroReal = useCallback((epc, estado, mensaje) => {
    setLecturas((prev) => {
      const idx = indiceRef.current.get(epc);
      if (idx == null) return prev;
      const copia = [...prev];
      copia[idx] = { ...copia[idx], registroReal: estado, registroMensaje: mensaje };
      return copia;
    });
  }, []);

  // Registro DE VERDAD contra el rutagrama real de Merida — mismo endpoint
  // que usa la pantalla de Despacho normal. Sin `caja`: el server la
  // autoincrementa (yaEsc+1), que es lo correcto acá — cada EPC distinto es
  // un tag físico (una caja) aunque decodifique a la misma nota.
  // Encolado y disparado de a uno: en modo inventario una sola ronda puede traer
  // decenas de EPC nuevos de golpe (gatillo sostenido). Antes cada uno disparaba su
  // POST en paralelo — decenas de requests simultáneos contra el mismo rutagrama
  // saturaban el pool de MySQL del server y la app se sentía trabada mientras
  // esperaba que todas resolvieran a la vez. Encolar mantiene la lectura de tags
  // fluida (no depende de la red) y el registro real se pone al día un poco después,
  // de a uno, sin saturar el backend.
  const registrarEnRutagramaReal = useCallback((epc, nota) => {
    const ruta = rutagramaRef.current;
    const usuario = userDataRef.current;
    if (!ruta || !usuario) return;
    colaRegistroRef.current = colaRegistroRef.current.then(async () => {
      try {
        const res = await DespachoService.escanear(ruta.rutagramaId, { usuario_id: usuario.id, codigo: nota });
        const advertencia = res?.advertencias?.[0] || null;
        actualizarRegistroReal(epc, advertencia ? 'advertencia' : 'ok', advertencia || `Registrada (${res?.accion || 'caja'})`);
      } catch (error) {
        const msg = error.data?.error || error.message || 'No se pudo registrar en el rutagrama.';
        actualizarRegistroReal(epc, 'error', msg);
      }
    });
  }, [actualizarRegistroReal]);

  // Las facturas de Profit no llevan tag RFID (solo la nota de entrega se etiqueta al
  // imprimir, ver etiquetaRfid.ts en sistema_operaciones) — se escanean con cámara o
  // lector bluetooth genérico (EscanerInput, igual que DespachoEscanearScreen), contra
  // el MISMO endpoint unificado `escanear` que ya usa el flujo de cajas RFID de arriba.
  // Así esta pantalla completa un pedido entero (cajas por RFID + factura) sin volver a
  // la pantalla normal de Despacho.
  const procesarCodigoFactura = useCallback(async (codigoRaw) => {
    const ruta = rutagramaRef.current;
    const usuario = userDataRef.current;
    const codigo = limpiarCodigo(codigoRaw);
    if (!ruta || !usuario || !codigo) return;
    try {
      const res = await DespachoService.escanear(ruta.rutagramaId, { usuario_id: usuario.id, codigo });
      const f = res?.fila;
      const adv = (res?.advertencias || []).join(' · ');
      const titulo =
        res?.accion === 'caja'
          ? `NOTA ${f?.nota ?? codigo}`
          : res?.accion === 'nota_credito'
          ? `${f?.status === 'NDB' ? 'N/DÉBITO' : 'N/CRÉDITO'} ${f?.nota ?? codigo}`
          : `FACTURA ${f?.factura || codigo}`;
      setFacturas((prev) => [
        ...prev,
        { id: `${Date.now()}-${codigo}`, mensajeTitulo: titulo, mensaje: adv || 'Registrada', resultado: adv ? 'advertencia' : 'ok' },
      ]);
    } catch (error) {
      const msg = (error.data?.error || error.message || 'No se pudo procesar el escaneo.')
        .replace(/:\s*(POST|GET|PUT|DELETE)\s+\/\S+\s*$/i, '')
        .replace(/^\d+:\s*/, '')
        .trim();
      if (/se está procesando/i.test(msg)) return; // doble disparo del lector, se ignora sin ruido
      setFacturas((prev) => [...prev, { id: `${Date.now()}-${codigo}`, mensajeTitulo: codigo, mensaje: msg, resultado: 'error' }]);
    }
  }, []);

  // Mismo cooldown que DespachoEscanearScreen: frena la ráfaga de re-lecturas del
  // lector, no el escaneo deliberado de la siguiente factura.
  const COOLDOWN_FACTURA_MS = 900;
  const handleEscaneoFactura = useCallback((dataRaw) => {
    if (scannedFactura) return;
    const codigo = limpiarCodigo(dataRaw);
    if (!codigo || !FORMATO_VALIDO_FACTURA.test(codigo)) return; // ruido del lector
    const ahora = Date.now();
    if (codigo === ultimoEscaneoFacturaRef.current.codigo && ahora - ultimoEscaneoFacturaRef.current.ts < COOLDOWN_FACTURA_MS) return;
    ultimoEscaneoFacturaRef.current = { codigo, ts: ahora };
    setScannedFactura(true);
    procesarCodigoFactura(codigo).finally(() => setScannedFactura(false));
  }, [scannedFactura, procesarCodigoFactura]);

  // En modo inventario la SR160 no manda un Enter por tag: cada ronda de
  // barrido tipea todos los EPC detectados pegados uno atrás del otro y
  // recién ahí manda un solo Enter — `codigoRaw` puede traer varios EPC
  // concatenados (longitud fija, ver utils/rfid.js). Se parte y se registra
  // cada uno por separado.
  const registrarEpc = useCallback((epc, ahora) => {
    const esNueva = !indiceRef.current.has(epc);
    // Prioridad: decodificar la nota directo del EPC (así graba
    // sistema_operaciones sus etiquetas — no es un ID opaco). Si no calza
    // ese formato, cae al mapeo manual (tags asociados a mano).
    const nota = esNueva ? (decodificarNotaDesdeEpc(epc) || tagsMapRef.current.get(epc) || null) : null;

    setLecturas((prev) => {
      const idx = indiceRef.current.get(epc);
      if (idx != null) {
        const copia = [...prev];
        copia[idx] = { ...copia[idx], vecesLeido: copia[idx].vecesLeido + 1, ultima: ahora };
        return copia;
      }
      indiceRef.current.set(epc, prev.length);
      return [...prev, { epc, nota, vecesLeido: 1, primera: ahora, ultima: ahora, registroReal: nota ? 'pendiente' : null, registroMensaje: null }];
    });

    if (esNueva && nota) registrarEnRutagramaReal(epc, nota);
  }, [registrarEnRutagramaReal]);

  const onLectura = useCallback((codigoRaw) => {
    const epcs = extraerEpcs(codigoRaw);
    if (epcs.length === 0) return;
    const ahora = new Date().toISOString();
    epcs.forEach((epc) => registrarEpc(epc, ahora));
  }, [registrarEpc]);

  const iniciar = useCallback(() => {
    sesionIdRef.current = generarSesionId();
    indiceRef.current = new Map();
    setLecturas([]);
    setGuardado(false);
    setEscaneando(true);
  }, []);

  const detenerYGuardar = useCallback(async () => {
    setEscaneando(false);
    if (lecturas.length === 0) return;
    setGuardando(true);
    try {
      const payload = lecturas.map((l) => ({
        epc: l.epc,
        nota: l.nota,
        veces_leido: l.vecesLeido,
        primera_lectura: l.primera,
        ultima_lectura: l.ultima,
      }));
      await RfidService.guardarLecturas({ usuario_id: userData.id, sesion_id: sesionIdRef.current, lecturas: payload });
      setGuardado(true);
      showMessage({ message: 'Sesión guardada', description: `${lecturas.length} tags distintos`, type: 'success', duration: 2200 });
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo guardar la sesión.';
      showMessage({ message: 'Error', description: msg, type: 'danger', duration: 2800 });
    } finally {
      setGuardando(false);
    }
  }, [lecturas, userData]);

  // Entrada manual: una lectura, no un buffer con varias pegadas — no pasa
  // por extraerEpcs(). Si se tipea un nº de nota corto (ej. "471103") se
  // rellena con ceros a 24 igual que sistema_operaciones al grabar el tag,
  // así también sirve para probar sin escribir el EPC completo.
  const confirmarManual = useCallback(() => {
    const limpio = String(manualValor || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!limpio) return;
    const epc = limpio.padStart(24, '0').slice(-24);
    setManualValor('');
    registrarEpc(epc, new Date().toISOString());
  }, [manualValor, registrarEpc]);

  const { reconocidas, sinAsociar, totalLecturas } = useMemo(() => {
    const rec = lecturas.filter((l) => l.nota).length;
    const total = lecturas.reduce((acc, l) => acc + l.vecesLeido, 0);
    return { reconocidas: rec, sinAsociar: lecturas.length - rec, totalLecturas: total };
  }, [lecturas]);

  // Tags leídos que sí decodifican una nota pero el server la rechazó por no ser de esta
  // ruta (registrarEnRutagramaReal guarda el mensaje real de escanear(), ver
  // despacho.controller.js: "Nota no pertenece a esta ruta.", "Factura no encontrada o no
  // pertenece a esta ruta.", "${tipo} no pertenece a esta ruta") — se separan del resto de
  // errores (anulada, ya despachada, etc.) porque acá indican pedido de OTRA ruta en el lote.
  const fueraDeRuta = useMemo(
    () => lecturas.filter((l) => l.registroReal === 'error' && /no pertenece a esta ruta/i.test(l.registroMensaje || '')),
    [lecturas]
  );

  const listaOrdenada = useMemo(() => [...lecturas].reverse(), [lecturas]);

  if (!userData) return null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>
          Sostené el gatillo para acumular todas las notas en rango. "Detener y guardar" cierra la sesión.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Ruta de prueba</Text>
          {cargandoRutagrama ? (
            <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginTop: Theme.spacing.sm }} />
          ) : rutagrama ? (
            <Text style={styles.itemNota}>Rutagrama activo: {rutagrama.rutaDesc} (#{rutagrama.rutagramaId})</Text>
          ) : (
            <>
              <Text style={styles.itemDetalle}>Todavía no hay un rutagrama de MERIDA abierto para esta prueba.</Text>
              <TouchableOpacity
                style={[styles.primaryButton, iniciandoRutagrama && styles.buttonDisabled]}
                onPress={iniciarRutagramaMerida}
                disabled={iniciandoRutagrama}
                activeOpacity={0.85}
              >
                {iniciandoRutagrama ? <ActivityIndicator size="small" color={Theme.colors.white} /> : <Text style={styles.primaryButtonText}>Iniciar rutagrama MERIDA</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>

        {rutagrama && (
          <View style={styles.bannerAdvertencia}>
            <Text style={styles.bannerAdvertenciaTexto}>
              Cada nota reconocida se registra DE VERDAD en este rutagrama (mismo endpoint que usa Despacho) — no es solo un log de prueba.
            </Text>
          </View>
        )}

        {rutagrama && (
          <View style={styles.card}>
            <Text style={styles.label}>Escanear factura</Text>
            <Text style={styles.itemDetalle}>
              La factura no lleva tag RFID — se escanea con cámara o lector bluetooth,
              contra el mismo pedido que las cajas. Sirve para cerrar la ruta completa
              (cajas + factura) sin salir de esta pantalla.
            </Text>
            <EscanerInput
              modo={modoFactura}
              setModo={setModoFactura}
              isFocused={isFocused}
              disabled={scannedFactura}
              onScan={handleEscaneoFactura}
            />
            <Text style={styles.listaTitulo}>Facturas escaneadas ({facturas.length})</Text>
            {facturas.length === 0 ? (
              <Text style={styles.emptyListText}>Todavía no se escaneó ninguna factura.</Text>
            ) : (
              <FlatList
                data={[...facturas].reverse()}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <FacturaItem item={item} />}
                scrollEnabled={false}
              />
            )}
          </View>
        )}

        {rutagrama && (
          <>
            <Text style={styles.listaTitulo}>
              Notas de la ruta MERIDA ({notasRuta.length}
              {notasReconocidasSet.size > 0 ? ` · ${notasReconocidasSet.size} reconocidas ahora` : ''})
            </Text>
            {cargandoNotasRuta ? (
              <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginVertical: 20 }} />
            ) : notasRuta.length === 0 ? (
              <Text style={styles.emptyListText}>No hay notas pendientes de Profit para Merida en estos últimos 21 días.</Text>
            ) : (
              <FlatList
                data={notasRuta.slice(0, 200)}
                keyExtractor={(item) => String(item.fact_num)}
                renderItem={({ item }) => {
                  const notaStr = String(item.fact_num);
                  const matcheada = notasReconocidasSet.has(notaStr);
                  const rowStyle = matcheada
                    ? styles.itemRowMatch
                    : item.ya_escaneada
                    ? styles.itemRowYaEscaneada
                    : null;
                  const fechaHora = formatoFechaHora(item.fecha);
                  const tieneFactura = !!item.factura_generada;
                  return (
                    <View style={[styles.itemRow, rowStyle]}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemNota}>Nota {item.fact_num}</Text>
                        <Text style={styles.itemDetalle}>
                          {item.cli_des || 'Sin nombre'}{fechaHora ? ` · creada ${fechaHora}` : ''}
                        </Text>
                        <Text
                          style={[
                            styles.itemDetalle,
                            { fontWeight: '600', color: tieneFactura ? Theme.colors.successDark : Theme.colors.muted },
                          ]}
                        >
                          {tieneFactura ? `Fact ${item.factura_generada}` : 'sin factura generada aún'}
                        </Text>
                      </View>
                      {matcheada && <Text style={styles.pillMatch}>✓ LEÍDA</Text>}
                      {!matcheada && item.ya_escaneada && <Text style={styles.itemDetalle}>ya escaneada</Text>}
                    </View>
                  );
                }}
                scrollEnabled={false}
              />
            )}
            {notasRuta.length > 200 && (
              <Text style={styles.emptyListText}>Mostrando las primeras 200 de {notasRuta.length}.</Text>
            )}
          </>
        )}

        {cargandoCache ? (
          <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <>
            <RfidLectorInput activo={escaneando && !!rutagrama} isFocused={isFocused} onLectura={onLectura} />

            <View style={styles.countersRow}>
              <View style={styles.counterPill}>
                <Text style={styles.counterLabel}>Tags distintos</Text>
                <Text style={styles.counterValue}>{lecturas.length}</Text>
              </View>
              <View style={styles.counterPill}>
                <Text style={styles.counterLabel}>Reconocidas</Text>
                <Text style={styles.counterValue}>{reconocidas}</Text>
              </View>
              <View style={styles.counterPill}>
                <Text style={styles.counterLabel}>Sin asociar</Text>
                <Text style={styles.counterValue}>{sinAsociar}</Text>
              </View>
              <View style={styles.counterPill}>
                <Text style={styles.counterLabel}>Lecturas totales</Text>
                <Text style={styles.counterValue}>{totalLecturas}</Text>
              </View>
              <View style={styles.counterPill}>
                <Text style={styles.counterLabel}>Fuera de ruta</Text>
                <Text style={styles.counterValue}>{fueraDeRuta.length}</Text>
              </View>
            </View>

            {fueraDeRuta.length > 0 && (
              <>
                <Text style={styles.listaTitulo}>Pedidos leídos que no son de esta ruta ({fueraDeRuta.length})</Text>
                <FlatList
                  data={[...fueraDeRuta].reverse()}
                  keyExtractor={(item) => item.epc}
                  renderItem={({ item }) => (
                    <View style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemNota}>{item.nota ? `Nota ${item.nota}` : item.epc}</Text>
                        <Text style={[styles.itemDetalle, { color: Theme.colors.error, fontWeight: '600' }]}>✗ {item.registroMensaje}</Text>
                      </View>
                    </View>
                  )}
                  scrollEnabled={false}
                />
              </>
            )}

            {!escaneando ? (
              <TouchableOpacity
                style={[styles.primaryButton, !rutagrama && styles.buttonDisabled]}
                onPress={iniciar}
                disabled={!rutagrama}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>{lecturas.length > 0 ? 'Iniciar nueva sesión' : 'Iniciar lectura'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.dangerButton, guardando && styles.buttonDisabled]}
                onPress={detenerYGuardar}
                disabled={guardando}
                activeOpacity={0.85}
              >
                {guardando ? <ActivityIndicator size="small" color={Theme.colors.white} /> : <Text style={styles.dangerButtonText}>Detener y guardar</Text>}
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.secondaryButton} onPress={() => setManualVisible(true)} activeOpacity={0.85} disabled={!escaneando}>
              <Text style={styles.secondaryButtonText}>Escribir EPC manualmente</Text>
            </TouchableOpacity>

            {guardado && (
              <View style={styles.bannerAdvertencia}>
                <Text style={styles.bannerAdvertenciaTexto}>Sesión guardada. Podés revisar la lista abajo o iniciar una nueva.</Text>
              </View>
            )}

            <Text style={styles.listaTitulo}>Lecturas de esta sesión ({lecturas.length})</Text>
            {lecturas.length === 0 ? (
              <Text style={styles.emptyListText}>Todavía no se leyó ningún tag.</Text>
            ) : (
              <>
                <FlatList
                  // Tope de render, no de datos: `detenerYGuardar` sigue mandando la lista
                  // completa (`lecturas`). Una ronda de inventario larga puede acumular
                  // cientos de tags — este FlatList está anidado sin scroll propio dentro
                  // del ScrollView de la pantalla (igual que "Notas de la ruta" arriba), así
                  // que no virtualiza solo: sin este tope, cada tag nuevo re-renderiza TODA
                  // la lista completa, no solo lo visible, y eso es lo que se siente lento
                  // durante el escaneo.
                  data={listaOrdenada.slice(0, 150)}
                  keyExtractor={(item) => item.epc}
                  renderItem={({ item }) => <LecturaItem item={item} />}
                  scrollEnabled={false}
                />
                {lecturas.length > 150 && (
                  <Text style={styles.emptyListText}>
                    Mostrando las últimas 150 de {lecturas.length} — todas se guardan igual al "Detener y guardar".
                  </Text>
                )}
              </>
            )}
          </>
        )}

        <Modal visible={manualVisible} transparent animationType="fade" onRequestClose={() => setManualVisible(false)}>
          <View style={styles.modalBackground}>
            <View style={styles.card}>
              <Text style={styles.listaTitulo}>Escribir EPC</Text>
              <Text style={styles.label}>EPC del tag</Text>
              <TextInput
                style={styles.input}
                value={manualValor}
                onChangeText={setManualValor}
                autoCapitalize="characters"
                autoFocus
              />
              <TouchableOpacity style={styles.primaryButton} onPress={() => { confirmarManual(); setManualVisible(false); }} activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Agregar lectura</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setManualVisible(false)} activeOpacity={0.85}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}
