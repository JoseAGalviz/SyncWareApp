import React, { useEffect, useState } from 'react';
import { View, Text, Image, Alert, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Theme from '../constants/Theme';
import styles from '../styles/CustomDrawerContent.styles';

// Agrupa las pantallas del drawer para que sea más fácil ubicar cada herramienta
// en vez de una lista plana de 8 ítems. Rutas que no aparecen acá (otros roles,
// pantallas nuevas) se listan igual al final, sin encabezado, para no perderlas.
// Diseño "Menú lateral" del lienzo SyncWareApp: encabezado azul noche con avatar e
// iniciales, chip del rol, secciones en mayúsculas y "Cerrar sesión" con borde rojo abajo.
const DRAWER_SECTIONS = [
    { title: 'Principal', routes: ['HomeTabs', 'HomeTabsConductor', 'UserData', 'HistorialPedidos'] },
    { title: 'Herramientas', routes: ['RutasVendedores', 'Documentos'] },
    { title: 'Análisis', routes: ['ConsultaMatrix', 'ClientesPotenciales', 'CoberturaVendedores'] },
];

function iniciales(nombre) {
    const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase() || '?';
}

export default function CustomDrawerContent(props) {
    const [user, setUser] = useState(null);
    const { navigation, state, descriptors } = props;
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const loadUser = async () => {
            const data = await AsyncStorage.getItem('userData');
            if (data) setUser(JSON.parse(data));
        };
        loadUser();
    }, []);

    const handleLogout = () => {
        Alert.alert(
            'Cerrar sesión',
            '¿Seguro que deseas cerrar sesión?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Cerrar sesión',
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.removeItem('userData');
                        navigation.replace('Login');
                    },
                },
            ]
        );
    };

    const renderDrawerItem = (route, index) => {
        const { options } = descriptors[route.key];
        const label = options.drawerLabel !== undefined
            ? options.drawerLabel
            : options.title !== undefined
                ? options.title
                : route.name;

        return (
            <DrawerItem
                key={route.key}
                label={label}
                icon={options.drawerIcon}
                focused={index === state.index}
                activeTintColor={Theme.colors.primaryDark}
                activeBackgroundColor={Theme.colors.primaryLight}
                inactiveTintColor={Theme.colors.text}
                style={styles.item}
                labelStyle={styles.itemLabel}
                onPress={() => navigation.navigate(route.name)}
            />
        );
    };

    const renderedNames = new Set();

    return (
        <View style={{ flex: 1 }}>
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <View style={styles.marca}>
                    <View style={styles.logoCaja}>
                        <Image source={require('../../assets/logo.png')} style={styles.logo} />
                    </View>
                    <Text style={styles.marcaTexto}>SyncWare</Text>
                </View>
                <View style={styles.usuarioFila}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarTexto}>{iniciales(user?.nombre)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.userName} numberOfLines={1}>{user ? user.nombre : 'Usuario'}</Text>
                        <Text style={styles.userEmail} numberOfLines={1}>
                            {user?.usuario ? `@${user.usuario}` : ''}{user?.sede ? ` · Sede ${user.sede}` : ''}
                        </Text>
                    </View>
                </View>
                {user?.rol ? (
                    <View style={styles.rolChip}>
                        <Text style={styles.rolChipText}>{user.rol}</Text>
                    </View>
                ) : null}
            </View>

            <DrawerContentScrollView {...props} contentContainerStyle={styles.lista}>
                {DRAWER_SECTIONS.map((section, sectionIndex) => {
                    const items = section.routes
                        .map((name) => {
                            const index = state.routes.findIndex((r) => r.name === name);
                            return index === -1 ? null : { route: state.routes[index], index };
                        })
                        .filter(Boolean);

                    if (items.length === 0) return null;
                    items.forEach(({ route }) => renderedNames.add(route.name));

                    return (
                        <View key={section.title || `section-${sectionIndex}`}>
                            {section.title && (
                                <Text style={styles.sectionHeader}>{section.title}</Text>
                            )}
                            {items.map(({ route, index }) => renderDrawerItem(route, index))}
                        </View>
                    );
                })}

                {state.routes
                    .filter((route) => !renderedNames.has(route.name))
                    .map((route) => renderDrawerItem(route, state.routes.indexOf(route)))}
            </DrawerContentScrollView>

            <View style={[styles.pie, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8} accessibilityRole="button">
                    <Ionicons name="log-out-outline" color={Theme.colors.errorStrong} size={18} />
                    <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
