import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import Theme from '../constants/Theme';
import { MODO_CAMARA, MODO_BLUETOOTH } from '../hooks/useModoEscaneo';
import { Segmentado } from './ui';

// Área de captura de código: cámara del teléfono o lector de dedo bluetooth
// (modo HID — se empareja como teclado y tipea código + Enter, sin librería
// nativa). El toggle decide cuál usar; onScan siempre recibe el código como
// string, sea cual sea el modo, para que la pantalla que lo usa no distinga.
// Diseño "SyncWareApp": selector segmentado, cámara en caja oscura con marco verde y
// el lector bluetooth como zona de borde verde punteado.
// `hint`: texto de la zona del lector (por defecto "Nota (caja) o factura, en cualquier orden").
// `hintCamara`: texto bajo el marco de la cámara.
const C = Theme.colors;

export default function EscanerInput({ modo, setModo, isFocused, disabled, onScan, hint, hintCamara }) {
  const inputRef = useRef(null);
  const [buffer, setBuffer] = useState('');

  const enfocar = useCallback(() => {
    if (modo === MODO_BLUETOOTH && !disabled) inputRef.current?.focus();
  }, [modo, disabled]);

  // Mantiene el input siempre enfocado en modo bluetooth mientras la pantalla
  // esté activa: si se pierde foco (ej. tras un submit) el lector siguiente
  // no tendría dónde escribir.
  useEffect(() => {
    if (modo !== MODO_BLUETOOTH || !isFocused || disabled) return;
    const id = setTimeout(enfocar, 50);
    return () => clearTimeout(id);
  }, [modo, isFocused, disabled, enfocar]);

  const confirmarLectura = useCallback(() => {
    const codigo = buffer.trim();
    setBuffer('');
    if (codigo) onScan(codigo);
  }, [buffer, onScan]);

  // Sin modo elegido todavía: solo el selector, sin cuadro de cámara ni
  // input de lector debajo — recién aparecen al tocar uno de los dos.
  return (
    <View style={{ gap: 12 }}>
      <Segmentado
        opciones={[
          { value: MODO_CAMARA, label: 'Cámara' },
          { value: MODO_BLUETOOTH, label: 'Lector bluetooth' },
        ]}
        valor={modo}
        onChange={setModo}
      />

      {modo === MODO_CAMARA && (
        <View style={st.camara}>
          {isFocused ? (
            <CameraView
              onBarcodeScanned={disabled ? undefined : ({ data }) => onScan(data)}
              style={StyleSheet.absoluteFill}
              facing="back"
            />
          ) : null}
          <View pointerEvents="none" style={st.marco}>
            <View style={st.laser} />
          </View>
          <Text pointerEvents="none" style={st.camaraHint}>
            {disabled ? 'Procesando…' : hintCamara || 'Apunta al código de barras'}
          </Text>
        </View>
      )}

      {modo === MODO_BLUETOOTH && (
        <TouchableOpacity style={st.zona} activeOpacity={1} onPress={enfocar}>
          <Ionicons name="barcode-outline" size={28} color={C.primaryDark} />
          <View style={{ flex: 1 }}>
            <Text style={st.zonaTitulo}>{disabled ? 'Procesando…' : 'Listo para escanear'}</Text>
            <Text style={st.zonaSub}>{hint || 'Nota (caja) o factura, en cualquier orden'}</Text>
          </View>
          <TextInput
            ref={inputRef}
            value={buffer}
            onChangeText={setBuffer}
            onSubmitEditing={confirmarLectura}
            blurOnSubmit={false}
            showSoftInputOnFocus={false}
            autoCapitalize="characters"
            style={st.inputOculto}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  camara: {
    height: 168,
    borderRadius: 18,
    backgroundColor: C.text,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marco: {
    width: 240,
    height: 88,
    borderWidth: 3,
    borderColor: C.primary,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  laser: { height: 2, backgroundColor: C.error },
  camaraHint: { position: 'absolute', bottom: 10, fontSize: 12, color: C.onDarkSoft },
  zona: {
    flexDirection: 'row', alignItems: 'center', gap: 12, height: 72,
    borderWidth: 2, borderStyle: 'dashed', borderColor: C.primary,
    backgroundColor: C.primaryLight, borderRadius: 16, paddingHorizontal: 16,
  },
  zonaTitulo: { fontSize: 15, fontWeight: '700', color: C.primaryDark },
  zonaSub: { fontSize: 12, color: '#2E5B4A', marginTop: 1 },
  // El lector tipea acá; queda invisible (1 px) pero enfocable.
  inputOculto: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
