import React, { useEffect, useState } from 'react';
import { View, Text, Alert, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Theme from '../constants/Theme';
import { Config } from '../constants/Config';
import { getAuthHeader } from '../services/api';
import AppHeader from '../components/AppHeader';
import { Tarjeta, Pill } from '../components/ui';

// "Mi Perfil" con el estilo del lienzo SyncWareApp: encabezado azul noche, tarjeta con
// avatar de iniciales y chip del rol, datos en filas y segmentos como chips.
const C = Theme.colors;

function iniciales(nombre) {
    const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase() || '?';
}

export default function UserDataScreen({ navigation }) {
    const [userData, setUserData] = useState(null);
    const [segmentDescriptions, setSegmentDescriptions] = useState([]);

    useEffect(() => {
        const loadUserDataAndSegments = async () => {
            try {
                // Cargar datos del usuario desde AsyncStorage
                const data = await AsyncStorage.getItem('userData');
                if (data) {
                    const parsedData = JSON.parse(data);
                    setUserData(parsedData);

                    // Si el usuario tiene segmentos, cargar sus descripciones
                    if (parsedData.segmentos && parsedData.segmentos.length > 0) {
                        await fetchSegmentDescriptions(parsedData.segmentos);
                    }
                }
            } catch (e) {
                Alert.alert('Error', 'No se pudieron cargar los datos del usuario o los segmentos.');
                console.error("Error loading data:", e);
            }
        };

        const fetchSegmentDescriptions = async (userSegmentCodes) => {
            try {
                // Read from local cache first
                const cached = await AsyncStorage.getItem('segmentos');
                let allSegments = cached ? JSON.parse(cached) : null;

                if (!allSegments || allSegments.length === 0) {
                    const response = await fetch(`${Config.API_BASE_URL}/api/clientes/segmentos`, {
                        headers: await getAuthHeader(),
                    });
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    allSegments = await response.json();
                }

                const descriptions = allSegments
                    .filter(segment => userSegmentCodes.includes(segment.co_seg))
                    .map(segment => `${segment.co_seg} - ${segment.seg_des}`);

                setSegmentDescriptions(descriptions.length > 0 ? descriptions : userSegmentCodes);
            } catch (e) {
                console.error("Error fetching segments:", e);
                setSegmentDescriptions(userSegmentCodes);
            }
        };

        loadUserDataAndSegments();
    }, []);

    const header = (
        <AppHeader
            title="Mi Perfil"
            onMenu={navigation.openDrawer ? () => navigation.openDrawer() : undefined}
        />
    );

    if (!userData) {
        return (
            <View style={st.pantalla}>
                {header}
                <View style={st.cargando}>
                    <ActivityIndicator color={C.primary} />
                    <Text style={{ color: C.muted }}>Cargando datos del usuario...</Text>
                </View>
            </View>
        );
    }

    const filas = [
        ['Usuario', userData.usuario ? `@${userData.usuario}` : '—'],
        ['Código de vendedor', userData.co_ven || '—'],
        ['Sede', userData.sede || '—'],
        ['Fecha de registro', userData.fecha_registro ? new Date(userData.fecha_registro).toLocaleDateString('es-VE') : '—'],
    ];

    return (
        <View style={st.pantalla}>
            {header}
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
                <Tarjeta style={st.perfil}>
                    <View style={st.avatar}>
                        <Text style={st.avatarTexto}>{iniciales(userData.nombre)}</Text>
                    </View>
                    <Text style={st.nombre}>{userData.nombre}</Text>
                    {userData.rol ? <Pill tono="verde">{String(userData.rol).toUpperCase()}</Pill> : null}
                </Tarjeta>

                <Tarjeta style={{ gap: 0, paddingVertical: 4 }}>
                    {filas.map(([label, valor], i) => (
                        <View key={label} style={[st.fila, i < filas.length - 1 && st.filaBorde]}>
                            <Text style={st.filaLabel}>{label}</Text>
                            <Text style={st.filaValor} numberOfLines={1}>{valor}</Text>
                        </View>
                    ))}
                </Tarjeta>

                <Tarjeta>
                    <Text style={st.seccion}>Segmentos</Text>
                    {segmentDescriptions.length > 0 ? (
                        <View style={st.chips}>
                            {segmentDescriptions.map((desc, idx) => (
                                <View key={idx} style={st.chip}>
                                    <Text style={st.chipTexto}>{desc}</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={{ color: C.muted }}>Sin segmentos asignados</Text>
                    )}
                </Tarjeta>
            </ScrollView>
        </View>
    );
}

const st = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: C.background },
    cargando: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    perfil: { alignItems: 'center', paddingVertical: 24, gap: 10 },
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
    avatarTexto: { color: C.white, fontSize: 26, fontWeight: '800' },
    nombre: { fontSize: 18, fontWeight: '800', color: C.text, textAlign: 'center' },
    fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, gap: 12 },
    filaBorde: { borderBottomWidth: 1, borderBottomColor: C.border },
    filaLabel: { fontSize: 13, color: C.muted },
    filaValor: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: C.text, textAlign: 'right' },
    seccion: { fontSize: 15, fontWeight: '700', color: C.text },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { backgroundColor: C.primaryLight, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
    chipTexto: { fontSize: 13, fontWeight: '600', color: C.primaryDark },
});
