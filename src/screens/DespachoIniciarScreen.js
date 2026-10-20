import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Tarjeta, Boton } from '../components/ui';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../styles/Despacho.styles';
import Theme from '../constants/Theme';
import { DespachoService } from '../services/despachoService';
import { agruparRutas, REGIONES_AGRUPABLES, codigoRegion } from '../constants/rutasRegiones';

const ROLES_PERMITIDOS = ['despachador', 'conductor', 'vendedor'];
export const STORAGE_KEY_DESPACHO_ACTIVO = 'despachoActivo';

// Lista de rutagramas abiertos en paralelo (antes solo se recordaba uno, y
// arrancar otra ruta pisaba el puntero al anterior aunque siguiera abierto en
// el servidor). Dedupe por rutagramaId: reabrir la misma ruta actualiza su
// entrada en vez de duplicarla.
export async function leerActivos() {
  const str = await AsyncStorage.getItem(STORAGE_KEY_DESPACHO_ACTIVO);
  if (!str) return [];
  const parsed = JSON.parse(str);
  return Array.isArray(parsed) ? parsed : [parsed]; // compat con formato viejo (objeto suelto)
}

export async function agregarActivo(entry) {
  const activos = await leerActivos();
  const nuevos = [...activos.filter(a => a.rutagramaId !== entry.rutagramaId), entry];
  await AsyncStorage.setItem(STORAGE_KEY_DESPACHO_ACTIVO, JSON.stringify(nuevos));
  return nuevos;
}

export async function quitarActivo(rutagramaId) {
  const activos = await leerActivos();
  const nuevos = activos.filter(a => a.rutagramaId !== rutagramaId);
  await AsyncStorage.setItem(STORAGE_KEY_DESPACHO_ACTIVO, JSON.stringify(nuevos));
  return nuevos;
}

export default function DespachoIniciarScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [iniciando, setIniciando] = useState(false);
  const [activos, setActivos] = useState([]); // [{ rutagramaId, rutaCodigo, rutaDesc }]
  const [cargandoActivo, setCargandoActivo] = useState(true);
  const [segmentos, setSegmentos] = useState([]);
  const [cargandoSegmentos, setCargandoSegmentos] = useState(false);
  const [regionAbierta, setRegionAbierta] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) setUserData(JSON.parse(userDataStr));
        setActivos(await leerActivos());
      } catch (e) {
        console.error('Error cargando datos de despacho', e);
      } finally {
        setCargandoActivo(false);
      }
    };
    cargar();
  }, []);

  useEffect(() => {
    if (!userData?.id) return;
    const cargarSegmentos = async () => {
      setCargandoSegmentos(true);
      try {
        const lista = await DespachoService.segmentos(userData.id);
        setSegmentos(lista);
      } catch (e) {
        console.error('Error cargando catálogo de rutas', e);
      } finally {
        setCargandoSegmentos(false);
      }
    };
    cargarSegmentos();
  }, [userData?.id]);

  // Catálogo abierto: cualquier despachador/conductor ve todas las rutas de Profit,
  // no hay asignación fija por usuario.
  const gruposRuta = agruparRutas(segmentos);
  const totalOpciones = gruposRuta.reduce((acc, g) => acc + g.opciones.length, 0);

  const continuarActivo = useCallback((item) => {
    navigation.navigate('DespachoEscanear', {
      rutagramaId: item.rutagramaId,
      usuarioId: userData.id,
      rutaDesc: item.rutaDesc,
    });
  }, [userData, navigation]);

  const descartarActivo = useCallback((rutagramaId) => {
    Alert.alert(
      'Descartar rutagrama',
      'Se va a cancelar este rutagrama y se pierde lo escaneado sin verificar. ¿Seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar', style: 'destructive', onPress: async () => {
            try {
              await DespachoService.cancelar(rutagramaId);
              setActivos(await quitarActivo(rutagramaId));
            } catch (error) {
              // 409: ya tiene paquetes verificados (trabajo real) — no se descarta en
              // servidor, se deja en la lista para que el usuario lo retome o lo cierre
              // con Finalizar.
              const msg = error.data?.error || error.message || 'No se pudo descartar el rutagrama.';
              Alert.alert('No se pudo quitar', msg);
            }
          }
        },
      ]
    );
  }, []);

  const iniciarConCodigo = useCallback(async (rutaCodigo) => {
    if (!userData?.id || !userData?.rol || !ROLES_PERMITIDOS.includes(userData.rol)) {
      Alert.alert('Error', 'No se pudo identificar tu usuario o rol. Vuelve a iniciar sesión.');
      return;
    }
    if (iniciando) return;
    setIniciando(true);
    try {
      const resultado = await DespachoService.iniciar({ usuario_id: userData.id, ruta_codigo: rutaCodigo });
      const nuevoActivo = {
        rutagramaId: resultado.rutagrama_id,
        rutaCodigo: resultado.ruta_codigo,
        rutaDesc: resultado.ruta_desc,
      };
      await agregarActivo(nuevoActivo);
      navigation.navigate('DespachoEscanear', {
        rutagramaId: nuevoActivo.rutagramaId,
        usuarioId: userData.id,
        rutaDesc: nuevoActivo.rutaDesc,
      });
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo iniciar el rutagrama.';
      Alert.alert('Error', msg);
    } finally {
      setIniciando(false);
    }
  }, [userData, iniciando, navigation]);

  if (cargandoActivo) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="small" color={Theme.colors.primary} />
      </View>
    );
  }

  // Diseño "Despacho · Iniciar" del lienzo SyncWareApp: aviso ámbar con los rutagramas
  // abiertos (Cancelar / Retomar), tarjeta "Nuevo rutagrama" con las rutas, y una
  // cuadrícula de accesos (historial, enlaces, recepción, notas C/D, RFID).
  const accesos = [
    { key: 'hist', label: 'Historial', icon: 'time-outline', onPress: () => navigation.navigate('DespachoHistorial') },
    { key: 'enl', label: 'Enlaces', icon: 'swap-horizontal-outline', onPress: () => navigation.navigate('DespachoEnlaces') },
    { key: 'nc', label: 'Notas C/D', icon: 'receipt-outline', onPress: () => navigation.navigate('DespachoNotasCredito') },
    { key: 'rec1', label: 'Recepción BQTO → S/C', icon: 'cube-outline', onPress: () => navigation.navigate('DespachoRecibirEnlace', { rutaCodigo: 'barquisimeto1', rutaDesc: 'BQTO / S/C' }) },
    { key: 'rec2', label: 'Recepción S/C → BQTO', icon: 'cube-outline', onPress: () => navigation.navigate('DespachoRecibirEnlace', { rutaCodigo: 'barquisimeto2', rutaDesc: 'S/C / BQTO' }) },
    { key: 'rfid', label: 'RFID', sub: 'Experimental', icon: 'radio-outline', punteado: true, onPress: () => navigation.navigate('RfidMenu') },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 14 }}>
      {activos.length > 0 && (
        <View style={di.abierto}>
          <Text style={di.abiertoTitulo}>
            {activos.length === 1 ? 'Tienes un rutagrama abierto' : `Tienes ${activos.length} rutagramas abiertos`}
          </Text>
          {activos.map(item => (
            <View key={item.rutagramaId} style={{ gap: 10 }}>
              <Text style={di.abiertoTexto}>
                <Text style={{ fontFamily: Theme.fontMono, fontWeight: '700' }}>RG-{item.rutagramaId}</Text> · {item.rutaDesc}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Boton variante="peligro" titulo="Cancelar" alto={44} style={{ flex: 1, borderRadius: 12 }} textStyle={{ fontSize: 14 }} onPress={() => descartarActivo(item.rutagramaId)} />
                <Boton variante="oscuro" titulo="Retomar" alto={44} style={{ flex: 1, borderRadius: 12 }} textStyle={{ fontSize: 14 }} onPress={() => continuarActivo(item)} />
              </View>
            </View>
          ))}
        </View>
      )}

      <Tarjeta style={{ padding: 16 }}>
        <Text style={di.tituloSeccion}>Nuevo rutagrama</Text>
        <Text style={di.etiqueta}>Ruta / región — toca una para iniciar</Text>
        {cargandoSegmentos ? (
          <ActivityIndicator size="small" color={Theme.colors.primary} />
        ) : totalOpciones === 0 ? (
          <Text style={styles.emptyListText}>No se pudo cargar el catálogo de rutas.</Text>
        ) : (
          gruposRuta.map(grupo => {
            const agrupable = REGIONES_AGRUPABLES.has(grupo.region);
            const abierta = !agrupable && regionAbierta === grupo.region;
            return (
              <View key={grupo.region} style={{ gap: 8 }}>
                <TouchableOpacity
                  style={[di.opcion, abierta && di.opcionActiva]}
                  onPress={() => {
                    if (agrupable) {
                      iniciarConCodigo(codigoRegion(grupo.region));
                    } else {
                      setRegionAbierta(abierta ? null : grupo.region);
                    }
                  }}
                  disabled={iniciando}
                  activeOpacity={0.7}
                >
                  <Text style={[di.opcionTexto, abierta && { color: Theme.colors.primaryDark }]}>{grupo.region}</Text>
                  <Text style={di.opcionConteo}>{grupo.opciones.length} {grupo.opciones.length === 1 ? 'ruta' : 'rutas'}</Text>
                  {agrupable ? (
                    <Ionicons name="arrow-forward" size={18} color={Theme.colors.primaryDark} />
                  ) : (
                    <Ionicons name={abierta ? 'chevron-up' : 'chevron-down'} size={18} color={Theme.colors.muted} />
                  )}
                </TouchableOpacity>
                {abierta && grupo.opciones.map(opcion => (
                  <TouchableOpacity
                    key={opcion.codigo}
                    style={di.subopcion}
                    onPress={() => iniciarConCodigo(opcion.codigo)}
                    disabled={iniciando}
                    activeOpacity={0.8}
                  >
                    <Text style={di.subopcionTexto}>{opcion.label}</Text>
                    <Ionicons name="play-circle-outline" size={20} color={Theme.colors.primaryDark} />
                  </TouchableOpacity>
                ))}
              </View>
            );
          })
        )}
        {iniciando && <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginTop: Theme.spacing.sm }} />}
      </Tarjeta>

      <View style={di.accesos}>
        {accesos.map(a => (
          <TouchableOpacity
            key={a.key}
            style={[di.acceso, a.punteado && { borderStyle: 'dashed', borderColor: Theme.colors.dashed }]}
            onPress={a.onPress}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Ionicons name={a.icon} size={20} color={Theme.colors.dark} />
            <Text style={di.accesoTexto} numberOfLines={2}>{a.label}</Text>
            {a.sub ? <Text style={di.accesoSub}>{a.sub}</Text> : null}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const di = StyleSheet.create({
  abierto: {
    backgroundColor: Theme.colors.warningSoft,
    borderWidth: 1,
    borderColor: Theme.colors.warningEdge,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  abiertoTitulo: { fontSize: 14, fontWeight: '700', color: Theme.colors.warningText },
  abiertoTexto: { fontSize: 13, color: Theme.colors.warningText },
  tituloSeccion: { fontSize: 16, fontWeight: '700', color: Theme.colors.text },
  etiqueta: { fontSize: 12, fontWeight: '600', color: Theme.colors.muted },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
  },
  opcionActiva: { borderWidth: 2, borderColor: Theme.colors.primary, backgroundColor: Theme.colors.primaryLight },
  opcionTexto: { flex: 1, fontSize: 14, fontWeight: '700', color: Theme.colors.text },
  opcionConteo: { fontSize: 12, color: Theme.colors.muted },
  subopcion: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
    marginLeft: 12,
    borderRadius: 12,
    backgroundColor: Theme.colors.background,
  },
  subopcionTexto: { flex: 1, fontSize: 14, color: Theme.colors.text },
  accesos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  acceso: {
    width: '32%',
    minHeight: 76,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 6,
  },
  accesoTexto: { fontSize: 12, fontWeight: '600', color: Theme.colors.text, textAlign: 'center' },
  accesoSub: { fontSize: 10, color: Theme.colors.muted },
});
