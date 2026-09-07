import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, FlatList, Modal } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { useModoEscaneo, MODO_CAMARA } from '../hooks/useModoEscaneo';
import { useCameraPermissions } from 'expo-camera';
import EscanerInput from '../components/EscanerInput';
import styles from '../styles/Despacho.styles';
import Theme from '../constants/Theme';
import { DespachoService } from '../services/despachoService';

// Módulo independiente de Notas de Crédito / Débito: sin ruta, sin rutagrama.
// Se escanea la nota y se guarda, una tras otra. La lista es el registro.

const limpiar = (raw) => String(raw || '').trim().replace(/\s+/g, '').toUpperCase();
const FORMATO_VALIDO = /^([AB]\d{7}|\d{1,10})$/i;

const NotaItem = React.memo(({ item, onQuitar }) => (
  <View style={styles.itemRow}>
    <View style={styles.itemInfo}>
      <Text style={styles.itemNota}>{item.nro_doc} · {item.tipo}</Text>
      <Text style={styles.itemDetalle}>{item.cliente || 'Sin nombre'}</Text>
      <Text style={styles.itemDetalle}>
        Fact. afectada: {item.nro_orig || '—'}
        {item.fecha_escaneo ? ` · ${new Date(item.fecha_escaneo).toLocaleString('es-VE')}` : ''}
      </Text>
    </View>
    <TouchableOpacity style={styles.itemAccion} onPress={() => onQuitar(item.id)}>
      <Text style={{ color: Theme.colors.error, fontWeight: '700' }}>Quitar</Text>
    </TouchableOpacity>
  </View>
));

export default function DespachoNotasCreditoScreen({ navigation }) {
  const isFocused = useIsFocused();
  const { modo, setModo, cargado } = useModoEscaneo();
  const [permission, requestPermission] = useCameraPermissions();

  const [userData, setUserData] = useState(null);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [scanned, setScanned] = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualValor, setManualValor] = useState('');
  const [procesandoManual, setProcesandoManual] = useState(false);
  const ultimoEscaneoRef = useRef({ codigo: '', ts: 0 });

  useEffect(() => {
    AsyncStorage.getItem('userData').then((str) => { if (str) setUserData(JSON.parse(str)); });
  }, []);

  const cargar = useCallback(async () => {
    if (!userData?.id) return;
    setCargando(true);
    try {
      const res = await DespachoService.ncLista(userData.id);
      setItems(res?.items || []);
    } catch (e) {
      console.error('Error cargando notas C/D', e);
    } finally {
      setCargando(false);
    }
  }, [userData]);

  useEffect(() => { if (isFocused) cargar(); }, [isFocused, cargar]);

  const registrar = useCallback(async (codigoRaw) => {
    const codigo = limpiar(codigoRaw);
    if (!codigo) return;
    try {
      const res = await DespachoService.ncEscanear({ usuario_id: userData.id, codigo });
      if (res?.fila) setItems((prev) => [res.fila, ...prev.filter((x) => x.id !== res.fila.id)]);
      showMessage({
        message: `${res?.fila?.tipo || 'Nota'} registrada`,
        description: `${res?.fila?.nro_doc || codigo} · ${res?.fila?.cliente || ''}`.trim(),
        type: 'success',
        duration: 1600,
      });
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo registrar la nota.';
      if (/se está procesando/i.test(msg)) return;
      showMessage({ message: 'Error', description: `${codigo}: ${msg}`, type: 'danger', duration: 2800 });
    }
  }, [userData]);

  const COOLDOWN_MS = 1500;
  const handleEscaneo = useCallback((dataRaw) => {
    if (scanned) return;
    const codigo = limpiar(dataRaw);
    if (!codigo || !FORMATO_VALIDO.test(codigo)) return;
    const ahora = Date.now();
    if (codigo === ultimoEscaneoRef.current.codigo && ahora - ultimoEscaneoRef.current.ts < COOLDOWN_MS) return;
    ultimoEscaneoRef.current = { codigo, ts: ahora };
    setScanned(true);
    registrar(codigo).finally(() => setScanned(false));
  }, [scanned, registrar]);

  const confirmarManual = useCallback(async () => {
    const valor = limpiar(manualValor);
    if (!valor) return;
    if (!FORMATO_VALIDO.test(valor)) {
      showMessage({ message: 'Formato no reconocido', description: 'Hasta 10 dígitos, con o sin letra al inicio.', type: 'warning', duration: 2800 });
      return;
    }
    setProcesandoManual(true);
    await registrar(valor);
    setProcesandoManual(false);
    setManualVisible(false);
    setManualValor('');
  }, [manualValor, registrar]);

  const quitar = useCallback((ncId) => {
    Alert.alert('Quitar nota', '¿Quitar esta nota del registro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar', style: 'destructive', onPress: async () => {
          try {
            await DespachoService.ncEliminar(userData.id, ncId);
            setItems((prev) => prev.filter((x) => x.id !== ncId));
          } catch (error) {
            Alert.alert('Error', error.data?.error || error.message || 'No se pudo quitar.');
          }
        },
      },
    ]);
  }, [userData]);

  if (!cargado) return null;
  if (modo === MODO_CAMARA) {
    if (!permission) return <Text>Solicitando permiso de cámara...</Text>;
    if (!permission.granted) {
      return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
          <Text style={styles.subtitle}>No se concedió acceso a la cámara.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Permitir cámara</Text>
          </TouchableOpacity>
        </View>
      );
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.sm }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: Theme.spacing.sm }}>
            <Ionicons name="arrow-back" size={22} color={Theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Notas de Crédito / Débito</Text>
        </View>
        <Text style={styles.subtitle}>Escaneá la nota y se guarda. Sin ruta.</Text>

        <View style={styles.countersRow}>
          <View style={styles.counterPill}>
            <Text style={styles.counterLabel}>Registradas</Text>
            <Text style={styles.counterValue}>{items.length}</Text>
          </View>
        </View>

        <EscanerInput modo={modo} setModo={setModo} isFocused={isFocused} disabled={scanned} onScan={handleEscaneo} />

        <TouchableOpacity style={styles.secondaryButton} onPress={() => setManualVisible(true)} activeOpacity={0.85}>
          <Text style={styles.secondaryButtonText}>Escribir número manualmente</Text>
        </TouchableOpacity>

        <Text style={styles.listaTitulo}>Registradas ({items.length})</Text>
        {cargando ? (
          <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginVertical: 20 }} />
        ) : items.length === 0 ? (
          <Text style={styles.emptyListText}>Todavía no registraste ninguna nota.</Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <NotaItem item={item} onQuitar={quitar} />}
            scrollEnabled={false}
          />
        )}

        <Modal visible={manualVisible} transparent animationType="fade" onRequestClose={() => setManualVisible(false)}>
          <View style={styles.modalBackground}>
            <View style={styles.card}>
              <Text style={styles.listaTitulo}>Escribir nota C/D</Text>
              <Text style={styles.label}>Nº nota</Text>
              <TextInput
                style={styles.input}
                value={manualValor}
                onChangeText={setManualValor}
                autoCapitalize="characters"
                keyboardType="number-pad"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.primaryButton, procesandoManual && styles.buttonDisabled]}
                onPress={confirmarManual}
                disabled={procesandoManual}
                activeOpacity={0.85}
              >
                {procesandoManual ? <ActivityIndicator size="small" color={Theme.colors.white} /> : <Text style={styles.primaryButtonText}>Registrar</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setManualVisible(false)} disabled={procesandoManual} activeOpacity={0.85}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}
