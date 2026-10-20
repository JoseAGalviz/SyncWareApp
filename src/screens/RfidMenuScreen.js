import React from 'react';
import { Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/Rfid.styles';
import Theme from '../constants/Theme';

// Landing del módulo experimental RFID (pistola Chainway SR160). Separado a
// propósito del flujo real de Despacho — ver STATUS.md.
export default function RfidMenuScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.bannerExperimental}>
          <Text style={styles.bannerExperimentalTexto}>
            Módulo de prueba con la pistola Chainway SR160. No reemplaza el escaneo real de
            Despacho — es para validar la tecnología RFID sobre el lote de notas ya etiquetado.
          </Text>
        </View>

        <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate('RfidAsociar')} activeOpacity={0.85}>
          <Text style={styles.menuButtonTitulo}>Asociar tags a notas</Text>
          <Text style={styles.menuButtonDetalle}>Leer un tag con la pistola y ligarlo al número de nota.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate('RfidEscanear')} activeOpacity={0.85}>
          <Text style={styles.menuButtonTitulo}>Escanear (inventario)</Text>
          <Text style={styles.menuButtonDetalle}>Lectura continua: sostené el gatillo y acumulá todas las notas en rango.</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
