import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showMessage } from 'react-native-flash-message';
import { DespachoService } from '../services/despachoService';

// Aviso dentro de la app (sin push) para el vendedor: cuando se cierra un rutagrama con
// pedidos suyos, al abrir la app — y cada INTERVALO_MS mientras está en primer plano — sale
// un aviso por cada rutagrama nuevo, y el tab "Recibir" muestra cuántos le faltan escanear.
// "Nuevo" = rutagrama pendiente que todavía no se le avisó en este teléfono (ids guardados
// en AsyncStorage por usuario). Si la app está cerrada no avisa: lo ve al abrirla.
const INTERVALO_MS = 60000;
const claveAvisados = (usuarioId) => `rutagramas_vendedor_avisados_${usuarioId}`;

export function useAvisoRutagramasVendedor(onAbrir) {
  const [pendientes, setPendientes] = useState(0);
  const usuarioRef = useRef(null);
  const onAbrirRef = useRef(onAbrir);
  onAbrirRef.current = onAbrir;

  const revisar = useCallback(async () => {
    try {
      if (!usuarioRef.current) {
        const str = await AsyncStorage.getItem('userData');
        usuarioRef.current = str ? JSON.parse(str) : null;
      }
      const usuario = usuarioRef.current;
      if (!usuario?.id || usuario.rol !== 'vendedor') return;

      const res = await DespachoService.vendedorRutagramas(usuario.id);
      const items = res?.items || [];
      const sinRecibir = items.filter((i) => !i.completo);
      setPendientes(sinRecibir.length);

      let avisados = [];
      try {
        avisados = JSON.parse((await AsyncStorage.getItem(claveAvisados(usuario.id))) || '[]');
      } catch {
        avisados = [];
      }
      const yaAvisado = new Set(avisados.map(String));
      const nuevos = sinRecibir.filter((i) => !i.iniciado && !yaAvisado.has(String(i.cargado_id)));
      if (!nuevos.length) return;

      const primero = nuevos[0];
      showMessage({
        message: nuevos.length === 1 ? 'Nuevo rutagrama con pedidos tuyos' : `${nuevos.length} rutagramas nuevos con pedidos tuyos`,
        description: nuevos.length === 1
          ? `#${primero.cargado_id} · ${primero.ruta} · ${primero.pedidos} pedido(s). Tocá para escanear lo que recibiste.`
          : 'Tocá para ver la lista y escanear lo que recibiste.',
        type: 'info',
        duration: 8000,
        onPress: () => onAbrirRef.current?.(nuevos.length === 1 ? primero.cargado_id : null),
      });
      // Solo se guardan los que siguen en la ventana del backend, para no crecer sin fin.
      const vigentes = new Set(items.map((i) => String(i.cargado_id)));
      const guardar = [...new Set([...avisados.map(String), ...nuevos.map((i) => String(i.cargado_id))])].filter((x) => vigentes.has(x));
      await AsyncStorage.setItem(claveAvisados(usuario.id), JSON.stringify(guardar));
    } catch (e) {
      // Sin red o backend caído: el aviso se reintenta en el próximo ciclo.
      console.log('useAvisoRutagramasVendedor: no se pudo revisar', e?.message);
    }
  }, []);

  useEffect(() => {
    revisar();
    let timer = setInterval(revisar, INTERVALO_MS);
    const sub = AppState.addEventListener('change', (estado) => {
      clearInterval(timer);
      if (estado === 'active') {
        revisar();
        timer = setInterval(revisar, INTERVALO_MS);
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [revisar]);

  return { pendientes, revisar };
}
