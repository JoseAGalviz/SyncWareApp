import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import styles from '../styles/Rfid.styles';

// Captura de lecturas de la pistola Chainway SR160 en modo RFID: el SR160 no
// tiene SDK, se empareja como teclado Bluetooth (HID) y tipea el EPC de cada
// tag directo donde esté el cursor, seguido de Enter — igual mecanismo que
// EscanerInput.js (MODO_BLUETOOTH) para el lector de dedo, sin el toggle de
// cámara que acá no aplica. Dispara onLectura(codigo) en cada Enter, SIN
// esperar a que el caller termine de procesar la lectura anterior — en modo
// inventario (gatillo sostenido) pueden llegar varias lecturas en ráfaga y no
// hay que perderlas por estar bloqueadas detrás de una request de red.
//
// Input SIN controlar (sin `value`/onChangeText manejando estado de React):
// en modo inventario, dos lecturas pueden llegar tan seguidas que el próximo
// tag empieza a tipear en el campo nativo ANTES de que React vuelva a
// renderizar con el `value` vacío — el round-trip del estado controlado es
// demasiado lento y los dígitos del segundo tag quedan pegados a los del
// primero (visto en prueba real: un renglón con dos EPC concatenados). Con
// `inputRef.current.clear()` la limpieza es un comando nativo inmediato, sin
// esperar un ciclo de render.
export default function RfidLectorInput({ activo, isFocused, onLectura }) {
  const inputRef = useRef(null);

  const enfocar = useCallback(() => {
    if (activo) inputRef.current?.focus();
  }, [activo]);

  useEffect(() => {
    if (!activo || !isFocused) return;
    const id = setTimeout(enfocar, 50);
    return () => clearTimeout(id);
  }, [activo, isFocused, enfocar]);

  const confirmarLectura = useCallback((e) => {
    const codigo = String(e?.nativeEvent?.text || '').trim();
    inputRef.current?.clear();
    if (codigo) onLectura(codigo);
  }, [onLectura]);

  return (
    <TouchableOpacity
      style={[styles.lectorBox, !activo && styles.lectorBoxInactivo]}
      activeOpacity={1}
      onPress={enfocar}
      disabled={!activo}
    >
      <Text style={styles.lectorHint}>
        {activo ? 'Pistola lista — acercá y disparo sobre las etiquetas' : 'Lectura detenida'}
      </Text>
      {activo && (
        <TextInput
          ref={inputRef}
          defaultValue=""
          onSubmitEditing={confirmarLectura}
          blurOnSubmit={false}
          showSoftInputOnFocus={false}
          autoCapitalize="characters"
          style={styles.lectorInput}
        />
      )}
    </TouchableOpacity>
  );
}
