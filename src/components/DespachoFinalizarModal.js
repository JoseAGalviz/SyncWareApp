import React, { useState, useCallback } from 'react';
import { Text, View, TextInput, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import styles from '../styles/Despacho.styles';
import Theme from '../constants/Theme';

export default function DespachoFinalizarModal({ visible, onCancelar, onConfirmar, guardando }) {
  const [chofer, setChofer] = useState('');
  const [carro, setCarro] = useState('');
  const [ayudantes, setAyudantes] = useState('');
  const [responsable, setResponsable] = useState('');

  const valido = chofer.trim() && carro.trim() && responsable.trim();

  const confirmar = useCallback(() => {
    if (!valido) return;
    const ayudantesLista = ayudantes.trim() ? ayudantes.trim().split('.').map(a => a.trim()).filter(Boolean) : [];
    onConfirmar({ chofer: chofer.trim(), carro: carro.trim(), ayudantes: ayudantesLista, responsable: responsable.trim() });
  }, [chofer, carro, ayudantes, responsable, valido, onConfirmar]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancelar}>
      <View style={styles.modalBackground}>
        <View style={styles.modalCard}>
          <Text style={styles.listaTitulo}>Finalizar y cerrar ruta</Text>

          <Text style={styles.label}>Responsable de la ruta *</Text>
          <TextInput style={styles.input} value={responsable} onChangeText={setResponsable} autoCapitalize="words" />

          <Text style={styles.label}>Nombre del conductor *</Text>
          <TextInput style={styles.input} value={chofer} onChangeText={setChofer} autoCapitalize="words" />

          <Text style={styles.label}>Credenciales del vehículo *</Text>
          <TextInput style={styles.input} value={carro} onChangeText={setCarro} autoCapitalize="characters" />

          <Text style={styles.label}>Asistentes (números separados por punto, ej: 10.15.22)</Text>
          <TextInput style={styles.input} value={ayudantes} onChangeText={setAyudantes} keyboardType="default" />

          <TouchableOpacity
            style={[styles.dangerButton, (!valido || guardando) && styles.buttonDisabled]}
            onPress={confirmar}
            disabled={!valido || guardando}
            activeOpacity={0.85}
          >
            {guardando ? <ActivityIndicator size="small" color={Theme.colors.white} /> : <Text style={styles.dangerButtonText}>Confirmar y cerrar ruta</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onCancelar} disabled={guardando} activeOpacity={0.85}>
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
