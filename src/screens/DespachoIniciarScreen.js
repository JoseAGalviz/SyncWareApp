import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../styles/Despacho.styles';
import Theme from '../constants/Theme';
import { DespachoService } from '../services/despachoService';

const ROLES_PERMITIDOS = ['despachador', 'conductor'];
export const STORAGE_KEY_DESPACHO_ACTIVO = 'despachoActivo';

const RUTAS_CRUZADAS = [
  { codigo: 'barquisimeto1', label: 'ENVIOS BARQUISIMETO (BQTO → S/C)' },
  { codigo: 'barquisimeto2', label: 'ENVIOS S/C (S/C → BQTO)' },
];

export default function DespachoIniciarScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [rutaSeleccionada, setRutaSeleccionada] = useState(null);
  const [iniciando, setIniciando] = useState(false);
  const [activo, setActivo] = useState(null); // { rutagramaId, rutaCodigo, rutaDesc } | null
  const [cargandoActivo, setCargandoActivo] = useState(true);
  const [segmentos, setSegmentos] = useState([]);
  const [cargandoSegmentos, setCargandoSegmentos] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) setUserData(JSON.parse(userDataStr));

        const activoStr = await AsyncStorage.getItem(STORAGE_KEY_DESPACHO_ACTIVO);
        if (activoStr) setActivo(JSON.parse(activoStr));
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
  const opcionesRuta = [
    ...segmentos.map(s => ({ codigo: s.codigo, label: `${s.codigo} - ${s.descripcion}` })),
    ...RUTAS_CRUZADAS,
  ];

  const continuarActivo = useCallback(() => {
    navigation.navigate('DespachoEscanear', {
      rutagramaId: activo.rutagramaId,
      usuarioId: userData.id,
      rutaDesc: activo.rutaDesc,
    });
  }, [activo, userData, navigation]);

  const descartarActivo = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY_DESPACHO_ACTIVO);
    setActivo(null);
  }, []);

  const iniciar = useCallback(async () => {
    if (!userData?.id || !userData?.rol || !ROLES_PERMITIDOS.includes(userData.rol)) {
      Alert.alert('Error', 'No se pudo identificar tu usuario o rol. Vuelve a iniciar sesión.');
      return;
    }
    if (!rutaSeleccionada) {
      Alert.alert('Falta seleccionar ruta', 'Elegí la ruta que vas a despachar.');
      return;
    }
    setIniciando(true);
    try {
      const resultado = await DespachoService.iniciar({ usuario_id: userData.id, ruta_codigo: rutaSeleccionada });
      const nuevoActivo = {
        rutagramaId: resultado.rutagrama_id,
        rutaCodigo: resultado.ruta_codigo,
        rutaDesc: resultado.ruta_desc,
      };
      await AsyncStorage.setItem(STORAGE_KEY_DESPACHO_ACTIVO, JSON.stringify(nuevoActivo));
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
  }, [userData, rutaSeleccionada, navigation]);

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

      {activo ? (
        <View style={styles.card}>
          <Text style={styles.listaTitulo}>Ya tenés una ruta abierta</Text>
          <Text style={styles.subtitle}>{activo.rutaDesc}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={continuarActivo} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Continuar despacho</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={descartarActivo} activeOpacity={0.85}>
            <Text style={styles.secondaryButtonText}>Elegir otra ruta</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.subtitle}>Elegí la ruta que vas a despachar.</Text>
          <View style={styles.card}>
            {cargandoSegmentos ? (
              <ActivityIndicator size="small" color={Theme.colors.primary} />
            ) : opcionesRuta.length === 0 ? (
              <Text style={styles.emptyListText}>No se pudo cargar el catálogo de rutas.</Text>
            ) : (
              opcionesRuta.map(opcion => (
                <TouchableOpacity
                  key={opcion.codigo}
                  style={[styles.rutaOption, rutaSeleccionada === opcion.codigo && styles.rutaOptionSelected]}
                  onPress={() => setRutaSeleccionada(opcion.codigo)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.rutaOptionText}>{opcion.label}</Text>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity
              style={[styles.primaryButton, (!rutaSeleccionada || iniciando) && styles.buttonDisabled]}
              onPress={iniciar}
              disabled={!rutaSeleccionada || iniciando}
              activeOpacity={0.85}
            >
              {iniciando ? (
                <ActivityIndicator size="small" color={Theme.colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Iniciar ruta</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('DespachoNotasCredito')}
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryButtonText}>Notas de Crédito / Débito</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
