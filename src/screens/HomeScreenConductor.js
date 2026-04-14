import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../constants/Colors';
import styles from '../styles/HomeScreenConductor.styles';


export default function HomeScreenConductor() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const data = await AsyncStorage.getItem('userData');
      if (data) setUser(JSON.parse(data));
    };
    loadUser();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aplicación de Guías de Carga</Text>
      {user ? (
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.nombre ? user.nombre.charAt(0).toUpperCase() : "?"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{user.nombre}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Rol:</Text>
            <Text style={styles.value}>{user.rol}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.loading}>Cargando datos del usuario...</Text>
      )}
    </View>
  );
}
