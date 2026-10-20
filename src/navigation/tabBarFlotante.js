import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Theme from '../constants/Theme';

// Barra inferior flotante (diseño "SyncWareApp", 2026-10-20): barra azul noche separada de
// los bordes, ícono + nombre, y una burbuja verde detrás del ícono activo (ícono y nombre
// en blanco). La comparten los tres navegadores de pestañas (vendedor, conductor,
// despachador).
//
// La barra va con position: 'absolute', así que flota sobre el contenido. Para que no tape
// el final de las pantallas, `sceneStyle` les deja abajo un margen del alto de la barra.

export const ALTO_BARRA = 68;
const MARGEN_LATERAL = 28;
const RADIO_BARRA = 18;

// Distancia del borde inferior de la pantalla a la barra (respeta la zona segura).
export function separacionInferior(insets) {
  return Math.max(insets.bottom, 16) + 8;
}

// Espacio total que ocupa la barra desde abajo; lo usa el menú "Más" para abrirse encima.
export function altoOcupadoBarra(insets) {
  return ALTO_BARRA + separacionInferior(insets);
}

export function opcionesTabBarFlotante(insets) {
  return {
    tabBarShowLabel: true,
    // Con teclado abierto la barra flotante taparía los campos (Android).
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: Theme.colors.white,
    tabBarInactiveTintColor: Theme.colors.onDarkText,
    tabBarStyle: {
      position: 'absolute',
      // left/right a 0 + marginHorizontal: el BottomTabBar de react-navigation v7 fija
      // sus propios extremos y con solo left/right la barra seguía pegada a los bordes.
      left: 0,
      right: 0,
      marginHorizontal: MARGEN_LATERAL,
      bottom: separacionInferior(insets),
      height: ALTO_BARRA,
      paddingBottom: 0,
      paddingTop: 0,
      paddingHorizontal: 4,
      borderRadius: RADIO_BARRA,
      borderTopWidth: 0,
      backgroundColor: Theme.colors.dark,
      shadowColor: Theme.colors.dark,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 24,
      elevation: 10,
    },
    tabBarItemStyle: {
      height: ALTO_BARRA,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 9,
      paddingBottom: 9,
    },
    tabBarLabel: ({ children, color }) => <EtiquetaTab color={color}>{children}</EtiquetaTab>,
    tabBarBadgeStyle: {
      backgroundColor: Theme.colors.badge,
      fontSize: 11,
      fontWeight: '700',
    },
    sceneStyle: {
      backgroundColor: Theme.colors.background,
      paddingBottom: altoOcupadoBarra(insets),
    },
  };
}

// Nombre de la pestaña en una sola línea; si no entra (pantallas angostas), se achica hasta
// 80 %. Los navegadores lo usan con un nombre corto propio (`title` es el del encabezado,
// que puede ser largo: "Gestión de Visitas").
export function EtiquetaTab({ color, children }) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
      allowFontScaling={false}
      style={{ color, fontSize: 11, fontWeight: '600', marginTop: 4 }}
    >
      {children}
    </Text>
  );
}

// Ícono de pestaña con burbuja verde detrás cuando está activa.
export function IconoTab({ name, focused, color }) {
  return (
    <View
      style={{
        width: 46,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? Theme.colors.primary : 'transparent',
      }}
    >
      <Ionicons name={name} size={20} color={color} />
    </View>
  );
}
