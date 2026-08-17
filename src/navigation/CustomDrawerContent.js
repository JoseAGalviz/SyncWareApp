import React, { useEffect, useState } from 'react';
import { View, Text, Image, Alert } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Theme from '../constants/Theme';
import styles from '../styles/CustomDrawerContent.styles';

// Agrupa las pantallas del drawer para que sea más fácil ubicar cada herramienta
// en vez de una lista plana de 8 ítems. Rutas que no aparecen acá (otros roles,
// pantallas nuevas) se listan igual al final, sin encabezado, para no perderlas.
const DRAWER_SECTIONS = [
    { title: null, routes: ['HomeTabs', 'HomeTabsConductor'] },
    { title: 'Operación', routes: ['RecibirGuías', 'HistorialPedidos'] },
    { title: 'Reportes y Análisis', routes: ['ConsultaMatrix', 'ClientesPotenciales', 'CoberturaVendedores', 'RutasVendedores'] },
    { title: 'Cuenta', routes: ['UserData', 'Documentos'] },
];

export default function CustomDrawerContent(props) {
    const [user, setUser] = useState(null);
    const navigation = useNavigation();
    const { state, descriptors } = props;

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
                activeTintColor={Theme.colors.primary}
                inactiveTintColor={Theme.colors.muted}
                labelStyle={{ fontSize: 14, fontWeight: '500' }}
                onPress={() => navigation.navigate(route.name)}
            />
        );
    };

    const renderedNames = new Set();

    return (
        <DrawerContentScrollView {...props}>
            <View style={styles.header}>
                <Image
                    source={require('../../assets/logo.png')}
                    style={styles.profilePic}
                />
                <Text style={styles.userName}>
                    {user ? user.nombre : 'Usuario'}
                </Text>
                <Text style={styles.userEmail}>
                    {user ? user.usuario : ''}
                </Text>
            </View>

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

            <DrawerItem
                label="Cerrar Sesión"
                onPress={handleLogout}
                icon={({ color, size }) => (
                    <Ionicons name="log-out-outline" color={Theme.colors.white} size={size} />
                )}
                style={[styles.logoutButton, { backgroundColor: Theme.colors.primary, borderTopWidth: 0 }]}
                labelStyle={[styles.logoutButtonText, { color: Theme.colors.white, fontWeight: '700', fontSize: 16, textAlign: 'center' }]}
            />
        </DrawerContentScrollView>
    );
}
