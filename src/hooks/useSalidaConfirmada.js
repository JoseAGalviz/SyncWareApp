import { useEffect } from 'react';
import { Alert } from 'react-native';

// Confirma antes de abandonar (atrás/gesto) una pantalla de rutagrama activo.
// No bloquea navegación hacia adelante (Continuar/Finalizar) — beforeRemove
// solo dispara en GO_BACK real del stack nativo.
export function useSalidaConfirmada(navigation, mensaje = '¿Seguro que quieres salir? La ruta sigue activa.') {
  useEffect(() => {
    const listener = (e) => {
      e.preventDefault();
      Alert.alert('Salir del rutagrama', mensaje, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    };
    navigation.addListener('beforeRemove', listener);
    return () => navigation.removeListener('beforeRemove', listener);
  }, [navigation, mensaje]);
}
