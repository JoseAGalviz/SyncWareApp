import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
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
import { showMessage } from "react-native-flash-message";
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { API_ENDPOINTS, Config } from '../constants/Config';
import { api } from '../services/api';
import COLORS from '../constants/Colors';
import styles from '../styles/MontarPedidoScreen.styles';


const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AVATAR_COLORS = [
    '#6366f1', // indigo-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#f43f5e', // rose-500
    COLORS.WARNING, // amber-500
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

    const [cart, setCart] = useState([]);
    const [cartModalVisible, setCartModalVisible] = useState(false);
    const [selectedDiscounts, setSelectedDiscounts] = useState([]);
    const [confirmingOrder, setConfirmingOrder] = useState(false);

    // Product Detail State
    const [selectedProductForDetail, setSelectedProductForDetail] = useState(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);

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
            const clientesJson = await AsyncStorage.getItem('clientes');
            const allClients = clientesJson ? JSON.parse(clientesJson) : [];

            if (allClients.length === 0) {
                Alert.alert(
                    "Sin datos",
                    "No hay clientes en caché. Por favor sincroniza desde la pantalla de inicio."
                );
            }

            const filteredClients = allClients.filter(c =>
                c.co_cli && c.tipo !== 'bitrix'
            );

            console.log(`✅ ${filteredClients.length} clientes cargados en MontarPedidoScreen.`);
            if (filteredClients.length > 0) {
                console.log("Ejemplo de primer cliente:", JSON.stringify(filteredClients[0], null, 2));
            }

            setClients(filteredClients);
            setFilteredClients(filteredClients);
        } catch (error) {
            console.error("Error loading clients:", error);
            Alert.alert("Error", "No se pudieron leer los clientes del caché local.");
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
                const catDiscount = item.descuento_por_categoria || 0;
                const lineDiscount = item.descuento_por_linea || 0;
                // Paso 1: aplicar descuento por categoría del producto
                const priceAfterCategoryDiscount = basePrice * (1 - (catDiscount / 100));
                // Paso 2: sobre ese resultado, aplicar el descuento global del cliente
                const finalPrice = priceAfterCategoryDiscount * (1 - (globalDiscount / 100));
                const priceLabel = finalPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

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
                    priceNum: finalPrice, // Precio final con ambos descuentos aplicados
                    categoryDiscount: catDiscount,
                    lineDiscount: lineDiscount,
                    category: item.linea || item.categoria || 'General',
                    co_art: item.co_art || item.imagen,
                    marca: item.marca || 'N/A'
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
        if (product.quantity >= product.stock) {
            showMessage({
                message: "Stock insuficiente",
                description: `No puedes agregar más de la cantidad disponible (${product.stock})`,
                type: "warning",
                icon: "warning"
            });
            return;
        }
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

        // 1.5 Update selected product for detail if it's the one being modified
        if (selectedProductForDetail && selectedProductForDetail.id === product.id) {
            setSelectedProductForDetail({ ...selectedProductForDetail, quantity: selectedProductForDetail.quantity + 1 });
        }


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

        // 1.5 Update selected product for detail if it's the one being modified
        if (selectedProductForDetail && selectedProductForDetail.id === product.id) {
            setSelectedProductForDetail({ ...selectedProductForDetail, quantity: Math.max(0, selectedProductForDetail.quantity - 1) });
        }


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

    const handleQuantityChange = (product, text) => {
        let newQuantity = text === '' ? 0 : parseInt(text.replace(/[^0-9]/g, '')) || 0;

        if (newQuantity > product.stock) {
            newQuantity = product.stock;
            showMessage({
                message: "Límite de stock",
                description: `Cantidad ajustada al máximo disponible: ${product.stock}`,
                type: "info",
                icon: "info"
            });
        }

        // 1. Update Products State
        const updateP = (list) => list.map(p => p.id === product.id ? { ...p, quantity: newQuantity } : p);
        setProducts(updateP(products));
        setOriginalProducts(updateP(originalProducts));

        // Update selected product for detail if it's the one being modified
        if (selectedProductForDetail && selectedProductForDetail.id === product.id) {
            setSelectedProductForDetail({ ...selectedProductForDetail, quantity: newQuantity });
        }

        // 2. Update Cart State
        const inCart = cart.find(c => c.id === product.id);
        if (newQuantity > 0) {
            if (inCart) {
                setCart(cart.map(c => c.id === product.id ? { ...c, quantity: newQuantity } : c));
            } else {
                setCart([...cart, { ...product, quantity: newQuantity, priceNum: product.priceNum || parseFloat(product.price) }]);
            }
        } else {
            if (inCart) {
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

        const iva = tot_neto * Config.IVA;

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
            descrip: "Pedido realizado desde la APP",
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
            bgColor = COLORS.WHITE;
            textColor = '#64748b'; // slate-500
            borderColor = COLORS.BORDER; // slate-200
            valueColor = COLORS.PRIMARY; // primary
        }

        return (
            <View style={[styles.discountCard, { backgroundColor: bgColor, borderColor: borderColor }]}>
                <Text style={[styles.discountTag, { color: textColor }]}>{title}</Text>
                <Text style={[styles.discountValue, { color: colorType === 'amber' || colorType === 'emerald' ? valueColor : COLORS.PRIMARY }]}>{value}</Text>
            </View>
        );
    };

    const renderProductCard = (product) => {
        const isAgotado = product.stock <= 0;

        return (
            <View key={product.id} style={[styles.productCard, isAgotado && { opacity: 0.7 }]}>
                <TouchableOpacity
                    style={styles.productMainInfo}
                    onPress={() => {
                        setSelectedProductForDetail(product);
                        setDetailModalVisible(true);
                    }}
                    activeOpacity={0.7}
                >
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
                                    <Text style={[styles.imageBadgeText, { color: COLORS.SUCCESS }]}>-{product.lineDiscount}%</Text>
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
                </TouchableOpacity>

                {!isAgotado && (
                    <View style={styles.productActionRow}>
                        <View style={styles.quantitySection}>
                            <Text style={styles.quantityLabel}>CANT.</Text>
                            <View style={styles.quantitySelector}>
                                <TouchableOpacity style={styles.quantityButton} onPress={() => handleDecrement(product)}>
                                    <MaterialIcons name="remove" size={16} color={COLORS.PRIMARY} />
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.quantityText}
                                    value={String(product.quantity)}
                                    onChangeText={(text) => handleQuantityChange(product, text)}
                                    keyboardType="numeric"
                                    selectTextOnFocus={true}
                                />
                                <TouchableOpacity style={[styles.quantityButton, styles.quantityButtonActive]} onPress={() => handleIncrement(product)}>
                                    <MaterialIcons name="add" size={16} color={COLORS.WHITE} />
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
                    <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                    <Text style={{ color: COLORS.MUTED, marginTop: 12 }}>Cargando catálogo...</Text>
                </View>
            );
        }
        return (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
                <MaterialIcons name="shopping-basket" size={64} color={COLORS.BORDER} />
                <Text style={{ color: COLORS.MUTED, marginTop: 12 }}>
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
                    <MaterialIcons name="local-hospital" size={24} color={COLORS.WHITE} />
                </View>

                <View style={styles.clientContent}>
                    <View style={styles.clientMainRow}>
                        <Text style={styles.clientName} numberOfLines={1}>{clientName}</Text>
                        <MaterialIcons name="chevron-right" size={20} color={COLORS.BORDER} />
                    </View>

                    <View style={styles.clientDivider} />

                    <View style={styles.clientDetailsGrid}>
                        <View style={styles.clientDetailItem}>
                            <MaterialIcons name="fingerprint" size={14} color={COLORS.MUTED} />
                            <Text style={styles.clientDetailValue}>{item.co_cli}</Text>
                        </View>

                        {item.login != null && (
                            <View style={styles.clientDetailItem}>
                                <Ionicons name="wallet-outline" size={14} color={COLORS.PRIMARY} />
                                <Text style={[styles.clientDetailValue, { color: COLORS.PRIMARY, fontWeight: 'bold' }]}>
                                    {parseFloat(item.login).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                </Text>
                            </View>
                        )}

                        {parseFloat(item.desc_glob || 0) > 0 && (
                            <View style={[styles.clientDetailItem, styles.clientDiscountTag]}>
                                <MaterialIcons name="local-offer" size={12} color="#b45309" />
                                <Text style={styles.clientDiscountText}>
                                    {Math.round(parseFloat(item.desc_glob))}% DESC
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
                        <MaterialIcons name="search" size={20} color={COLORS.MUTED} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar cliente..."
                            placeholderTextColor={COLORS.MUTED}
                            value={clientSearch}
                            onChangeText={handleClientSearch}
                        />
                        {clientSearch.length > 0 && (
                            <TouchableOpacity onPress={() => handleClientSearch('')}>
                                <MaterialIcons name="close" size={20} color={COLORS.MUTED} />
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
                                <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                            ) : (
                                <Text style={{ color: COLORS.MUTED }}>No se encontraron clientes</Text>
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
                    <MaterialIcons name="shopping-cart" size={28} color={COLORS.WHITE} />
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
                onQuantityChange={handleQuantityChange}
                onConfirmOrder={handleConfirmOrder}
                confirmingOrder={confirmingOrder}
            />

            <ProductDetailModal
                visible={detailModalVisible}
                onClose={() => setDetailModalVisible(false)}
                product={selectedProductForDetail}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
                onQuantityChange={handleQuantityChange}
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
                    <MaterialIcons name="inventory-2" size={20} color={COLORS.MUTED} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar producto por nombre..."
                        placeholderTextColor={COLORS.MUTED}
                        value={searchQuery}
                        onChangeText={onSearch}
                    />
                </View>
            </View>

            {selectedClient?.desc_glob > 0 && (
                <View style={styles.globalDiscountBanner}>
                    <MaterialIcons name="local-offer" size={16} color={COLORS.PRIMARY} />
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
    onQuantityChange,
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
            bgColor = isSelected ? '#f0fdf4' : COLORS.WHITE;
            textColor = '#64748b';
            borderColor = isSelected ? '#22c55e' : COLORS.BORDER;
            valueColor = COLORS.PRIMARY;
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
                        style={{ flex: 1 }}
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
                                        <TextInput
                                            style={styles.quantityTextSm}
                                            value={String(item.quantity)}
                                            onChangeText={(text) => onQuantityChange(item, text)}
                                            keyboardType="numeric"
                                            selectTextOnFocus={true}
                                        />
                                        <TouchableOpacity onPress={() => onIncrement(item)} style={[styles.quantityButtonSm, styles.quantityButtonActiveSm]}>
                                            <MaterialIcons name="add" size={14} color={COLORS.WHITE} />
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
                                <ActivityIndicator size="small" color={COLORS.WHITE} />
                            ) : (
                                <>
                                    <Text style={styles.checkoutButtonText}>CONFIRMAR PEDIDO</Text>
                                    <MaterialIcons name="check-circle" size={20} color={COLORS.WHITE} />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// Product Detail Modal Component
const ProductDetailModal = ({
    visible,
    onClose,
    product,
    onIncrement,
    onDecrement,
    onQuantityChange
}) => {
    if (!product) return null;

    const isAgotado = product.stock <= 0;

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { height: 'auto', maxHeight: '85%' }]}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>Detalle de Producto</Text>
                            <Text style={styles.modalSubtitle}>COD: {product.co_art}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.detailScrollContent}>
                        <View style={styles.detailImageContainer}>
                            <Image
                                source={{ uri: product.image }}
                                style={styles.detailImage}
                                resizeMode="contain"
                            />
                            {isAgotado && (
                                <View style={styles.detailAgotadoBadge}>
                                    <Text style={styles.detailAgotadoText}>AGOTADO</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.detailInfoSection}>
                            <Text style={styles.detailTitle}>{product.title}</Text>

                            <View style={styles.detailMetaData}>
                                <View style={styles.detailMetaItem}>
                                    <Text style={styles.detailMetaLabel}>Categoría</Text>
                                    <Text style={styles.detailMetaValue}>{product.category}</Text>
                                </View>
                                <View style={styles.detailMetaItem}>
                                    <Text style={styles.detailMetaLabel}>Marca</Text>
                                    <Text style={styles.detailMetaValue}>{product.marca}</Text>
                                </View>
                                <View style={styles.detailMetaItem}>
                                    <Text style={styles.detailMetaLabel}>Vencimiento</Text>
                                    <Text style={styles.detailMetaValue}>{product.expiry}</Text>
                                </View>
                            </View>

                            <View style={styles.detailPriceSection}>
                                <View>
                                    <Text style={styles.detailPriceLabel}>Precio Unitario</Text>
                                    <Text style={styles.detailPriceValue}>{product.price}</Text>
                                </View>
                                <View style={styles.detailBadgeRow}>
                                    {product.categoryDiscount > 0 && (
                                        <View style={[styles.productImageBadge, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]}>
                                            <MaterialIcons name="local-offer" size={14} color="#b45309" />
                                            <Text style={[styles.imageBadgeText, { color: '#b45309', fontSize: 12 }]}>-{product.categoryDiscount}% Cat.</Text>
                                        </View>
                                    )}
                                    {product.lineDiscount > 0 && (
                                        <View style={[styles.productImageBadge, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
                                            <MaterialIcons name="auto-awesome" size={14} color="#166534" />
                                            <Text style={[styles.imageBadgeText, { color: COLORS.SUCCESS, fontSize: 12 }]}>-{product.lineDiscount}% Línea</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <View style={styles.detailStockSection}>
                                <Text style={styles.detailSectionTitle}>Disponibilidad en Almacenes</Text>
                                <View style={styles.detailStockGrid}>
                                    <View style={styles.detailStockCard}>
                                        <Text style={styles.detailStockWarehouse}>TACHIRA</Text>
                                        <Text style={[styles.detailStockLarge, product.stock_tachira <= 0 && styles.stockAgotadoText]}>
                                            {product.stock_tachira}
                                        </Text>
                                        <Text style={styles.detailStockUnit}>UNIDADES</Text>
                                    </View>
                                    <View style={styles.detailStockCard}>
                                        <Text style={styles.detailStockWarehouse}>BARQUISIMETO</Text>
                                        <Text style={[styles.detailStockLarge, product.stock_barquisimeto <= 0 && styles.stockAgotadoText]}>
                                            {product.stock_barquisimeto}
                                        </Text>
                                        <Text style={styles.detailStockUnit}>UNIDADES</Text>
                                    </View>
                                </View>
                                <View style={styles.detailTotalStock}>
                                    <Text style={styles.detailTotalLabel}>STOCK TOTAL DISPONIBLE:</Text>
                                    <Text style={styles.detailTotalValue}>{product.stock}</Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {!isAgotado && (
                        <View style={styles.detailActionFooter}>
                            <View style={styles.detailQuantityWrapper}>
                                <TouchableOpacity style={styles.detailQuantityBtn} onPress={() => onDecrement(product)}>
                                    <MaterialIcons name="remove" size={24} color={COLORS.PRIMARY} />
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.detailQuantityInput}
                                    value={String(product.quantity)}
                                    onChangeText={(text) => onQuantityChange(product, text)}
                                    keyboardType="numeric"
                                    selectTextOnFocus={true}
                                />
                                <TouchableOpacity style={[styles.detailQuantityBtn, styles.detailQuantityBtnActive]} onPress={() => onIncrement(product)}>
                                    <MaterialIcons name="add" size={24} color={COLORS.WHITE} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.detailSubtotalWrapper}>
                                <Text style={styles.detailSubtotalLabel}>SUBTOTAL</Text>
                                <Text style={styles.detailSubtotalValue}>
                                    {(product.priceNum * product.quantity).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};


export default MontarPedidoScreen;
