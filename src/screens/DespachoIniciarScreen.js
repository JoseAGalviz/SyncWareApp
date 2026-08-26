import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
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

  const descartarActivo = useCallback(async (rutagramaId) => {
    setActivos(await quitarActivo(rutagramaId));
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Despacho de rutas</Text>

      {activos.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.listaTitulo}>
            {activos.length === 1 ? 'Ya tenés una ruta abierta' : `Tenés ${activos.length} rutas abiertas`}
          </Text>
          {activos.map(item => (
            <View key={item.rutagramaId} style={{ marginTop: Theme.spacing.sm }}>
              <Text style={styles.subtitle}>{item.rutaDesc}</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => continuarActivo(item)} activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Continuar despacho</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => descartarActivo(item.rutagramaId)} activeOpacity={0.85}>
                <Text style={styles.secondaryButtonText}>Quitar de la lista</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.subtitle}>Elegí la ruta que vas a despachar.</Text>
      <View style={styles.card}>
            {cargandoSegmentos ? (
              <ActivityIndicator size="small" color={Theme.colors.primary} />
            ) : totalOpciones === 0 ? (
              <Text style={styles.emptyListText}>No se pudo cargar el catálogo de rutas.</Text>
            ) : (
              gruposRuta.map(grupo => {
                const agrupable = REGIONES_AGRUPABLES.has(grupo.region);
                const abierta = !agrupable && regionAbierta === grupo.region;
                return (
                  <View key={grupo.region}>
                    <TouchableOpacity
                      style={styles.regionHeader}
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
                      <Text style={styles.listaTitulo}>{grupo.region} ({grupo.opciones.length})</Text>
                      {!agrupable && (
                        <Ionicons name={abierta ? 'chevron-up' : 'chevron-down'} size={18} color={Theme.colors.text} />
                      )}
                    </TouchableOpacity>
                    {abierta && grupo.opciones.map(opcion => (
                      <TouchableOpacity
                        key={opcion.codigo}
                        style={styles.rutaOption}
                        onPress={() => iniciarConCodigo(opcion.codigo)}
                        disabled={iniciando}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.rutaOptionText}>{opcion.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })
            )}
        {iniciando && <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginTop: Theme.spacing.sm }} />}
      </View>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('DespachoNotasCredito')}
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryButtonText}>Notas de Crédito / Débito</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('DespachoHistorial')}
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryButtonText}>Historial de rutagramas</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('DespachoRecibirEnlace', { rutaCodigo: 'barquisimeto1', rutaDesc: 'BQTO / S/C' })}
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryButtonText}>Recepción de enlace (BQTO / S/C)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('DespachoRecibirEnlace', { rutaCodigo: 'barquisimeto2', rutaDesc: 'S/C / BQTO' })}
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryButtonText}>Recepción de enlace (S/C / BQTO)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
