import React, { useCallback, useEffect, useState } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, FlatList, Modal } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import RfidLectorInput from '../components/RfidLectorInput';
import styles from '../styles/Rfid.styles';
import Theme from '../constants/Theme';
import { RfidService } from '../services/rfidService';
import { extraerEpcs, decodificarNotaDesdeEpc } from '../utils/rfid';

const normalizarNota = (raw) => String(raw || '').trim();

const AsociacionItem = React.memo(({ item }) => (
  <View style={styles.itemRow}>
    <View style={styles.itemInfo}>
      <Text style={styles.itemNota}>Nota {item.nota}</Text>
      <Text style={styles.itemDetalle}>{item.epc}</Text>
    </View>
  </View>
));

// Lectura de UN tag a la vez (a diferencia de RfidEscanearScreen, que acumula
// varios en modo inventario): asociar por error un lote entero al mismo tag
// sería fácil de hacer sin querer si esta pantalla también acumulara.
export default function RfidAsociarScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [userData, setUserData] = useState(null);
  const [tagsCache, setTagsCache] = useState([]); // [{epc, nota}]
  const [cargandoCache, setCargandoCache] = useState(true);
  const [epcPendiente, setEpcPendiente] = useState(null);
  const [notaValor, setNotaValor] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [hechas, setHechas] = useState([]); // asociaciones confirmadas en esta sesión de trabajo
  const [manualVisible, setManualVisible] = useState(false);
  const [manualValor, setManualValor] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('userData').then((str) => { if (str) setUserData(JSON.parse(str)); });
  }, []);

  const cargarCache = useCallback(async () => {
    setCargandoCache(true);
    try {
      const res = await RfidService.listarTags();
      setTagsCache(res?.items || []);
    } catch (e) {
      console.error('Error cargando mapeo RFID', e);
    } finally {
      setCargandoCache(false);
    }
  }, []);

  useEffect(() => { if (isFocused) cargarCache(); }, [isFocused, cargarCache]);

  // Igual que en Escanear, un solo "Enter" de la pistola puede traer varios
  // EPC pegados (rondas de inventario) — acá solo importa uno por vez, se
  // toma el primero. Si el EPC ya trae el nº de nota codificado (formato de
  // sistema_operaciones), se precarga el campo — el operador solo confirma.
  const onLectura = useCallback((codigoRaw) => {
    const [epc] = extraerEpcs(codigoRaw);
    if (!epc) return;
    setEpcPendiente(epc);
    const notaSugerida = decodificarNotaDesdeEpc(epc);
    if (notaSugerida) setNotaValor(notaSugerida);
  }, []);

  const cancelarPendiente = useCallback(() => {
    setEpcPendiente(null);
    setNotaValor('');
  }, []);

  const confirmarAsociacion = useCallback(async (epc, nota) => {
    setGuardando(true);
    try {
      const res = await RfidService.asociarTag({ usuario_id: userData.id, epc, nota });
      setTagsCache((prev) => [{ epc, nota }, ...prev.filter((t) => t.epc !== epc)]);
      setHechas((prev) => [{ epc, nota }, ...prev]);
      showMessage({
        message: 'Tag asociado',
        description: `${epc} → Nota ${nota}${res?.reasignado ? ` (antes: ${res.nota_anterior})` : ''}`,
        type: 'success',
        duration: 2000,
      });
      setEpcPendiente(null);
      setNotaValor('');
    } catch (error) {
      const msg = error.data?.error || error.message || 'No se pudo asociar el tag.';
      showMessage({ message: 'Error', description: msg, type: 'danger', duration: 2800 });
    } finally {
      setGuardando(false);
    }
  }, [userData]);

  const onAsociar = useCallback(() => {
    const epc = epcPendiente;
    const nota = normalizarNota(notaValor);
    if (!epc || !nota) return;

    const existente = tagsCache.find((t) => t.epc === epc);
    const notaOtroTag = tagsCache.find((t) => t.nota === nota && t.epc !== epc);

    if (existente && existente.nota !== nota) {
      Alert.alert(
        'Tag ya asociado',
        `Este tag ya está ligado a la nota ${existente.nota}. ¿Reasignarlo a la nota ${nota}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Reasignar', onPress: () => confirmarAsociacion(epc, nota) },
        ]
      );
      return;
    }
    if (notaOtroTag) {
      Alert.alert(
        'La nota ya tiene otro tag',
        `La nota ${nota} ya está asociada al tag ${notaOtroTag.epc}. ¿Asociar este tag también a la misma nota?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Asociar igual', onPress: () => confirmarAsociacion(epc, nota) },
        ]
      );
      return;
    }
    confirmarAsociacion(epc, nota);
  }, [epcPendiente, notaValor, tagsCache, confirmarAsociacion]);

  const confirmarManual = useCallback(() => {
    const limpio = String(manualValor || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!limpio) return;
    setManualVisible(false);
    setManualValor('');
    // Rellena a 24 igual que sistema_operaciones al grabar el tag, para poder
    // probar tipeando solo el nº de nota (ej. "471103") sin el EPC completo.
    onLectura(limpio.padStart(24, '0').slice(-24));
  }, [manualValor, onLectura]);

  if (!userData) return null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>
          Poné el switch de la pistola en modo RFID y disparale a un solo tag por vez.
        </Text>

        <RfidLectorInput activo={!epcPendiente} isFocused={isFocused} onLectura={onLectura} />

        <TouchableOpacity style={styles.secondaryButton} onPress={() => setManualVisible(true)} activeOpacity={0.85}>
          <Text style={styles.secondaryButtonText}>Escribir EPC manualmente</Text>
        </TouchableOpacity>

        {epcPendiente && (
          <View style={styles.card}>
            <Text style={styles.label}>Tag leído</Text>
            <Text style={styles.itemNota}>{epcPendiente}</Text>
            <Text style={styles.label}>Nº de nota</Text>
            <TextInput
              style={styles.input}
              value={notaValor}
              onChangeText={setNotaValor}
              keyboardType="number-pad"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.primaryButton, (!notaValor || guardando) && styles.buttonDisabled]}
              onPress={onAsociar}
              disabled={!notaValor || guardando}
              activeOpacity={0.85}
            >
              {guardando ? <ActivityIndicator size="small" color={Theme.colors.white} /> : <Text style={styles.primaryButtonText}>Asociar</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={cancelarPendiente} disabled={guardando} activeOpacity={0.85}>
              <Text style={styles.secondaryButtonText}>Descartar y leer otro</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.listaTitulo}>Asociadas en esta sesión ({hechas.length})</Text>
        {cargandoCache && hechas.length === 0 ? (
          <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginVertical: 20 }} />
        ) : hechas.length === 0 ? (
          <Text style={styles.emptyListText}>Todavía no asociaste ningún tag.</Text>
        ) : (
          <FlatList
            data={hechas}
            keyExtractor={(item, idx) => `${item.epc}-${idx}`}
            renderItem={({ item }) => <AsociacionItem item={item} />}
            scrollEnabled={false}
          />
        )}

        <Modal visible={manualVisible} transparent animationType="fade" onRequestClose={() => setManualVisible(false)}>
          <View style={styles.modalBackground}>
            <View style={styles.card}>
              <Text style={styles.listaTitulo}>Escribir EPC</Text>
              <Text style={styles.label}>EPC del tag</Text>
              <TextInput
                style={styles.input}
                value={manualValor}
                onChangeText={setManualValor}
                autoCapitalize="characters"
                autoFocus
              />
              <TouchableOpacity style={styles.primaryButton} onPress={confirmarManual} activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Usar este EPC</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setManualVisible(false)} activeOpacity={0.85}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}
