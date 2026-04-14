import React, { useEffect, useState } from 'react';
import { View, Text, Image } from 'react-native';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Theme from '../constants/Theme';
import styles from '../styles/CustomDrawerContent.styles';


export default function CustomDrawerContent(props) {
    const [user, setUser] = useState(null);
    const navigation = useNavigation();

    useEffect(() => {
        const loadUser = async () => {
            const data = await AsyncStorage.getItem('userData');
            if (data) setUser(JSON.parse(data));
        };
        loadUser();
    }, []);

    const handleLogout = async () => {
        await AsyncStorage.removeItem('userData');
        navigation.replace('Login');
    };

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

            <DrawerItemList {...props} />

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
