import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import { showMessage } from 'react-native-flash-message';
import Theme from '../constants/Theme';
import styles from '../styles/DocumentosScreen.styles';

const DOCUMENTOS = [
    {
        id: 1,
        titulo: 'Plus de Herramientas para Vender',
        descripcion: 'Guía actualizada de herramientas de ventas',
        icono: 'briefcase-outline',
        asset: require('../../assets/documentos/Plus de Herramientas para vender actualizado.pdf'),
        fileName: 'Plus_Herramientas_Vender.pdf',
    },
    {
        id: 2,
        titulo: 'Política de Crédito y Cobranza 2025',
        descripcion: 'Políticas vigentes de crédito y cobranza',
        icono: 'card-outline',
        asset: require('../../assets/documentos/politica credito y cobranza 2025.pdf'),
        fileName: 'Politica_Credito_Cobranza_2025.pdf',
    },
];

const DocumentosScreen = ({ navigation }) => {
    const [loading, setLoading] = useState({});

    const handleOpen = async (doc) => {
        setLoading(prev => ({ ...prev, [doc.id]: true }));
        try {
            const [asset] = await Asset.loadAsync(doc.asset);
            await asset.downloadAsync();

            const canShare = await Sharing.isAvailableAsync();
            if (!canShare) {
                showMessage({ message: 'Compartir no disponible en este dispositivo', type: 'warning' });
                return;
            }
            await Sharing.shareAsync(asset.localUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
        } catch (error) {
            showMessage({
                message: 'Error al abrir documento',
                description: error.message,
                type: 'danger',
            });
        } finally {
            setLoading(prev => ({ ...prev, [doc.id]: false }));
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Documentos</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                {DOCUMENTOS.map(doc => (
                    <TouchableOpacity
                        key={doc.id}
                        style={styles.docCard}
                        onPress={() => handleOpen(doc)}
                        disabled={!!loading[doc.id]}
                        activeOpacity={0.7}
                    >
                        <View style={styles.docIconContainer}>
                            {loading[doc.id]
                                ? <ActivityIndicator size="small" color={Theme.colors.primary} />
                                : <Ionicons name={doc.icono} size={32} color={Theme.colors.primary} />
                            }
                        </View>
                        <View style={styles.docInfo}>
                            <Text style={styles.docTitulo}>{doc.titulo}</Text>
                            <Text style={styles.docDescripcion}>{doc.descripcion}</Text>
                        </View>
                        <Ionicons name="download-outline" size={22} color={Theme.colors.muted} />
                    </TouchableOpacity>
                ))}
            </View>
        </SafeAreaView>
    );
};

export default DocumentosScreen;
