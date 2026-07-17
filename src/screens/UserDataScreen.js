import React, { useEffect, useState } from 'react';
import { View, Text, Image, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/Colors';
import styles from '../styles/UserDataScreen.styles';
import { Config } from '../constants/Config';
import { getAuthHeader } from '../services/api';


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

    if (!userData) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Cargando datos del usuario...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('HomeTabs')}>
                <Ionicons name="arrow-back" size={28} color={COLORS.SUCCESS} />
                <Text style={styles.backText}>Volver al inicio</Text>
            </TouchableOpacity>
            <View style={styles.card}>
                <Image
                    source={require('../../assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.title}>Datos del Usuario</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Nombre:</Text>
                    <Text style={styles.value}>{userData.nombre}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Usuario:</Text>
                    <Text style={styles.value}>{userData.usuario}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Rol:</Text>
                    <Text style={styles.value}>{userData.rol}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Fecha de registro:</Text>
                    <Text style={styles.value}>{new Date(userData.fecha_registro).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.infoRow, { flexDirection: 'column', alignItems: 'flex-start', borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}>
                    <Text style={[styles.label, { marginBottom: 6 }]}>Segmentos:</Text>
                    {segmentDescriptions.length > 0 ? (
                        <View style={styles.segmentList}>
                            {segmentDescriptions.map((desc, idx) => (
                                <Text key={idx} style={styles.segmentItem}>
                                    {desc}
                                </Text>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.value}>N/A</Text>
                    )}
                </View>
            </View>
        </View>
    );
}

