import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, FlatList, Modal, Alert } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useCameraPermissions } from 'expo-camera';
import { useModoEscaneo, MODO_CAMARA } from '../hooks/useModoEscaneo';
import EscanerInput from '../components/EscanerInput';
import styles from '../styles/Despacho.styles';
import Theme from '../constants/Theme';
import { DespachoService } from '../services/despachoService';
import { Tarjeta, Pill, Aviso, Boton, Segmentado } from '../components/ui';

// Vendedor: escanea lo que recibió de UN rutagrama cerrado — todo el rutagrama, no solo sus
// pedidos (los de otros vendedores van marcados). Cada pedido se completa con la nota (caja)
// y la factura, en cualquier orden. El backend resuelve qué documento es cada código
// (despachoVendedor.js en api-app); acá solo se muestra. "Cerrar recepción" guarda lo que
// falte como faltante y bloquea más escaneos del rutagrama, para todos.
// Diseño: "Recibir · Escaneo" del lienzo SyncWareApp.
const C = Theme.colors;
const limpiar = (raw) => String(raw || '').trim().replace(/\s+/g, '').toUpperCase();
const FORMATO_VALIDO = /^([AB]\d{7}|\d{1,10}|VAL\d+)$/i;
const COOLDOWN_MS = 1500;

const Marca = ({ ok, label }) => (
  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <Text style={{ fontWeight: '800', color: ok ? C.primaryDark : C.muted }}>{ok ? '✓' : '○'}</Text>
    <Text style={{ fontSize: 13, color: ok ? C.text : C.muted }}>{label}</Text>
  </View>
);

const PedidoItem = React.memo(({ item }) => {
  const parcial = !item.completo && (item.nota_recibida || item.factura_recibida);
  return (
    <Tarjeta completa={item.completo} style={{ borderRadius: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: C.text }} numberOfLines={1}>{item.cliente}</Text>
        {item.completo ? <Pill tono="verde">COMPLETO</Pill> : parcial ? <Pill tono="ambar">PARCIAL</Pill> : <Pill>PENDIENTE</Pill>}
      </View>
      {!item.mio ? <Text style={{ fontSize: 12, color: C.muted }}>Vendedor {item.vendedor || '—'}</Text> : null}
      <Text style={{ fontSize: 12, color: C.muted, fontFamily: Theme.fontMono }}>
        N-{item.nota}{item.factura ? `  ·  F-${item.factura}` : ''}{item.paquetes ? `  ·  ${item.paquetes} caja(s)` : ''}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Marca ok={item.nota_recibida} label={item.fecha_nota ? `Nota · ${item.fecha_nota.slice(11, 16)}` : 'Nota'} />
        {item.factura ? (
          <Marca ok={item.factura_recibida} label={item.fecha_factura ? `Factura · ${item.fecha_factura.slice(11, 16)}` : 'Factura'} />
        ) : null}
      </View>
    </Tarjeta>
  );
});

export default function RecibirRutagramaScreen({ route, navigation }) {
  const { rutagramaId, usuarioId } = route.params;
  const isFocused = useIsFocused();
  const { modo, setModo, cargado } = useModoEscaneo();
  const [permission, requestPermission] = useCameraPermissions();

  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualValor, setManualValor] = useState('');
  const [procesandoManual, setProcesandoManual] = useState(false);
  const [avisoDoble, setAvisoDoble] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [cerrando, setCerrando] = useState(false);
  const ultimoEscaneoRef = useRef({ codigo: '', ts: 0 });

  // Subtítulo del encabezado: avance de mis pedidos.
  useEffect(() => {
    if (!data) return;
    navigation.setOptions({
      headerSubtitle: `${data.recibidos ?? 0}/${data.pedidos ?? 0} completos · tuyos ${data.mis_recibidos ?? 0}/${data.mis_pedidos ?? 0}`,
    });
  }, [data, navigation]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setData(await DespachoService.vendedorRutagrama(rutagramaId, usuarioId));
    } catch (e) {
      setError(e.data?.error || e.message || 'No se pudo cargar el rutagrama.');
    } finally {
      setCargando(false);
    }
  }, [rutagramaId, usuarioId]);

  useEffect(() => { if (isFocused) cargar(); }, [isFocused, cargar]);

  const registrar = useCallback(async (codigo) => {
    try {
      const res = await DespachoService.vendedorEscanear(rutagramaId, { usuario_id: usuarioId, codigo });
      const fila = res?.fila;
      if (fila) {
        setData((prev) => {
          if (!prev) return prev;
          const items = prev.items.map((i) => (i.id === fila.id ? fila : i));
          return {
            ...prev, items,
            recibidos: items.filter((i) => i.completo).length,
            mis_recibidos: items.filter((i) => i.mio && i.completo).length,
          };
        });
      }
      if (res?.duplicado) {
        setAvisoDoble(res.advertencia || `Escaneo doble: ${codigo}`);
        showMessage({ message: '⚠ ESCANEO DOBLE', description: res.advertencia, type: 'warning', duration: 3500 });
        return;
      }
      setAvisoDoble('');
      showMessage({
        message: `${res?.documento === 'factura' ? 'Factura' : 'Nota'} recibida`,
        description: [
          fila?.cliente,
          fila && !fila.mio ? `Pedido de otro vendedor (${fila.vendedor || '—'})` : null,
          fila?.completo ? 'Pedido completo ✓' : res?.advertencia,
        ].filter(Boolean).join(' · '),
        type: fila?.completo ? 'success' : 'info',
        duration: 1800,
      });
    } catch (e) {
      showMessage({ message: 'Error', description: `${codigo}: ${e.data?.error || e.message || 'No se pudo registrar.'}`, type: 'danger', duration: 3500 });
    }
  }, [rutagramaId, usuarioId]);

  const handleEscaneo = useCallback((dataRaw) => {
    if (scanned) return;
    const codigo = limpiar(dataRaw);
    if (!codigo || !FORMATO_VALIDO.test(codigo)) return;
    const ahora = Date.now();
    if (codigo === ultimoEscaneoRef.current.codigo && ahora - ultimoEscaneoRef.current.ts < COOLDOWN_MS) return;
    ultimoEscaneoRef.current = { codigo, ts: ahora };
    setScanned(true);
    registrar(codigo).finally(() => setScanned(false));
  }, [scanned, registrar]);

  const confirmarManual = useCallback(async () => {
    const valor = limpiar(manualValor);
    if (!valor) return;
    if (!FORMATO_VALIDO.test(valor)) {
      showMessage({ message: 'Formato no reconocido', description: 'Nº de nota o factura, con o sin letra al inicio.', type: 'warning', duration: 2800 });
      return;
    }
    setProcesandoManual(true);
    await registrar(valor);
    setProcesandoManual(false);
    setManualVisible(false);
    setManualValor('');
  }, [manualValor, registrar]);

  const cerrarRecepcion = useCallback(() => {
    const faltan = (data?.items || []).filter((i) => !i.completo).length;
    Alert.alert(
      'Cerrar recepción',
      faltan
        ? `Quedan ${faltan} pedido(s) sin escanear completos. Se guardarán como faltantes y nadie podrá seguir escaneando este rutagrama.`
        : 'Todo está escaneado. Nadie podrá seguir escaneando este rutagrama.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar', style: 'destructive',
          onPress: async () => {
            setCerrando(true);
            try {
              const res = await DespachoService.vendedorCerrarRecepcion(rutagramaId, { usuario_id: usuarioId });
              showMessage({
                message: 'Recepción cerrada',
                description: res?.faltantes ? `${res.faltantes} pedido(s) quedaron como faltantes.` : 'Sin faltantes.',
                type: res?.faltantes ? 'warning' : 'success',
                duration: 3000,
              });
              await cargar();
            } catch (e) {
              showMessage({ message: 'No se pudo cerrar', description: e.data?.error || e.message, type: 'danger', duration: 3500 });
              await cargar();
            } finally {
              setCerrando(false);
            }
          },
        },
      ],
    );
  }, [data, rutagramaId, usuarioId, cargar]);

  if (!cargado) return null;
  if (modo === MODO_CAMARA) {
    if (!permission) return <Text>Solicitando permiso de cámara...</Text>;
    if (!permission.granted) {
      return (
        <View style={{ flex: 1, backgroundColor: C.background, justifyContent: 'center', padding: 24, gap: 12 }}>
          <Text style={{ textAlign: 'center', color: C.muted }}>No se concedió acceso a la cámara.</Text>
          <Boton titulo="Permitir cámara" onPress={requestPermission} />
        </View>
      );
    }
  }

  const items = data?.items || [];
  const cierre = data?.cierre || null;
  const visibles = filtro === 'mios' ? items.filter((i) => i.mio) : filtro === 'pendientes' ? items.filter((i) => !i.completo) : items;
  const pendientesPrimero = [...visibles].sort((a, b) => Number(a.completo) - Number(b.completo));

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        {data ? (
          <Text style={{ fontSize: 12, color: C.muted }}>
            {data.ruta} · cerrado {data.fecha_cierre}
            {data.conductor ? ` · Chofer ${data.conductor}` : ''}
          </Text>
        ) : null}
        {error ? <Aviso tono="rojo">{error}</Aviso> : null}

        {cierre ? (
          <Aviso tono={cierre.faltantes ? 'ambar' : 'exito'}>
            Recepción cerrada el {cierre.fecha}{cierre.por ? ` por ${cierre.por}` : ''}
            {cierre.faltantes ? ` · ${cierre.faltantes} pedido(s) faltantes` : ' · sin faltantes'}
          </Aviso>
        ) : (
          <EscanerInput modo={modo} setModo={setModo} isFocused={isFocused} disabled={scanned} onScan={handleEscaneo} />
        )}

        {avisoDoble ? <Aviso tono="ambar">{avisoDoble}</Aviso> : null}

        <Segmentado
          opciones={[{ value: 'todos', label: 'Todos' }, { value: 'mios', label: 'Míos' }, { value: 'pendientes', label: 'Pendientes' }]}
          valor={filtro}
          onChange={setFiltro}
        />

        {cargando && !data ? (
          <ActivityIndicator size="small" color={C.primary} style={{ marginVertical: 20 }} />
        ) : (
          <FlatList
            data={pendientesPrimero}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <PedidoItem item={item} />}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={{ textAlign: 'center', color: C.muted }}>Sin pedidos en este filtro.</Text>}
          />
        )}

        {!cierre ? (
          <>
            <Boton variante="secundario" titulo="Escribir código manualmente" alto={48} onPress={() => setManualVisible(true)} textStyle={{ fontSize: 14, fontWeight: '600' }} />
            <Boton variante="peligro" titulo="Cerrar recepción" alto={48} onPress={cerrarRecepcion} cargando={cerrando} disabled={!data} textStyle={{ fontSize: 14, fontWeight: '600' }} />
          </>
        ) : null}

        <Modal visible={manualVisible} transparent animationType="fade" onRequestClose={() => setManualVisible(false)}>
          <View style={styles.modalBackground}>
            <View style={styles.card}>
              <Text style={styles.listaTitulo}>Escribir nota o factura</Text>
              <Text style={styles.label}>Nº nota o factura</Text>
              <TextInput
                style={styles.input}
                value={manualValor}
                onChangeText={setManualValor}
                autoCapitalize="characters"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.primaryButton, procesandoManual && styles.buttonDisabled]}
                onPress={confirmarManual}
                disabled={procesandoManual}
                activeOpacity={0.85}
              >
                {procesandoManual ? <ActivityIndicator size="small" color={Theme.colors.white} /> : <Text style={styles.primaryButtonText}>Registrar</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setManualVisible(false)} disabled={procesandoManual} activeOpacity={0.85}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}
