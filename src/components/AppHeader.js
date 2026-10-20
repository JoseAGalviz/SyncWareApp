import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Theme from '../constants/Theme';

// Encabezado del diseño "SyncWareApp": barra azul noche, botón cuadrado de 44 px a la
// izquierda (menú lateral o volver), título de 18 px alineado a la izquierda con subtítulo
// opcional, y acciones opcionales a la derecha (mismos botones cuadrados).
//
// Uso directo en una pantalla:  <AppHeader title="…" subtitle="…" onBack={…} right={…} />
// Como header de un navegador:  header: (props) => <NavHeader {...props} />
//   - título: options.title ?? route.name
//   - subtítulo: options.headerSubtitle (se puede cambiar con navigation.setOptions)
//   - acciones: options.headerActions = [{ icon, label, onPress }]
//   - con `back` (stack con pantalla anterior) muestra "volver"; si no, el menú lateral.

export function HeaderButton({ icon, label, onPress, children }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.boton}
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.75}
    >
      {children || <Ionicons name={icon} size={22} color={Theme.colors.white} />}
    </TouchableOpacity>
  );
}

// Botón con ícono + texto para la derecha del encabezado (ej. "PDF").
export function HeaderTextButton({ icon, label, onPress, disabled, cargando }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || cargando}
      style={[styles.botonTexto, (disabled || cargando) && { opacity: 0.4 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.75}
    >
      {cargando ? <ActivityIndicator size="small" color={Theme.colors.white} /> : <Ionicons name={icon} size={18} color={Theme.colors.white} />}
      <Text style={styles.botonTextoLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AppHeader({ title, subtitle, titleMono, onMenu, onBack, right, children }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.fila}>
        {onBack ? (
          <HeaderButton icon="chevron-back" label="Volver" onPress={onBack} />
        ) : onMenu ? (
          <HeaderButton icon="menu" label="Abrir menú" onPress={onMenu} />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.titulo, titleMono && { fontFamily: Theme.fontMono, fontSize: 17 }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitulo} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

export function NavHeader({ navigation, route, options, back }) {
  const acciones = options.headerActions || [];
  return (
    <AppHeader
      title={options.title ?? route.name}
      subtitle={options.headerSubtitle}
      titleMono={options.headerTitleMono}
      onBack={back ? navigation.goBack : undefined}
      // Sin menú lateral (despachador) no se muestra el botón.
      onMenu={!back && navigation.openDrawer ? () => navigation.openDrawer() : undefined}
      right={acciones.length ? (
        <View style={{ flexDirection: 'row', gap: Theme.spacing.sm }}>
          {acciones.map((a) => (
            <HeaderButton key={a.label} icon={a.icon} label={a.label} onPress={a.onPress} />
          ))}
        </View>
      ) : null}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Theme.colors.dark,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  boton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Theme.colors.darkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonTexto: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Theme.colors.darkSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  botonTextoLabel: {
    color: Theme.colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  titulo: {
    color: Theme.colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitulo: {
    color: Theme.colors.onDarkText,
    fontSize: 12,
    marginTop: 2,
  },
});
