import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Theme from '../constants/Theme';
import { NavHeader } from '../components/AppHeader';

// Pestaña "Más": los módulos que no entran en la barra inferior (máx. 5-6 pestañas para
// que no queden apretadas). Tocar "Más" NO abre una pantalla: el navegador de pestañas
// cancela el tabPress y muestra MasMenu, un menú emergente encima de la barra. Al elegir
// un módulo se navega a la pestaña "Más" directo en esa pantalla:
//   navigation.navigate('<tabs>', { screen: 'Más', params: { screen: item.name } })
// Cada rol arma lo suyo con crearMasNavigator([{ name, label, subtitle, icon, tono, component }]).
// `tono` (verde | azul | ambar) da el color del recuadro del ícono, como en el diseño.
// El header lo pone este stack (la pestaña "Más" va con headerShown: false).

const TONOS = {
  verde: { fondo: Theme.colors.primaryLight, icono: Theme.colors.primaryDark },
  azul: { fondo: Theme.colors.infoSoft, icono: Theme.colors.info },
  ambar: { fondo: Theme.colors.warningSoft, icono: Theme.colors.warningIcon },
};

const Stack = createNativeStackNavigator();

export function crearMasNavigator(items) {
  return function MasNavigator() {
    return (
      <Stack.Navigator screenOptions={{ header: (props) => <NavHeader {...props} /> }}>
        {items.map((item) => (
          <Stack.Screen
            key={item.name}
            name={item.name}
            component={item.component}
            options={{ title: item.label, headerSubtitle: item.headerSubtitle, headerShown: item.headerShown ?? true }}
          />
        ))}
      </Stack.Navigator>
    );
  };
}

// Menú emergente de "Más", anclado abajo a la derecha, justo encima de la barra de
// pestañas (`bottom` = espacio que ocupa la barra). Tocar afuera lo cierra.
export function MasMenu({ visible, items, bottom, onClose, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar menú">
        <View style={[styles.panel, { bottom: bottom + 12 }]} accessibilityRole="menu">
          {items.map((item) => {
            const tono = TONOS[item.tono] || TONOS.verde;
            return (
              <TouchableOpacity
                key={item.name}
                style={styles.fila}
                onPress={() => onSelect(item)}
                activeOpacity={0.7}
                accessibilityRole="menuitem"
              >
                <View style={[styles.icono, { backgroundColor: tono.fondo }]}>
                  <Ionicons name={item.icon} size={20} color={tono.icono} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{item.label}</Text>
                  {item.subtitle ? <Text style={styles.subtitulo}>{item.subtitle}</Text> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,42,58,0.45)' },
  panel: {
    position: 'absolute',
    right: 28,
    width: 236,
    backgroundColor: Theme.colors.surface,
    borderRadius: 18,
    padding: 8,
    gap: 2,
    shadowColor: Theme.colors.dark,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 12,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  icono: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 15, fontWeight: '700', color: Theme.colors.text },
  subtitulo: { fontSize: 12, color: Theme.colors.muted, marginTop: 1 },
});
