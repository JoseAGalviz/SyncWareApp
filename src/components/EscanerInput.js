import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { CameraView } from 'expo-camera';
import styles from '../styles/Despacho.styles';
import { MODO_CAMARA, MODO_BLUETOOTH } from '../hooks/useModoEscaneo';

// Área de captura de código: cámara del teléfono o lector de dedo bluetooth
// (modo HID — se empareja como teclado y tipea código + Enter, sin librería
// nativa). El toggle decide cuál usar; onScan siempre recibe el código como
// string, sea cual sea el modo, para que la pantalla que lo usa no distinga.
export default function EscanerInput({ modo, setModo, isFocused, disabled, onScan }) {
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

  // Sin modo elegido todavía: solo los dos botones, sin cuadro de cámara ni
  // input de lector debajo — recién aparecen al tocar uno de los dos.
  return (
    <View>
      <View style={styles.modoRow}>
        <ChipModo activo={modo === MODO_CAMARA} label="Cámara" onPress={() => setModo(MODO_CAMARA)} />
        <ChipModo activo={modo === MODO_BLUETOOTH} label="Lector bluetooth" onPress={() => setModo(MODO_BLUETOOTH)} />
      </View>

      {modo === MODO_CAMARA && (
        <View style={styles.cameraContainer}>
          {isFocused ? (
            <CameraView
              onBarcodeScanned={disabled ? undefined : ({ data }) => onScan(data)}
              style={styles.cameraBox}
              facing="back"
            />
          ) : null}
        </View>
      )}

      {modo === MODO_BLUETOOTH && (
        <View style={styles.cameraContainer}>
          <TouchableOpacity style={[styles.cameraBox, styles.bluetoothBox]} activeOpacity={1} onPress={enfocar}>
            <Text style={styles.bluetoothHint}>
              {disabled ? 'Procesando…' : 'Lector bluetooth listo — escaneá la caja/factura'}
            </Text>
            <TextInput
              ref={inputRef}
              value={buffer}
              onChangeText={setBuffer}
              onSubmitEditing={confirmarLectura}
              blurOnSubmit={false}
              showSoftInputOnFocus={false}
              autoCapitalize="characters"
              style={styles.bluetoothInput}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const ChipModo = ({ activo, label, onPress }) => (
  <TouchableOpacity style={[styles.modoChip, activo && styles.modoChipActive]} onPress={onPress} activeOpacity={0.7}>
    <Text style={[styles.modoChipText, activo && styles.modoChipTextActive]}>{label}</Text>
  </TouchableOpacity>
);
