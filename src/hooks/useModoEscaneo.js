import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'despacho_modo_escaneo';
export const MODO_CAMARA = 'camara';
export const MODO_BLUETOOTH = 'bluetooth';

// Elección de modo de escaneo (cámara del teléfono vs. lector de dedo bluetooth)
// persiste en AsyncStorage y se comparte entre DespachoEscanear y DespachoVerificar —
// el operador la elige una vez y ambas pantallas la respetan. Sin elección todavía
// (primer uso, o AsyncStorage vacío) modo queda null: la pantalla no arranca ni la
// cámara ni el lector hasta que el operador toca uno de los dos botones.
export function useModoEscaneo() {
  const [modo, setModoState] = useState(null);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((valor) => {
      if (valor === MODO_BLUETOOTH || valor === MODO_CAMARA) setModoState(valor);
      setCargado(true);
    });
  }, []);

  const setModo = useCallback((nuevo) => {
    setModoState(nuevo);
    AsyncStorage.setItem(STORAGE_KEY, nuevo);
  }, []);

  return { modo, setModo, cargado };
}
