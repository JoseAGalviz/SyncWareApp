import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../constants/Colors';


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
                    <Ionicons name="log-out-outline" color={COLORS.WHITE} size={size} />
                )}
                style={[styles.logoutButton, { backgroundColor: COLORS.PRIMARY, borderTopWidth: 0 }]}
                labelStyle={[styles.logoutButtonText, { color: COLORS.WHITE, fontWeight: 'bold', fontSize: 16, textAlign: 'center' }]}
            />
        </DrawerContentScrollView>
    );
}

const styles = StyleSheet.create({
    header: {
        padding: 24,
        paddingTop: 10,
        backgroundColor: COLORS.WHITE,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#040404ff',
    },
    profilePic: {
        width: 200,
        height: 100,
        marginBottom: 8,
        resizeMode: 'contain',
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#090909ff',
    },
    userEmail: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    logoutButton: {
        marginTop: 20,
        borderRadius: 8,
        paddingTop: 10,
    },
    logoutButtonText: {
        color: COLORS.WHITE,
        fontWeight: 'bold',
    },
});