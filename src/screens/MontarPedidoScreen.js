import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Image,
    Dimensions,
    Platform,
    StatusBar,
    ActivityIndicator,
    Alert,
    FlatList,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { API_ENDPOINTS } from '../constants/Config';
import { api } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AVATAR_COLORS = [
    '#6366f1', // indigo-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#f43f5e', // rose-500
    '#f59e0b', // amber-500
    '#10b981', // emerald-500
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
];

const getAvatarColor = (name) => {
    if (!name) return AVATAR_COLORS[0];
    const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return AVATAR_COLORS[charCodeSum % AVATAR_COLORS.length];
};

const MontarPedidoScreen = ({ navigation }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [originalProducts, setOriginalProducts] = useState([]);

    // Category Filter State
    const [categories, setCategories] = useState(['Todos']);
    const [selectedCategory, setSelectedCategory] = useState('Todos');

    // Client Selection State
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientSearch, setClientSearch] = useState('');
    const [loadingClients, setLoadingClients] = useState(true);

    // Payment Times State
    const [paymentTimes, setPaymentTimes] = useState([]);

    // Cart State
    const [cart, setCart] = useState([]);
    const [cartModalVisible, setCartModalVisible] = useState(false);
    const [selectedDiscounts, setSelectedDiscounts] = useState([]);
    const [confirmingOrder, setConfirmingOrder] = useState(false);

    // Helper to calculate total
    const cartTotal = cart.reduce((sum, item) => sum + (item.priceNum * item.quantity), 0);
    const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    useEffect(() => {
        loadClients();
        fetchPaymentTimes();
    }, []);


    const fetchPaymentTimes = async () => {
        try {
            const response = await api.get(API_ENDPOINTS.TIEMPOS_PAGO);
            if (Array.isArray(response)) {
                setPaymentTimes(response);
            }
        } catch (error) {
            console.error("Error loading payment times:", error);
        }
    };

    const loadClients = async () => {
        setLoadingClients(true);
        try {
            // Obtener los segmentos del usuario logueado
            let coSegString = "";
            const userDataJson = await AsyncStorage.getItem('userData');
            if (userDataJson) {
                const userData = JSON.parse(userDataJson);
                if (userData.segmentos && Array.isArray(userData.segmentos)) {
                    coSegString = userData.segmentos.join(',');
                }
            }

            console.log("Fetching clients from:", API_ENDPOINTS.CLIENTES_PEDIDOS, "with co_seg:", coSegString);
            const response = await api.post(API_ENDPOINTS.CLIENTES_PEDIDOS, {
                co_seg: coSegString
            });

            let allClients = [];
            if (Array.isArray(response)) {
                allClients = response;
            } else if (response && response.data && Array.isArray(response.data)) {
                allClients = response.data;
            } else {
                console.log("Unexpected response format:", response);
                throw new Error("Formato de respuesta inválido");
            }

            // Normalizar y filtrar: Tomar todos los que salen 'Visita' (simulado) siempre y cuando tengan código profit.
            // Asumimos que la API devuelve objetos con co_cli (Profit) o similar.
            // Filtramos si no tiene co_cli o es tipo bitrix puro (si la API devuelve eso).
            const filteredClients = allClients.filter(c =>
                c.co_cli && c.tipo !== 'bitrix'
            );

            setClients(filteredClients);
            setFilteredClients(filteredClients);
        } catch (error) {
            console.error("Error loading clients:", error);
            Alert.alert("Error", "No se pudieron cargar los clientes del servidor.");
        } finally {
            setLoadingClients(false);
        }
    };

    const handleClientSearch = (text) => {
        setClientSearch(text);
        if (text.trim() === '') {
            setFilteredClients(clients);
        } else {
            const filtered = clients.filter(c =>
                (c.cli_des || c.TITLE || "").toLowerCase().includes(text.toLowerCase()) ||
                (c.co_cli || "").toString().toLowerCase().includes(text.toLowerCase())
            );
            setFilteredClients(filtered);
        }
    };

    const handleSelectClient = (client) => {
        setSelectedClient(client);

        // Extract price number from "PRECIO X"
        // Example: "PRECIO 4" -> 4
        let priceNum = 0;
        if (client.precio_a) {
            const match = client.precio_a.match(/\d+$/);
            if (match) {
                priceNum = parseInt(match[0], 10);
            }
        }

        fetchCatalog(priceNum, client.desc_glob || 0);
    };

    const handleBackToClients = () => {
        setSelectedClient(null);
        setSearchQuery('');
        setProducts(originalProducts); // Reset product search
        setSelectedDiscounts([]); // Reset selected discounts
    };

    const fetchCatalog = async (priceNum = 0, globalDiscount = 0) => {
        setLoading(true);
        setProducts([]); // Clear previous products
        try {
            console.log("Fetching catalog from:", API_ENDPOINTS.CATALOGO, "with price_num:", priceNum, "global discount:", globalDiscount);
            // Usamos post para enviar el body con el numero de precio
            const response = await api.post(API_ENDPOINTS.CATALOGO, {
                precio_num: priceNum
            });

            // Handle response, assuming it returns the array directly or in .data
            let data = [];
            if (Array.isArray(response)) {
                data = response;
            } else if (response && response.data && Array.isArray(response.data)) {
                data = response.data;
            } else {
                throw new Error("La respuesta del catálogo no es un array");
            }

            console.log(`✅ Catálogo cargado: ${data.length} productos.`);

            // Mapear los datos del API al formato que usa el componente
            const mappedProducts = data.map((item, index) => {
                const basePrice = item.Precio ? parseFloat(item.Precio) : 0;
                const discountedPrice = basePrice * (1 - (globalDiscount / 100));
                const priceLabel = discountedPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

                return {
                    id: item.imagen || index,
                    title: item.descripcion,
                    price: priceLabel,
                    stock: item.stock, // Stock total
                    stock_tachira: item.stock_tachira || 0,
                    stock_barquisimeto: item.stock_barquisimeto || 0,
                    image: `https://imagenes.cristmedicals.com/imagenes-v3/imagenes/${(item.imagen || "").trim()}.jpg`,
                    expiry: item.descripcion.match(/FV\.?\s*(\d{2}\/\d{4})/)?.[1] || 'N/A',
                    quantity: 0,
                    subtotal: 0,
                    priceNum: discountedPrice, // Store discounted numeric price for calcs
                    categoryDiscount: item.descuento_por_categoria || 0,
                    lineDiscount: item.descuento_por_linea || 0
                };
            });

            setProducts(mappedProducts);
            setOriginalProducts(mappedProducts);

            // Extract Categories (Mocking for now until field is confirmed)
            // Assuming 'linea' or similar. We will just use a hardcoded list + extracted if available later.
            // For now, let's look at the first item to guess, or wait. User asked for filter UI.
            // We will add some dummy categories if none found.
            const uniqueCategories = ['Todos', ...new Set(mappedProducts.map(p => p.category || 'General').filter(Boolean))];
            // Since we don't have the field yet, we might see just 'General'.
            setCategories(uniqueCategories.length > 1 ? uniqueCategories : ['Todos', 'Medicinas', 'Insumos', 'Equipos']);

        } catch (error) {
            console.error("Error fetching catalog:", error);
            let msg = "No se pudo cargar el catálogo de productos.";
            if (error.message === "Request timed out") {
                msg = "Tiempo de espera agotado. Verifica tu conexión a la red local (192.168.4.69).";
            }
            Alert.alert("Error de Conexión", msg);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text) => {
        setSearchQuery(text);
        filterProducts(text, selectedCategory);
    };

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        filterProducts(searchQuery, category);
    };

    const filterProducts = (text, category) => {
        let filtered = originalProducts;
        if (category && category !== 'Todos') {
            filtered = filtered.filter(p => (p.category || 'General') === category);
        }
        if (text) {
            filtered = filtered.filter(p => p.title.toLowerCase().includes(text.toLowerCase()));
        }
        setProducts(filtered);
    };

    const handleIncrement = (product) => {
        // Implementation for increasing quantity
        // 1. Update Products State
        const updatedProducts = products.map(p => {
            if (p.id === product.id) {
                return { ...p, quantity: p.quantity + 1 };
            }
            return p;
        });
        setProducts(updatedProducts);
        // Also update originalProducts so filtering doesn't lose state
        const updatedOriginal = originalProducts.map(p => {
            if (p.id === product.id) {
                return { ...p, quantity: p.quantity + 1 };
            }
            return p;
        });
        setOriginalProducts(updatedOriginal);

        // 2. Update Cart State
        const existingItem = cart.find(c => c.id === product.id);
        if (existingItem) {
            setCart(cart.map(c => c.id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, { ...product, quantity: 1, priceNum: product.priceNum || parseFloat(product.price) }]);
        }
    };

    const handleDecrement = (product) => {
        if (product.quantity === 0) return;

        // 1. Update Products State
        const updatedProducts = products.map(p => {
            if (p.id === product.id) {
                return { ...p, quantity: Math.max(0, p.quantity - 1) };
            }
            return p;
        });
        setProducts(updatedProducts);
        // Also update originalProducts
        const updatedOriginal = originalProducts.map(p => {
            if (p.id === product.id) {
                return { ...p, quantity: Math.max(0, p.quantity - 1) };
            }
            return p;
        });
        setOriginalProducts(updatedOriginal);

        // 2. Update Cart State
        const existingItem = cart.find(c => c.id === product.id);
        if (existingItem) {
            if (existingItem.quantity > 1) {
                setCart(cart.map(c => c.id === product.id ? { ...c, quantity: c.quantity - 1 } : c));
            } else {
                setCart(cart.filter(c => c.id !== product.id));
            }
        }
    };

    // Función para construir el JSON del pedido
    const buildOrderJSON = async (finalTotal, discountAmount) => {
        // Obtener código del vendedor del usuario logueado
        let cod_prov = "";
        try {
            const userDataJson = await AsyncStorage.getItem('userData');
            if (userDataJson) {
                const userData = JSON.parse(userDataJson);
                cod_prov = userData.co_ven || "";
            }
        } catch (error) {
            console.error("Error obteniendo código de vendedor:", error);
        }

        // Calcular totales
        const tot_bruto = cart.reduce((sum, item) => sum + (item.priceNum * item.quantity), 0);
        const tot_neto = finalTotal;
        const descuento_total = discountAmount;

        // IVA del 16%
        const iva = tot_neto * 0.16;

        // Saldo inicial es el total neto más IVA
        const saldo = tot_neto + iva;

        // Calcular porcentaje de descuento global del pedido
        const porc_gdesc = tot_bruto > 0 ? ((descuento_total / tot_bruto) * 100).toFixed(2) : 0;

        // Código del pedido (puede ser generado o dejarse vacío para que el backend lo genere)
        const codigo_pedido = `APP-${Date.now()}`;

        // Procesar items del carrito
        const items = cart.map((item) => {
            // Extraer código de artículo de la imagen
            // La imagen es: https://imagenes.cristmedicals.com/imagenes-v3/imagenes/{co_art}.jpg
            const co_art = item.id || "";

            return {
                co_art: String(co_art),
                art_des: item.title, // Agregar descripción para el historial
                cant_sc: item.quantity,
                precio: item.priceNum,
                descuento: item.categoryDiscount || 0,
                desc_especial: item.lineDiscount || 0
            };
        });

        // Obtener IP del cliente (no disponible en React Native, se usa placeholder)
        const ip_cliente = Platform.OS === 'web' ? window.location.hostname : 'mobile-app';

        return {
            cod_cliente: selectedClient?.co_cli || "",
            cod_prov: cod_prov,
            tot_bruto: tot_bruto,
            tot_neto: tot_neto,
            saldo: saldo,
            iva: iva,
            codigo_pedido: codigo_pedido,
            porc_gdesc: parseFloat(porc_gdesc),
            porc_gdesc_proveedor: selectedClient?.desc_glob || 0,
            descrip: "Pedido de prueba desde APP",
            ip_cliente: ip_cliente,
            items: items
        };
    };

    // Función para confirmar el pedido
    const handleConfirmOrder = async (finalTotal, discountAmount) => {
        if (cart.length === 0) {
            Alert.alert("Carrito vacío", "Agrega productos antes de confirmar.");
            return;
        }

        if (!selectedClient) {
            Alert.alert("Error", "No se ha seleccionado un cliente.");
            return;
        }

        setConfirmingOrder(true);

        try {
            // Construir JSON del pedido (ahora es async)
            const orderJSON = await buildOrderJSON(finalTotal, discountAmount);

            console.log("📦 Enviando pedido:", JSON.stringify(orderJSON, null, 2));

            // Enviar pedido al servidor
            const response = await api.post(API_ENDPOINTS.CREAR_PEDIDO, orderJSON);

            console.log("✅ Respuesta del servidor:", response);

            // Guardar en el historial local (caché)
            try {
                const serverPedidoNum = response?.fact_num || orderJSON.codigo_pedido;

                const pedidoParaHistorial = {
                    ...orderJSON,
                    id: response?.id || serverPedidoNum,
                    codigo_pedido: serverPedidoNum, // Usar el número devuelto por el servidor
                    nombre_cliente: selectedClient?.cli_des || selectedClient?.TITLE || "Cliente Desconocido",
                    fecha_creacion: new Date().toISOString(),
                    items_count: cart.reduce((sum, item) => sum + item.quantity, 0),
                    estado: 'pendiente' // Por defecto al enviar desde la app
                };

                const historialPrevioJson = await AsyncStorage.getItem('PEDIDOS_CACHE');
                let historialPrevio = [];
                if (historialPrevioJson) {
                    historialPrevio = JSON.parse(historialPrevioJson);
                }

                const nuevoHistorial = [pedidoParaHistorial, ...historialPrevio];
                await AsyncStorage.setItem('PEDIDOS_CACHE', JSON.stringify(nuevoHistorial));
                console.log("💾 Pedido guardado en caché local");
            } catch (cacheError) {
                console.error("❌ Error al guardar en caché local:", cacheError);
            }

            Alert.alert(
                "¡Pedido Confirmado!",
                `Se ha creado el pedido ${orderJSON.codigo_pedido} exitosamente.`,
                [
                    {
                        text: "OK",
                        onPress: () => {
                            // Limpiar carrito y resetear estado
                            setCart([]);
                            setCartModalVisible(false);
                            setSelectedDiscounts([]);

                            // Reset product quantities
                            const resetProducts = products.map(p => ({ ...p, quantity: 0 }));
                            setProducts(resetProducts);
                            setOriginalProducts(resetProducts);
                        }
                    }
                ]
            );

        } catch (error) {
            console.error("❌ Error al confirmar pedido:", error);
            let errorMessage = "No se pudo procesar el pedido. Intenta nuevamente.";

            if (error.response) {
                errorMessage = error.response.data?.message || errorMessage;
            } else if (error.message === "Request timed out") {
                errorMessage = "Tiempo de espera agotado. Verifica tu conexión.";
            }

            Alert.alert("Error", errorMessage);
        } finally {
            setConfirmingOrder(false);
        }
    };

    const renderDiscountCard = (title, value, colorType) => {
        let bgColor, textColor, borderColor, valueColor;

        if (colorType === 'amber') {
            bgColor = '#fffbeb'; // amber-50
            textColor = '#b45309'; // amber-700
            borderColor = '#fde68a'; // amber-200
            valueColor = '#92400e'; // amber-800
        } else if (colorType === 'emerald') {
            bgColor = '#ecfdf5'; // emerald-50
            textColor = '#047857'; // emerald-700
            borderColor = '#a7f3d0'; // emerald-200
            valueColor = '#065f46'; // emerald-800
        } else {
            bgColor = '#ffffff';
            textColor = '#64748b'; // slate-500
            borderColor = '#e2e8f0'; // slate-200
            valueColor = '#007a5e'; // primary
        }

        return (
            <View style={[styles.discountCard, { backgroundColor: bgColor, borderColor: borderColor }]}>
                <Text style={[styles.discountTag, { color: textColor }]}>{title}</Text>
                <Text style={[styles.discountValue, { color: colorType === 'amber' || colorType === 'emerald' ? valueColor : '#007a5e' }]}>{value}</Text>
            </View>
        );
    };

    const renderProductCard = (product) => {
        const isAgotado = product.stock <= 0;

        return (
            <View key={product.id} style={[styles.productCard, isAgotado && { opacity: 0.7 }]}>
                <View style={styles.productMainInfo}>
                    <View style={styles.productImageContainer}>
                        <Image
                            source={{ uri: product.image }}
                            style={[styles.productImage, isAgotado && { tintColor: 'gray' }]}
                            resizeMode="cover"
                        />
                        <View style={styles.imageBadgeContainer}>
                            {product.categoryDiscount > 0 && (
                                <View style={[styles.productImageBadge, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]}>
                                    <MaterialIcons name="local-offer" size={10} color="#b45309" />
                                    <Text style={[styles.imageBadgeText, { color: '#b45309' }]}>-{product.categoryDiscount}%</Text>
                                </View>
                            )}
                            {product.lineDiscount > 0 && (
                                <View style={[styles.productImageBadge, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
                                    <MaterialIcons name="auto-awesome" size={10} color="#166534" />
                                    <Text style={[styles.imageBadgeText, { color: '#166534' }]}>-{product.lineDiscount}%</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <View style={styles.productDetails}>
                        <Text style={styles.productTitle} numberOfLines={2}>
                            {product.title}
                        </Text>
                        <Text style={styles.productExpiry}>FV: {product.expiry}</Text>
                        <View style={styles.productPriceRow}>
                            <Text style={styles.productPrice}>{product.price}</Text>
                            <View style={styles.stockContainer}>
                                <View style={styles.stockItem}>
                                    <Text style={styles.stockLabel}>TACH:</Text>
                                    <Text style={[styles.stockValue, product.stock_tachira <= 0 && styles.stockAgotadoText]}>
                                        {product.stock_tachira}
                                    </Text>
                                </View>
                                <View style={styles.stockItem}>
                                    <Text style={styles.stockLabel}>BARQ:</Text>
                                    <Text style={[styles.stockValue, product.stock_barquisimeto <= 0 && styles.stockAgotadoText]}>
                                        {product.stock_barquisimeto}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {!isAgotado && (
                    <View style={styles.productActionRow}>
                        <View style={styles.quantitySection}>
                            <Text style={styles.quantityLabel}>CANT.</Text>
                            <View style={styles.quantitySelector}>
                                <TouchableOpacity style={styles.quantityButton} onPress={() => handleDecrement(product)}>
                                    <MaterialIcons name="remove" size={16} color="#007a5e" />
                                </TouchableOpacity>
                                <Text style={styles.quantityText}>{product.quantity}</Text>
                                <TouchableOpacity style={[styles.quantityButton, styles.quantityButtonActive]} onPress={() => handleIncrement(product)}>
                                    <MaterialIcons name="add" size={16} color="#ffffff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.subtotalSection}>
                            <Text style={styles.subtotalLabel}>SUBTOTAL</Text>
                            <Text style={styles.subtotalValue}>
                                {(product.priceNum * product.quantity).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    const renderProductItem = ({ item }) => renderProductCard(item);

    // ListHeader removed from here and extracted below to 'MontarPedidoListHeader'
    // This fixes the keyboard dismissal bug by ensuring the component type remains stable across renders.

    const ListEmpty = () => {
        if (loading) {
            return (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <ActivityIndicator size="large" color="#007a5e" />
                    <Text style={{ color: '#94a3b8', marginTop: 12 }}>Cargando catálogo...</Text>
                </View>
            );
        }
        return (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
                <MaterialIcons name="shopping-basket" size={64} color="#e2e8f0" />
                <Text style={{ color: '#94a3b8', marginTop: 12 }}>
                    {searchQuery ? "No se encontraron coincidencias" : "No hay productos disponibles"}
                </Text>
            </View>
        );
    };

    const renderClientItem = ({ item }) => {
        const clientName = item.cli_des || item.TITLE || "Cliente Desconocido";
        const avatarColor = getAvatarColor(clientName);

        return (
            <TouchableOpacity
                style={styles.clientCard}
                onPress={() => handleSelectClient(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.clientAvatarContainer, { backgroundColor: avatarColor }]}>
                    <MaterialIcons name="local-hospital" size={24} color="#ffffff" />
                </View>

                <View style={styles.clientContent}>
                    <View style={styles.clientMainRow}>
                        <Text style={styles.clientName} numberOfLines={1}>{clientName}</Text>
                        <MaterialIcons name="chevron-right" size={20} color="#cbd5e1" />
                    </View>

                    <View style={styles.clientDivider} />

                    <View style={styles.clientDetailsGrid}>
                        <View style={styles.clientDetailItem}>
                            <MaterialIcons name="fingerprint" size={14} color="#94a3b8" />
                            <Text style={styles.clientDetailValue}>{item.co_cli}</Text>
                        </View>

                        {item.login !== undefined && (
                            <View style={styles.clientDetailItem}>
                                <Ionicons name="wallet-outline" size={14} color="#007a5e" />
                                <Text style={[styles.clientDetailValue, { color: '#007a5e', fontWeight: 'bold' }]}>
                                    {parseFloat(item.login).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                </Text>
                            </View>
                        )}

                        {item.desc_glob !== undefined && parseFloat(item.desc_glob) > 0 && (
                            <View style={[styles.clientDetailItem, styles.clientDiscountTag]}>
                                <MaterialIcons name="local-offer" size={12} color="#b45309" />
                                <Text style={styles.clientDiscountText}>
                                    {item.desc_glob}% OFF
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Status indicator bar */}
                <View style={[styles.clientStatusBar, { backgroundColor: avatarColor }]} />
            </TouchableOpacity>
        );
    };

    // Client Selection View
    if (!selectedClient) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <MaterialIcons name="arrow-back-ios" size={20} color="#64748b" />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerTitle}>PEDIDOS</Text>
                            <Text style={styles.headerSubtitle}>SELECCIONAR CLIENTE</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.searchContainer}>
                    <View style={styles.searchInputWrapper}>
                        <MaterialIcons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar cliente..."
                            placeholderTextColor="#94a3b8"
                            value={clientSearch}
                            onChangeText={handleClientSearch}
                        />
                        {clientSearch.length > 0 && (
                            <TouchableOpacity onPress={() => handleClientSearch('')}>
                                <MaterialIcons name="close" size={20} color="#94a3b8" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <FlatList
                    data={filteredClients}
                    renderItem={renderClientItem}
                    keyExtractor={(item) => String(item.co_cli)}
                    contentContainerStyle={styles.clientScrollContent}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            {loadingClients ? (
                                <ActivityIndicator size="large" color="#007a5e" />
                            ) : (
                                <Text style={{ color: '#94a3b8' }}>No se encontraron clientes</Text>
                            )}
                        </View>
                    }
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Custom Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={handleBackToClients} style={styles.backButton}>
                        <MaterialIcons name="arrow-back-ios" size={20} color="#64748b" />
                    </TouchableOpacity>
                    <View style={{ justifyContent: 'center' }}>
                        <Text style={styles.headerTitle}>PEDIDOS</Text>
                        <Text style={styles.headerSubtitle} numberOfLines={1}>
                            {selectedClient?.cli_des || "Cliente Seleccionado"}
                        </Text>
                    </View>
                </View>
            </View>

            <MontarPedidoListHeader
                searchQuery={searchQuery}
                onSearch={handleSearch}
                selectedClient={selectedClient}
            />

            <FlatList
                style={styles.mainScroll}
                data={products}
                renderItem={renderProductItem}
                keyExtractor={(item) => String(item.id)}
                ListEmptyComponent={ListEmpty}
                contentContainerStyle={styles.scrollContent}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
            />

            {/* Floating Action Button - Replaces Bottom Bar */}
            <TouchableOpacity style={styles.fab} onPress={() => setCartModalVisible(true)}>
                <View style={styles.fabIconContainer}>
                    <MaterialIcons name="shopping-cart" size={28} color="#ffffff" />
                    {cartItemsCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{cartItemsCount}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            <CartModal
                visible={cartModalVisible}
                onClose={() => setCartModalVisible(false)}
                cartItems={cart}
                total={cartTotal}
                paymentTimes={paymentTimes}
                selectedDiscounts={selectedDiscounts}
                onSelectDiscounts={setSelectedDiscounts}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
                onConfirmOrder={handleConfirmOrder}
                confirmingOrder={confirmingOrder}
            />
        </SafeAreaView>
    );
};


// Extracted Header Component
const MontarPedidoListHeader = ({
    searchQuery,
    onSearch,
    selectedClient
}) => {
    return (
        <View>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                    <MaterialIcons name="inventory-2" size={20} color="#94a3b8" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar producto por nombre..."
                        placeholderTextColor="#94a3b8"
                        value={searchQuery}
                        onChangeText={onSearch}
                    />
                </View>
            </View>

            {selectedClient?.desc_glob > 0 && (
                <View style={styles.globalDiscountBanner}>
                    <MaterialIcons name="local-offer" size={16} color="#007a5e" />
                    <Text style={styles.globalDiscountText}>
                        Precios con Descuento Global del {selectedClient.desc_glob}% aplicado
                    </Text>
                </View>
            )}
        </View>
    );
};

// Cart Modal Component
const CartModal = ({
    visible,
    onClose,
    cartItems,
    total,
    paymentTimes,
    selectedDiscounts,
    onSelectDiscounts,
    onIncrement,
    onDecrement,
    onConfirmOrder,
    confirmingOrder
}) => {

    const handleToggleDiscount = (item) => {
        const isDivisaBE = item.tiempo.toUpperCase().includes('DIVISA EN B/E');
        const isAlreadySelected = selectedDiscounts.some(d => d.id === item.id);

        if (isAlreadySelected) {
            onSelectDiscounts(selectedDiscounts.filter(d => d.id !== item.id));
        } else {
            if (isDivisaBE) {
                // DIVISA EN B/E can always be added
                onSelectDiscounts([...selectedDiscounts, item]);
            } else {
                // Other discounts are mutually exclusive: 
                // Remove any existing non-DIVISA-BE discount and add this one
                const otherDiscounts = selectedDiscounts.filter(d =>
                    d.tiempo.toUpperCase().includes('DIVISA EN B/E')
                );
                onSelectDiscounts([...otherDiscounts, item]);
            }
        }
    };

    // Sequential Calculation: DIVISA EN B/E first, then others
    let tempTotal = total;

    // 1. Separate DIVISA EN B/E from others
    const divisaBEDiscount = selectedDiscounts.find(d => d.tiempo.toUpperCase().includes('DIVISA EN B/E'));
    const otherDiscounts = selectedDiscounts.filter(d => !d.tiempo.toUpperCase().includes('DIVISA EN B/E'));

    // 2. Apply DIVISA EN B/E first if selected
    if (divisaBEDiscount) {
        tempTotal = tempTotal * (1 - parseFloat(divisaBEDiscount.porcentaje) / 100);
    }

    // 3. Apply other discounts to the remaining balance
    otherDiscounts.forEach(d => {
        tempTotal = tempTotal * (1 - parseFloat(d.porcentaje) / 100);
    });

    const finalTotal = tempTotal;
    const discountAmount = total - finalTotal;
    const totalDiscountPercentageText = selectedDiscounts.length > 1
        ? `${selectedDiscounts.map(d => `${d.porcentaje}%`).join(' + ')} (Secuencial)`
        : `${selectedDiscounts[0]?.porcentaje || 0}%`;

    const renderDiscountCard = (item) => {
        const isSelected = selectedDiscounts.some(d => d.id === item.id);
        const colorType = item.tiempo.toUpperCase().includes('DIVISA') ? 'amber' : 'default';

        let bgColor, textColor, borderColor, valueColor;

        if (colorType === 'amber') {
            bgColor = isSelected ? '#fff7ed' : '#fffbeb';
            textColor = '#b45309';
            borderColor = isSelected ? '#f97316' : '#fde68a';
            valueColor = '#92400e';
        } else {
            bgColor = isSelected ? '#f0fdf4' : '#ffffff';
            textColor = '#64748b';
            borderColor = isSelected ? '#22c55e' : '#e2e8f0';
            valueColor = '#007a5e';
        }

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleToggleDiscount(item)}
                style={[
                    styles.discountCard,
                    { backgroundColor: bgColor, borderColor: borderColor },
                    isSelected && { borderWidth: 2, shadowOpacity: 0.1 }
                ]}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={[styles.discountTag, { color: textColor }]} numberOfLines={2}>{item.tiempo}</Text>
                    {isSelected && (
                        <MaterialIcons name="check-circle" size={16} color={colorType === 'amber' ? '#f97316' : '#22c55e'} />
                    )}
                </View>
                <Text style={[styles.discountValue, { color: valueColor }]}>{item.porcentaje}%</Text>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Tu Pedido</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {/* Descuentos Section */}
                    <View style={styles.cartSection}>
                        <Text style={styles.sectionTitle}>Descuentos Adicionales (Tiempos de Pago)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cartDiscountsScroll}>
                            {paymentTimes.map((item) => (
                                <View key={item.id} style={{ marginRight: 8, paddingVertical: 4 }}>
                                    {renderDiscountCard(item)}
                                </View>
                            ))}
                        </ScrollView>
                        <Text style={styles.sectionSubtitle}>Selecciona un tiempo de pago para aplicar descuento extra</Text>
                    </View>

                    <FlatList
                        data={cartItems}
                        keyExtractor={(item) => String(item.id)}
                        contentContainerStyle={styles.cartListContent}
                        renderItem={({ item }) => (
                            <View style={styles.cartItem}>
                                <View style={styles.cartItemInfo}>
                                    <Text style={styles.cartItemTitle} numberOfLines={1}>{item.title}</Text>
                                    <View style={styles.cartItemPriceRow}>
                                        <Text style={styles.cartItemPrice}>{item.price}</Text>
                                        {(item.categoryDiscount > 0 || item.lineDiscount > 0) && (
                                            <View style={styles.cartItemBadges}>
                                                {item.categoryDiscount > 0 && (
                                                    <View style={[styles.miniBadge, styles.miniCategoryBadge]}>
                                                        <Text style={styles.miniBadgeText}>-{item.categoryDiscount}%</Text>
                                                    </View>
                                                )}
                                                {item.lineDiscount > 0 && (
                                                    <View style={[styles.miniBadge, styles.miniLineBadge]}>
                                                        <Text style={styles.miniBadgeText}>-{item.lineDiscount}%</Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                </View>
                                <View style={styles.cartQuantitySection}>
                                    <View style={styles.quantitySelectorSm}>
                                        <TouchableOpacity onPress={() => onDecrement(item)} style={styles.quantityButtonSm}>
                                            <MaterialIcons name={item.quantity === 1 ? "delete" : "remove"} size={14} color="#ef4444" />
                                        </TouchableOpacity>
                                        <Text style={styles.quantityTextSm}>{item.quantity}</Text>
                                        <TouchableOpacity onPress={() => onIncrement(item)} style={[styles.quantityButtonSm, styles.quantityButtonActiveSm]}>
                                            <MaterialIcons name="add" size={14} color="#ffffff" />
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={styles.cartItemSubtotal}>
                                        {((item.priceNum || 0) * item.quantity).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                    </Text>
                                </View>
                            </View>
                        )}
                        ListEmptyComponent={<Text style={styles.emptyCartText}>Tu carrito está vacío.</Text>}
                    />

                    <View style={styles.modalFooter}>
                        <View style={styles.summaryTable}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Subtotal Bruto</Text>
                                <Text style={styles.summaryValue}>{total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Text>
                            </View>

                            {selectedDiscounts.length > 0 && (
                                <View style={styles.summaryRow}>
                                    <Text style={[styles.summaryLabel, { color: '#b45309' }]}>
                                        Desc. Aplicados ({totalDiscountPercentageText})
                                    </Text>
                                    <Text style={[styles.summaryValue, { color: '#b45309' }]}>
                                        -{discountAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                    </Text>
                                </View>
                            )}

                            <View style={[styles.summaryRow, styles.totalFinalRow]}>
                                <Text style={styles.totalLabel}>TOTAL A PAGAR</Text>
                                <Text style={styles.totalFinalValue}>
                                    {finalTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.checkoutButton, confirmingOrder && styles.checkoutButtonDisabled]}
                            onPress={() => onConfirmOrder(finalTotal, discountAmount)}
                            disabled={confirmingOrder}
                        >
                            {confirmingOrder ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <>
                                    <Text style={styles.checkoutButtonText}>CONFIRMAR PEDIDO</Text>
                                    <MaterialIcons name="check-circle" size={20} color="#ffffff" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        marginRight: 4,
    },
    headerTitle: {
        fontSize: 14, // Reduced from 16
        fontWeight: 'bold',
        color: '#007a5e',
        lineHeight: 18, // Reduced from 20
    },
    headerSubtitle: {
        fontSize: 10, // Reduced from 11
        color: '#64748b',
        maxWidth: SCREEN_WIDTH * 0.6,
    },
    searchHeaderButton: {
        backgroundColor: '#f1f5f9',
        padding: 8,
        borderRadius: 20,
    },
    mainScroll: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 16,
        paddingBottom: 100, // Reduced from 150 since bottom bar is gone, but keeping some space for FAB
    },
    clientScrollContent: {
        paddingTop: 16,
        paddingBottom: 20, // Minimal padding for client list
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionSubtitle: {
        fontSize: 10,
        fontWeight: '500',
        color: '#94a3b8',
    },
    discountsScroll: {
        marginBottom: 16,
    },
    discountsContent: {
        paddingHorizontal: 16,
        paddingBottom: 4,
    },
    discountCard: {
        width: 128,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    discountTag: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    discountValue: {
        fontSize: 24,
        fontWeight: '900',
    },
    searchContainer: {
        paddingHorizontal: 16,
        marginBottom: 14,
        marginTop: 12,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 20,
        paddingHorizontal: 12,
        height: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1e293b',
    },
    categoryContainer: {
        marginBottom: 16,
    },
    categoryContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    categoryChipSelected: {
        backgroundColor: '#007a5e',
        borderColor: '#007a5e',
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
    },
    categoryTextSelected: {
        color: '#ffffff',
    },
    productsContainer: {
        paddingHorizontal: 16,
    },
    productCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginHorizontal: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    productMainInfo: {
        flexDirection: 'row',
        gap: 16,
    },
    productImageContainer: {
        width: 84,
        height: 84,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    imageBadgeContainer: {
        position: 'absolute',
        top: 4,
        left: 4,
        right: 4,
        flexDirection: 'column',
        gap: 4,
    },
    productImageBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 20,
        borderWidth: 1,
        alignSelf: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    imageBadgeText: {
        fontSize: 9,
        fontWeight: '900',
    },
    productDetails: {
        flex: 1,
    },
    productTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
        lineHeight: 18,
        marginBottom: 4,
    },
    productExpiry: {
        fontSize: 10,
        color: '#94a3b8',
        marginBottom: 8,
    },
    productPriceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    productPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#007a5e',
    },
    stockContainer: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 2,
    },
    stockItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    stockLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#64748b',
    },
    stockValue: {
        fontSize: 11,
        fontWeight: '800',
        color: '#007a5e',
        minWidth: 20,
        textAlign: 'right',
    },
    stockAgotadoText: {
        color: '#ef4444',
    },
    productActionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f8fafc',
    },
    quantitySection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    quantityLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#94a3b8',
        marginRight: 8,
    },
    quantitySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 20,
        padding: 4,
    },
    quantityButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    quantityButtonActive: {
        backgroundColor: '#007a5e',
    },
    quantityText: {
        width: 40,
        textAlign: 'center',
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    subtotalSection: {
        alignItems: 'flex-end',
    },
    subtotalLabel: {
        fontSize: 10,
        color: '#94a3b8',
    },
    subtotalValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#334155',
    },
    footerNoteContainerFixed: {
        paddingHorizontal: 24,
        marginTop: 8,
        marginBottom: 100, // Espacio para el bottomBar fijo
    },
    footerNote: {
        fontSize: 10,
        color: '#94a3b8',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        backdropFilter: 'blur(10px)',
    },
    summaryInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#94a3b8',
        textTransform: 'uppercase',
    },
    summaryValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    summaryAmount: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0f172a',
    },
    summaryUnits: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: '500',
    },
    savingsTag: {
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 20,
    },
    savingsText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#059669',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 8,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#64748b',
    },
    orderButton: {
        flex: 2,
        backgroundColor: '#007a5e',
        height: 52,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#007a5e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    orderButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#007a5e',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    fabIconContainer: {
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#007a5e',
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#f8fafc',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '90%',
        paddingBottom: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    closeButton: {
        padding: 4,
    },
    cartSection: {
        backgroundColor: '#ffffff',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    cartDiscountsScroll: {
        paddingLeft: 24,
        marginTop: 12,
        marginBottom: 8,
    },
    cartListContent: {
        padding: 24,
        paddingBottom: 100,
    },
    cartItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cartItemInfo: {
        flex: 1,
        marginRight: 16,
    },
    cartItemTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 2,
    },
    cartItemPriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cartItemPrice: {
        fontSize: 13,
        fontWeight: '500',
        color: '#64748b',
    },
    cartItemBadges: {
        flexDirection: 'row',
        gap: 4,
    },
    miniBadge: {
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
        borderWidth: 1,
    },
    miniCategoryBadge: {
        backgroundColor: '#fffbeb',
        borderColor: '#fde68a',
    },
    miniLineBadge: {
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
    },
    miniBadgeText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    cartQuantitySection: {
        alignItems: 'flex-end',
        gap: 4,
    },
    quantitySelectorSm: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        padding: 2,
    },
    cartItemSubtotal: {
        fontSize: 14,
        fontWeight: '700',
        color: '#007a5e',
    },
    quantityButtonSm: {
        width: 26,
        height: 26,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityButtonActiveSm: {
        backgroundColor: '#007a5e',
    },
    quantityTextSm: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 6,
        color: '#334155',
        textAlign: 'center',
        minWidth: 20,
    },
    modalFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        padding: 20,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingBottom: 34, // Safe area for modern phones
    },
    summaryTable: {
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#64748b',
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
    },
    totalFinalRow: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1e293b',
        textTransform: 'uppercase',
    },
    totalFinalValue: {
        fontSize: 24,
        fontWeight: '900',
        color: '#007a5e',
    },
    sectionSubtitle: {
        fontSize: 10,
        color: '#94a3b8',
        paddingHorizontal: 24,
        marginTop: 4,
    },
    checkoutButton: {
        backgroundColor: '#007a5e',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 16,
        gap: 10,
        shadowColor: '#007a5e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    checkoutButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    checkoutButtonDisabled: {
        backgroundColor: '#94a3b8',
        shadowOpacity: 0.1,
    },
    emptyCartText: {
        textAlign: 'center',
        color: '#94a3b8',
        marginTop: 40,
        fontSize: 16,
    },
    fabIconContainer: {
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#007a5e',
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    clientAvatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    clientCard: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        padding: 12,
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    clientAvatarContainer: {
        width: 52,
        height: 52,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    clientContent: {
        flex: 1,
    },
    clientMainRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    clientName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1e293b',
        flex: 1,
        marginRight: 8,
    },
    clientDivider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginBottom: 8,
    },
    clientDetailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
    },
    clientDetailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    clientDetailValue: {
        fontSize: 12,
        color: '#64748b',
    },
    clientDiscountTag: {
        backgroundColor: '#fffbeb',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#fde68a',
    },
    clientDiscountText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#b45309',
    },
    clientStatusBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        opacity: 0.8,
    },
    globalDiscountBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ecfdf5',
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#a7f3d0',
        gap: 8,
    },
    globalDiscountText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#047857',
    },
});

export default MontarPedidoScreen;
