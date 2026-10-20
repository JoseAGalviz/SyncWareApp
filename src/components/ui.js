import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Theme from '../constants/Theme';

// Piezas del diseño "SyncWareApp" (lienzo 2026-10-20) que se repiten en todas las
// pantallas: tarjeta, pastilla de estado, barra de progreso, contador, selector segmentado,
// zona de escaneo, aviso, botones y chips de filtro. Las pantallas las combinan; los
// colores salen de Theme.

const C = Theme.colors;

// ── Tarjeta ────────────────────────────────────────────────────────────────────
// `destacada`: borde verde de 2 px (lo nuevo / lo activo). `completa`: borde verde de 1 px.
export function Tarjeta({ destacada, completa, error, onPress, style, children, ...rest }) {
  const estilo = [
    s.tarjeta,
    completa && { borderColor: C.primary },
    error && { borderColor: C.errorEdge },
    destacada && { borderWidth: 2, borderColor: C.primary },
    style,
  ];
  if (onPress) {
    return (
      <TouchableOpacity style={estilo} onPress={onPress} activeOpacity={0.7} {...rest}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={estilo} {...rest}>{children}</View>;
}

// ── Pastilla de estado ─────────────────────────────────────────────────────────
const TONOS_PILL = {
  verde: { fg: C.primaryDark, bg: C.primaryLight },
  ambar: { fg: C.warningText, bg: C.warningSoft },
  rojo: { fg: C.errorText, bg: C.errorSoft },
  neutro: { fg: C.muted, bg: C.track },
  azul: { fg: C.dark, bg: C.infoSoft },
  solido: { fg: C.white, bg: C.primaryDark },
};
export function Pill({ tono = 'neutro', children, style }) {
  const t = TONOS_PILL[tono] || TONOS_PILL.neutro;
  return (
    <View style={[s.pill, { backgroundColor: t.bg }, style]}>
      <Text style={[s.pillTexto, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

// ── Barra de progreso ──────────────────────────────────────────────────────────
export function Barra({ pct = 0, color = C.primary, alto = 8, style }) {
  const ancho = Math.max(0, Math.min(100, pct));
  return (
    <View style={[{ height: alto, borderRadius: alto / 2, backgroundColor: C.track, overflow: 'hidden' }, style]}>
      <View style={{ width: `${ancho}%`, height: '100%', backgroundColor: color, borderRadius: alto / 2 }} />
    </View>
  );
}

// ── Contador (tarjeta chica con número grande) ────────────────────────────────
export function Stat({ label, valor, color = C.text, style }) {
  return (
    <View style={[s.stat, style]}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValor, { color }]}>{valor}</Text>
    </View>
  );
}

// ── Selector segmentado (ej. Cámara / Lector bluetooth) ────────────────────────
export function Segmentado({ opciones, valor, onChange, style }) {
  return (
    <View style={[s.segmentado, style]} accessibilityRole="radiogroup">
      {opciones.map((op) => {
        const activo = op.value === valor;
        return (
          <TouchableOpacity
            key={op.value}
            style={[s.segmento, activo && s.segmentoActivo]}
            onPress={() => onChange(op.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo }}
            activeOpacity={0.8}
          >
            <Text style={[s.segmentoTexto, activo && s.segmentoTextoActivo]}>{op.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Zona de escaneo (borde verde punteado) ─────────────────────────────────────
export function ZonaEscaneo({ titulo, subtitulo, derecha, alto = 72, style }) {
  return (
    <View style={[s.zona, { height: alto }, style]}>
      <Ionicons name="barcode-outline" size={28} color={C.primaryDark} />
      <View style={{ flex: 1 }}>
        <Text style={s.zonaTitulo}>{titulo}</Text>
        {subtitulo ? <Text style={s.zonaSub}>{subtitulo}</Text> : null}
      </View>
      {derecha ? <Text style={s.zonaDerecha}>{derecha}</Text> : null}
    </View>
  );
}

// ── Aviso en línea ─────────────────────────────────────────────────────────────
// tono: ambar (advertencia), rojo (bloqueo), exito (verde sólido, confirmación).
const TONOS_AVISO = {
  ambar: { bg: C.warningSoft, borde: C.warningEdge, fg: C.warningText, icon: 'warning-outline' },
  rojo: { bg: C.errorSoft, borde: C.errorEdge, fg: '#7A2B2B', icon: 'alert-circle-outline' },
  exito: { bg: C.primaryDark, borde: C.primaryDark, fg: C.white, icon: 'checkmark' },
};
export function Aviso({ tono = 'ambar', icon, children, style }) {
  const t = TONOS_AVISO[tono] || TONOS_AVISO.ambar;
  return (
    <View
      style={[s.aviso, { backgroundColor: t.bg, borderColor: t.borde }, style]}
      accessibilityRole={tono === 'exito' ? undefined : 'alert'}
    >
      <Ionicons name={icon || t.icon} size={20} color={t.fg} />
      <Text style={[s.avisoTexto, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

// ── Botones ────────────────────────────────────────────────────────────────────
// variante: primario (verde), oscuro (azul noche), secundario (blanco con borde),
// peligro (borde rojo), deshabilitado se pinta gris.
const VARIANTES = {
  primario: { bg: C.primaryDark, fg: C.white, borde: C.primaryDark },
  oscuro: { bg: C.dark, fg: C.white, borde: C.dark },
  secundario: { bg: C.surface, fg: C.text, borde: C.border },
  peligro: { bg: C.surface, fg: C.errorStrong, borde: C.error },
};
export function Boton({ variante = 'primario', titulo, icon, onPress, disabled, cargando, alto = 52, style, textStyle }) {
  const v = VARIANTES[variante] || VARIANTES.primario;
  const off = disabled || cargando;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={off}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      style={[
        s.boton,
        { height: alto, backgroundColor: v.bg, borderColor: v.borde, borderWidth: variante === 'peligro' ? 1.5 : 1 },
        disabled && { backgroundColor: C.border, borderColor: C.border },
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={20} color={disabled ? C.muted : v.fg} /> : null}
          <Text style={[s.botonTexto, { color: disabled ? C.muted : v.fg }, textStyle]}>{titulo}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ── Chip de filtro (redondo; activo = azul noche) ──────────────────────────────
export function Chip({ label, activo, onPress, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: !!activo }}
      style={[s.chip, activo ? s.chipActivo : s.chipInactivo, style]}
    >
      <Text style={[s.chipTexto, { color: activo ? C.white : C.text, fontWeight: activo ? '600' : '500' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Título de sección ──────────────────────────────────────────────────────────
export function Seccion({ titulo, derecha, style }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }, style]}>
      <Text style={s.seccion}>{titulo}</Text>
      {derecha ? <Text style={{ fontSize: 12, color: C.muted }}>{derecha}</Text> : null}
    </View>
  );
}

// ── Ícono en recuadro de color ─────────────────────────────────────────────────
const TONOS_ICONO = {
  verde: { bg: C.primaryLight, fg: C.primaryDark },
  azul: { bg: C.infoSoft, fg: C.info },
  ambar: { bg: C.warningSoft, fg: C.warningIcon },
  violeta: { bg: C.purpleSoft, fg: C.purple },
  rojo: { bg: C.errorSoft, fg: C.errorText },
};
export function IconoCaja({ name, tono = 'verde', tam = 40 }) {
  const t = TONOS_ICONO[tono] || TONOS_ICONO.verde;
  return (
    <View style={{ width: tam, height: tam, borderRadius: tam * 0.3, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={Math.round(tam * 0.55)} color={t.fg} />
    </View>
  );
}

const s = StyleSheet.create({
  tarjeta: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillTexto: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
  stat: { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14 },
  statLabel: { fontSize: 12, color: C.muted },
  statValor: { fontSize: 28, fontWeight: '800', marginTop: 2 },
  segmentado: { flexDirection: 'row', gap: 4, backgroundColor: C.border, padding: 4, borderRadius: 14 },
  segmento: { flex: 1, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segmentoActivo: {
    backgroundColor: C.surface,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  segmentoTexto: { fontSize: 14, fontWeight: '600', color: C.muted },
  segmentoTextoActivo: { fontWeight: '700', color: C.text },
  zona: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 2, borderStyle: 'dashed', borderColor: C.primary,
    backgroundColor: C.primaryLight, borderRadius: 16, paddingHorizontal: 16,
  },
  zonaTitulo: { fontSize: 15, fontWeight: '700', color: C.primaryDark },
  zonaSub: { fontSize: 12, color: '#2E5B4A', marginTop: 1 },
  zonaDerecha: { fontSize: 12, fontWeight: '600', color: '#2E5B4A' },
  aviso: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
  },
  avisoTexto: { flex: 1, fontSize: 13, fontWeight: '600' },
  boton: { borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  botonTexto: { fontSize: 16, fontWeight: '700' },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  chipActivo: { backgroundColor: C.dark },
  chipInactivo: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipTexto: { fontSize: 13 },
  seccion: { fontSize: 16, fontWeight: '700', color: C.text },
});
