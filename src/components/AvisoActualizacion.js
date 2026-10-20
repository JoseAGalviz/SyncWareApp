import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, View, Text, StyleSheet } from 'react-native';
import * as Updates from 'expo-updates';
import Theme from '../constants/Theme';
import { Boton, IconoCaja } from './ui';

// Actualizaciones OTA (EAS Update): cuando se publica una versión nueva del código JS
// (`eas update --channel production`), la app la detecta al abrirse o al volver a primer
// plano y muestra este aviso. "Actualizar ahora" descarga y reinicia la app en segundos;
// "Más tarde" lo pospone hasta la próxima vez que se abra la app.
//
// Solo llega a APKs con el mismo runtimeVersion (app.json: policy "appVersion" = "version").
// Cambios nativos (librería nativa nueva, permisos, SDK) requieren subir "version" y una APK.
// En desarrollo / Expo Go (Updates.isEnabled = false) no hace nada.
const C = Theme.colors;
const INTERVALO_MIN_MS = 15 * 60 * 1000; // no consultar más de una vez cada 15 min

export default function AvisoActualizacion() {
  const [visible, setVisible] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [error, setError] = useState('');
  const ultimaConsulta = useRef(0);
  const pospuesta = useRef(false);

  const revisar = useCallback(async () => {
    if (__DEV__ || !Updates.isEnabled || pospuesta.current) return;
    const ahora = Date.now();
    if (ahora - ultimaConsulta.current < INTERVALO_MIN_MS) return;
    ultimaConsulta.current = ahora;
    try {
      const { isAvailable } = await Updates.checkForUpdateAsync();
      if (isAvailable) setVisible(true);
    } catch (e) {
      // Sin red o servidor de updates caído: se reintenta en la próxima consulta.
      console.log('AvisoActualizacion: no se pudo consultar', e?.message);
    }
  }, []);

  useEffect(() => {
    revisar();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') revisar();
    });
    return () => sub.remove();
  }, [revisar]);

  const actualizar = useCallback(async () => {
    setAplicando(true);
    setError('');
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (e) {
      setAplicando(false);
      setError('No se pudo descargar la actualización. Revisa la conexión e inténtalo de nuevo.');
    }
  }, []);

  const despues = useCallback(() => {
    pospuesta.current = true; // vuelve a ofrecerla al reabrir la app
    setVisible(false);
  }, []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={aplicando ? undefined : despues}>
      <View style={st.fondo}>
        <View style={st.tarjeta} accessibilityRole="alert">
          <IconoCaja name="cloud-download-outline" tono="verde" tam={56} />
          <Text style={st.titulo}>Actualización disponible</Text>
          <Text style={st.texto}>
            Hay una nueva versión de SyncWare con mejoras y correcciones. Se instala en unos segundos y la app se reinicia.
          </Text>
          {error ? <Text style={st.error}>{error}</Text> : null}
          <View style={{ alignSelf: 'stretch', gap: 8 }}>
            <Boton titulo={aplicando ? 'Actualizando…' : 'Actualizar ahora'} icon="download-outline" cargando={aplicando} onPress={actualizar} />
            <Boton variante="secundario" titulo="Más tarde" alto={48} disabled={aplicando} onPress={despues} textStyle={{ fontSize: 15 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(15,42,58,0.55)', justifyContent: 'center', padding: 24 },
  tarjeta: {
    backgroundColor: C.surface, borderRadius: 24, padding: 24, alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 40, elevation: 12,
  },
  titulo: { fontSize: 20, fontWeight: '800', color: C.text, textAlign: 'center' },
  texto: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20 },
  error: { fontSize: 13, color: C.errorText, textAlign: 'center' },
});
