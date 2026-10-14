import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, Image, Keyboard,
} from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { File } from 'expo-file-system';
import styles from '../styles/Devoluciones.styles';
import Theme from '../constants/Theme';
import { Config } from '../constants/Config';
import { useAuth } from '../context/AuthContext';
import { DevolucionesService } from '../services/devolucionesService';
import { encolarDevolucion, sincronizarPendientes, obtenerDevoluciones } from '../services/devolucionesQueue';
import { TIPOS_NOVEDAD, CLAVES_OBSERVACION, MAX_FOTOS } from '../constants/devoluciones';

const MAX_RESULTADOS_ARTICULOS = 25;
// Facturas que se muestran por artículo (las más recientes con cupo). El
// reparto puede tomar más si la cantidad no alcanza en estas.
const FACTURAS_VISIBLES = 3;

// Reparte `cantidad` entre las facturas del artículo: primero las que el
// operador eligió a mano (`preferidas`, en ese orden), luego el resto de la
// más reciente a la más vieja, tomando de cada una hasta su cupo. Las
// `excluidas` a mano se saltan. Con `soloPreferidas` (el operador eligió las
// facturas al agregar) no se toca ninguna otra. `faltante` > 0 = no hay cupo
// suficiente.
function repartir(facturas, cantidad, preferidas = [], excluidas = [], soloPreferidas = false) {
  const elegidas = preferidas.map((n) => facturas.find((f) => f.fact_num === n)).filter(Boolean);
  const orden = soloPreferidas && elegidas.length
    ? elegidas
    : [...elegidas, ...facturas.filter((f) => !preferidas.includes(f.fact_num))];
  let resta = cantidad;
  const lineas = [];
  for (const f of orden) {
    if (resta <= 0) break;
    if (!f.disponible || excluidas.includes(f.fact_num)) continue;
    const n = Math.min(resta, f.disponible);
    lineas.push({ factura: f, cantidad: n });
    resta -= n;
  }
  return { lineas, faltante: Math.max(0, resta) };
}

function normalizar(texto) {
  const s = String(texto || '').toLowerCase();
  return typeof s.normalize === 'function' ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s;
}

// "500 mg" debe encontrar "500MG" y "500 MG", pero no "2500MG".
function regexConcentracion(texto) {
  const q = normalizar(texto).replace(/\s+/g, '').replace(',', '.');
  if (!q) return null;
  const escapado = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^0-9.])${escapado}`);
}

// Valores sugeribles de cada artículo, sacados de art_des con el formato de
// Profit: "PRINCIPIO 650MG (COMERCIAL) CJ X 10 TABL (LABORATORIO) FV. ..."
const RE_CONCENTRACION = /\d+(?:[.,]\d+)?\s*(?:MCG|MG|G|ML|UI|MEQ|%)(?:\s*\/\s*\d*(?:[.,]\d+)?\s*(?:ML|MG|G|DOSIS))?/g;

function valoresSugeribles(a) {
  const des = String(a.art_des || '').toUpperCase().trim();
  const parentesis = [...des.matchAll(/\(([^)]+)\)/g)].map((m) => m[1].trim()).filter((t) => !/^\d/.test(t));
  const principio = des.split(/\s\d|\(/)[0].trim();
  const nombre = [principio];
  if (parentesis.length >= 2) nombre.push(parentesis[0]); // el último paréntesis es el laboratorio
  const marca = a.marca || parentesis[parentesis.length - 1];
  return {
    nombre: nombre.filter((v) => v.length >= 3),
    marca: marca ? [marca] : [],
    concentracion: [...new Set((des.match(RE_CONCENTRACION) || []).map((c) => c.replace(/\s+/g, '')))],
  };
}

const MAX_SUGERENCIAS = 6;

const FILTROS_VACIOS = { nombre: '', marca: '', concentracion: '' };
const CAMPOS_FILTRO = [
  { campo: 'nombre', etiqueta: 'Nombre comercial o principio activo', placeholder: 'Ej. atamel, acetaminofen (o código)' },
  { campo: 'marca', etiqueta: 'Marca o laboratorio', placeholder: 'Ej. calox, genven' },
  { campo: 'concentracion', etiqueta: 'Concentración', placeholder: 'Ej. 500 mg, 5mg/ml' },
];

// Un predicado por campo; un campo vacío deja pasar todo.
function crearPredicados(filtros) {
  const nombre = normalizar(filtros.nombre.trim());
  const palabrasNombre = nombre.split(/\s+/).filter(Boolean);
  const palabrasMarca = normalizar(filtros.marca.trim()).split(/\s+/).filter(Boolean);
  const reConcentracion = regexConcentracion(filtros.concentracion);
  return {
    nombre: (a) => !palabrasNombre.length
      || (a.codigo_barras && a.codigo_barras.startsWith(nombre))
      || palabrasNombre.every((p) => a._nombre.includes(p)),
    marca: (a) => palabrasMarca.every((p) => a._marca.includes(p)),
    concentracion: (a) => !reConcentracion || reConcentracion.test(a._sinEspacios),
  };
}

function filtrarArticulos(articulosIndexados, filtros) {
  const pred = crearPredicados(filtros);
  return articulosIndexados.filter((a) => CAMPOS_FILTRO.every((c) => pred[c.campo](a)));
}

// "Laboratorios Leti C.A." -> "leti": en Profit la marca es solo el nombre.
const PALABRAS_RELLENO_LAB = new Set(['laboratorio', 'laboratorios', 'lab', 'labs', 'ca', 'c.a', 'c.a.', 'sa', 's.a', 's.a.', 'de', 'del', 'la', 'los']);
function limpiarLaboratorio(texto) {
  return normalizar(texto).split(/\s+/).filter((p) => p && !PALABRAS_RELLENO_LAB.has(p)).join(' ');
}

// Lectura del OCR -> filtros. Si el código de barras está entre lo facturado,
// va directo; si no, se prueban combinaciones de lo leído de la más completa a
// la más suelta y se queda la primera que encuentre algo (el empaque y Profit
// no siempre escriben igual el nombre comercial o el laboratorio).
function filtrosDesdeOcr(lectura, articulosIndexados) {
  const codigo = lectura?.codigo_barras;
  if (codigo && articulosIndexados.some((a) => a.codigo_barras === codigo)) {
    return { ...FILTROS_VACIOS, nombre: codigo };
  }
  const nombres = [lectura?.principio_activo, lectura?.nombre_comercial].filter(Boolean);
  const marca = lectura?.laboratorio ? limpiarLaboratorio(lectura.laboratorio) : '';
  const concentracion = lectura?.concentracion || '';
  const combinaciones = [];
  for (const conMarca of [true, false]) {
    for (const conConcentracion of [true, false]) {
      for (const nombre of nombres.length ? nombres : ['']) {
        combinaciones.push({ nombre, marca: conMarca ? marca : '', concentracion: conConcentracion ? concentracion : '' });
      }
    }
  }
  const utiles = combinaciones.filter((f) => Object.values(f).some((v) => v.trim()));
  return utiles.find((f) => filtrarArticulos(articulosIndexados, f).length) || utiles[0] || null;
}

// Profit guarda porc_desc como "0.00+15,00+0.00" (separador decimal mixto).
function textoDescuento(porcDesc) {
  const partes = String(porcDesc || '').split('+').map((p) => Number(p.replace(',', '.')) || 0).filter((n) => n > 0);
  return partes.length ? `Desc. ${partes.map((n) => `${n}%`).join(' + ')}` : 'Sin desc.';
}

function formatoMonto(n) {
  const [entero, decimales] = (Number(n) || 0).toFixed(2).split('.');
  return `${entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimales}`;
}

// Mismo catálogo que Montar Pedido (Config.IMAGES_BASE_URL). Los códigos que
// terminan en letra son variantes y usan la imagen del código base (CR000012C
// da 404, CR000012 da la imagen) — mismo criterio que sistema_operaciones. No
// se usa bimagenes.cristmedicals.com:13443 como allá: no envía el certificado
// intermedio y Android rechaza la conexión.
function imagenArticulo(coArt) {
  const codigo = String(coArt || '').replace(/\s+/g, '');
  const base = /[0-9]$/.test(codigo) ? codigo : codigo.slice(0, -1);
  return `${Config.IMAGES_BASE_URL}/imagenes-v3/imagenes/${base}.jpg`;
}

function ImagenArticulo({ coArt }) {
  const [fallo, setFallo] = useState(false);
  useEffect(() => { setFallo(false); }, [coArt]);
  if (fallo) {
    return (
      <View style={[styles.imagenArticulo, styles.imagenArticuloVacia]}>
        <Ionicons name="image-outline" size={36} color={Theme.colors.light} />
        <Text style={styles.filaDetalle}>Sin imagen</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: imagenArticulo(coArt) }}
      style={styles.imagenArticulo}
      resizeMode="contain"
      onError={() => setFallo(true)}
    />
  );
}

function fechaCorta(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

// Elige la resolución más chica con lado mayor >= 1280px: las fotos viajan
// en base64 dentro del JSON, a resolución completa pesarían varios MB cada una.
function elegirTamanoFoto(tamanos) {
  const parseados = (tamanos || [])
    .map((t) => {
      const m = /^(\d+)x(\d+)$/.exec(t);
      return m ? { t, lado: Math.max(Number(m[1]), Number(m[2])) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.lado - b.lado);
  return (parseados.find((p) => p.lado >= 1280) || parseados[parseados.length - 1])?.t;
}

function CamaraModal({ visible, onCerrar, onFoto }) {
  const camaraRef = useRef(null);
  const [tamano, setTamano] = useState(undefined);
  const [tomando, setTomando] = useState(false);

  const onListo = useCallback(async () => {
    try {
      const tamanos = await camaraRef.current?.getAvailablePictureSizesAsync();
      const elegido = elegirTamanoFoto(tamanos);
      if (elegido) setTamano(elegido);
    } catch (e) {
      // Sin lista de tamaños se usa el default de la cámara.
    }
  }, []);

  const disparar = useCallback(async () => {
    if (!camaraRef.current || tomando) return;
    setTomando(true);
    try {
      const foto = await camaraRef.current.takePictureAsync({ quality: 0.5, shutterSound: false });
      onFoto(foto.uri);
    } catch (e) {
      showMessage({ message: 'No se pudo tomar la foto', description: e.message, type: 'danger' });
    } finally {
      setTomando(false);
    }
  }, [onFoto, tomando]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCerrar}>
      <View style={styles.camaraContenedor}>
        {visible ? (
          <CameraView
            ref={camaraRef}
            style={styles.camara}
            facing="back"
            pictureSize={tamano}
            onCameraReady={onListo}
          />
        ) : null}
        <View style={styles.camaraBarra}>
          <TouchableOpacity onPress={onCerrar}>
            <Ionicons name="close" size={32} color={Theme.colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.disparador, tomando && styles.buttonDisabled]} onPress={disparar} disabled={tomando} />
          <View style={{ width: 32 }} />
        </View>
      </View>
    </Modal>
  );
}

export default function DevolucionNuevaScreen({ navigation }) {
  const { user } = useAuth();
  const [permisoCamara, pedirPermisoCamara] = useCameraPermissions();

  const [tipo, setTipo] = useState('Reposicion');
  const [clave, setClave] = useState(null);

  // 'cliente' = se busca el cliente y se eligen artículos de todo su año.
  // 'factura' = se busca una factura puntual; ella define el cliente.
  const [modo, setModo] = useState('cliente');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientes, setClientes] = useState([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [busquedaFactura, setBusquedaFactura] = useState('');
  const [buscandoFactura, setBuscandoFactura] = useState(false);
  const [cliente, setCliente] = useState(null);
  const [facturaFija, setFacturaFija] = useState(null); // modo 'factura'

  const [articulos, setArticulos] = useState([]); // facturado al cliente (o la factura buscada)
  const [cargandoArticulos, setCargandoArticulos] = useState(false);
  // Unidades de novedades de este cliente que siguen en la cola local sin
  // enviar: el servidor todavía no las cuenta como devueltas. 'fact|co_art' -> und
  const [pendientesLocales, setPendientesLocales] = useState(() => new Map());
  // Lo que le van pidiendo al operador, campo por campo; se combinan con AND.
  // El OCR de la foto del empaque llena estos mismos campos.
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [campoEnfocado, setCampoEnfocado] = useState(null); // muestra sugerencias de ese campo
  // Artículos desplegados en la lista (imagen + facturas); pueden ser varios.
  const [desplegados, setDesplegados] = useState(() => new Set());
  const [leyendoFoto, setLeyendoFoto] = useState(false);
  const [camaraOcrVisible, setCamaraOcrVisible] = useState(false);
  const [lecturaOcr, setLecturaOcr] = useState(null); // texto leído, para el aviso
  // Cantidad tipeada en cada artículo desplegado, antes de agregarlo. co_art -> texto
  const [cantidadesInput, setCantidadesInput] = useState({});
  // Facturas elegidas a mano en el artículo desplegado (si no hay, reparto
  // automático). Se usan primero, de la más reciente a la más vieja. co_art -> [fact_num]
  const [facturasElegidas, setFacturasElegidas] = useState({});

  // Un renglón por artículo: [{ co_art, cantidad (texto), preferidas: [fact_num],
  // excluidas: [fact_num] }]. Las facturas salen del reparto automático.
  const [seleccion, setSeleccion] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [camaraVisible, setCamaraVisible] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const claves = CLAVES_OBSERVACION[tipo];
  const claveElegida = claves.find((c) => c.clave === clave) || null;
  const [selectClaveVisible, setSelectClaveVisible] = useState(false);

  // --- Cliente / factura -----------------------------------------------------
  useEffect(() => {
    if (cliente || modo !== 'cliente') return undefined;
    const q = busquedaCliente.trim();
    if (q.length < 3) { setClientes([]); return undefined; }
    let vigente = true;
    const t = setTimeout(async () => {
      setBuscandoClientes(true);
      try {
        const res = await DevolucionesService.buscarClientes(q);
        if (vigente) setClientes(res?.items || []);
      } catch (e) {
        if (vigente) showMessage({ message: 'Error buscando cliente', description: e.data?.error || e.message, type: 'danger' });
      } finally {
        if (vigente) setBuscandoClientes(false);
      }
    }, 400);
    return () => { vigente = false; clearTimeout(t); };
  }, [busquedaCliente, cliente, modo]);

  useEffect(() => {
    if (!cliente) { setPendientesLocales(new Map()); return undefined; }
    let vigente = true;
    obtenerDevoluciones()
      .then((lista) => {
        const mapa = new Map();
        for (const d of lista) {
          if (d.status !== 'pendiente' || d.co_cli !== cliente.co_cli) continue;
          for (const p of d.productos) {
            const k = `${d.factura_numero}|${p.co_art}`;
            mapa.set(k, (mapa.get(k) || 0) + (Number(p.cantidad_afectada) || 0));
          }
        }
        if (vigente) setPendientesLocales(mapa);
      })
      .catch(() => {});
    return () => { vigente = false; };
  }, [cliente]);

  const reiniciarArticulos = () => {
    setArticulos([]); setSeleccion([]); setCantidadesInput({}); setFacturasElegidas({});
    setFiltros(FILTROS_VACIOS); setDesplegados(new Set()); setLecturaOcr(null);
  };

  const elegirCliente = useCallback(async (c) => {
    setCliente(c);
    setFacturaFija(null);
    setClientes([]);
    reiniciarArticulos();
    setCargandoArticulos(true);
    try {
      const res = await DevolucionesService.articulosCliente(c.co_cli);
      setArticulos(res?.items || []);
    } catch (e) {
      showMessage({ message: 'No se pudieron cargar las facturas', description: e.data?.error || e.message, type: 'danger' });
    } finally {
      setCargandoArticulos(false);
    }
  }, []);

  const buscarFactura = useCallback(async () => {
    const n = busquedaFactura.trim();
    if (!/^\d+$/.test(n)) {
      showMessage({ message: 'Escribe el número de la factura', type: 'warning' });
      return;
    }
    Keyboard.dismiss();
    setBuscandoFactura(true);
    try {
      const res = await DevolucionesService.factura(n);
      reiniciarArticulos();
      setCliente(res.cliente);
      setFacturaFija(res.fact_num);
      setArticulos(res.items || []);
    } catch (e) {
      showMessage({ message: 'No se pudo cargar la factura', description: e.data?.error || e.message, type: 'danger' });
    } finally {
      setBuscandoFactura(false);
    }
  }, [busquedaFactura]);

  const cambiarCliente = useCallback(() => {
    const limpiar = () => { setCliente(null); setFacturaFija(null); reiniciarArticulos(); };
    if (!seleccion.length) { limpiar(); return; }
    Alert.alert(facturaFija ? 'Cambiar factura' : 'Cambiar cliente', 'Se quitarán los productos ya agregados.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cambiar', style: 'destructive', onPress: limpiar },
    ]);
  }, [seleccion.length, facturaFija]);

  // --- Artículos -------------------------------------------------------------
  const articulosIndexados = useMemo(
    () => articulos.map((a) => {
      // Cupo de cada factura: lo que dice el servidor (facturado − ya devuelto)
      // menos lo que sigue en la cola local sin enviar.
      const facturas = a.facturas.map((f) => {
        const pendiente = pendientesLocales.get(`${f.fact_num}|${a.co_art}`) || 0;
        return { ...f, disponible: Math.max(0, (f.disponible ?? f.cantidad_facturada) - pendiente) };
      });
      return {
        ...a,
        facturas,
        _disponible: facturas.reduce((t, f) => t + f.disponible, 0),
        _nombre: normalizar(`${a.art_des} ${a.co_art}`),
        _marca: normalizar(`${a.marca || ''} ${a.art_des}`),
        _sinEspacios: normalizar(a.art_des).replace(/\s+/g, ''),
        _sugeribles: valoresSugeribles(a),
      };
    }),
    [articulos, pendientesLocales]
  );

  const articulosPorCodigo = useMemo(
    () => new Map(articulosIndexados.map((a) => [a.co_art, a])),
    [articulosIndexados]
  );

  const hayFiltros = Object.values(filtros).some((v) => v.trim());

  const cumpleCampo = useMemo(() => crearPredicados(filtros), [filtros]);

  // Con una factura puntual se listan todos sus renglones sin filtrar.
  const resultadosArticulos = useMemo(() => {
    if (!hayFiltros) return facturaFija ? articulosIndexados : [];
    return articulosIndexados
      .filter((a) => CAMPOS_FILTRO.every((c) => cumpleCampo[c.campo](a)))
      .slice(0, MAX_RESULTADOS_ARTICULOS);
  }, [hayFiltros, facturaFija, cumpleCampo, articulosIndexados]);

  // Sugerencias del campo enfocado: valores de los artículos que cumplen los
  // OTROS filtros (así se acotan entre sí), que contengan lo tipeado, los más
  // frecuentes primero. [{ valor, cantidad }]
  const sugerencias = useMemo(() => {
    if (!campoEnfocado) return [];
    const otros = CAMPOS_FILTRO.filter((c) => c.campo !== campoEnfocado);
    const conteo = new Map();
    for (const a of articulosIndexados) {
      if (!otros.every((c) => cumpleCampo[c.campo](a))) continue;
      for (const v of a._sugeribles[campoEnfocado]) conteo.set(v, (conteo.get(v) || 0) + 1);
    }
    const sinEspacios = (t) => normalizar(t).replace(/\s+/g, '');
    const q = sinEspacios(filtros[campoEnfocado]);
    return [...conteo]
      .filter(([v]) => !q || (sinEspacios(v).includes(q) && sinEspacios(v) !== q))
      .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
      .slice(0, MAX_SUGERENCIAS)
      .map(([valor, cantidad]) => ({ valor, cantidad }));
  }, [campoEnfocado, filtros, cumpleCampo, articulosIndexados]);

  const cambiarFiltro = useCallback((campo, valor) => {
    setLecturaOcr(null);
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  }, []);

  const alternarDesplegado = useCallback((coArt) => {
    Keyboard.dismiss();
    setCampoEnfocado(null);
    setDesplegados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(coArt)) siguiente.delete(coArt); else siguiente.add(coArt);
      return siguiente;
    });
  }, []);

  // --- OCR del empaque ---------------------------------------------------------
  const abrirCamaraOcr = useCallback(async () => {
    if (!permisoCamara?.granted) {
      const r = await pedirPermisoCamara();
      if (!r.granted) {
        showMessage({ message: 'Sin permiso de cámara', type: 'danger' });
        return;
      }
    }
    setCamaraOcrVisible(true);
  }, [permisoCamara, pedirPermisoCamara]);

  const onFotoOcr = useCallback(async (uri) => {
    setCamaraOcrVisible(false);
    setLeyendoFoto(true);
    try {
      const imagen = await new File(uri).base64();
      const lectura = await DevolucionesService.ocrArticulo(imagen);
      const nuevos = filtrosDesdeOcr(lectura, articulosIndexados);
      if (!nuevos) {
        showMessage({ message: 'No se leyó nada útil en la foto', description: 'Prueba otra foto o escríbelo.', type: 'warning' });
        return;
      }
      setFiltros(nuevos);
      setLecturaOcr(lectura?.texto_leido || null);
      const encontrados = filtrarArticulos(articulosIndexados, nuevos);
      if (encontrados.length === 1) setDesplegados((prev) => new Set(prev).add(encontrados[0].co_art));
    } catch (e) {
      showMessage({ message: 'No se pudo leer la foto', description: e.data?.error || e.message, type: 'danger', duration: 3500 });
    } finally {
      setLeyendoFoto(false);
    }
  }, [articulosIndexados]);

  // --- Selección y reparto -----------------------------------------------------
  const agregarArticulo = useCallback((a) => {
    const n = Number(cantidadesInput[a.co_art]);
    if (!Number.isInteger(n) || n < 1) {
      showMessage({ message: 'Escribe la cantidad a devolver', type: 'warning' });
      return;
    }
    const elegidas = a.facturas.map((f) => f.fact_num).filter((num) => (facturasElegidas[a.co_art] || []).includes(num));
    const disponibleElegidas = a.facturas
      .filter((f) => elegidas.includes(f.fact_num))
      .reduce((t, f) => t + f.disponible, 0);
    if (elegidas.length && n > disponibleElegidas) {
      showMessage({
        message: `Las facturas elegidas solo tienen ${disponibleElegidas} und`,
        description: 'Elige otra factura más o baja la cantidad.',
        type: 'warning',
        duration: 3500,
      });
      return;
    }
    if (n > a._disponible) {
      showMessage({
        message: `Solo hay ${a._disponible} und disponibles`,
        description: facturaFija
          ? `En la factura ${facturaFija} (facturado menos lo ya devuelto).`
          : 'Entre todas las facturas del último año (facturado menos lo ya devuelto).',
        type: 'warning',
        duration: 3500,
      });
      return;
    }
    Keyboard.dismiss();
    setSeleccion((prev) => {
      const renglon = {
        co_art: a.co_art, cantidad: String(n), preferidas: elegidas, excluidas: [], soloPreferidas: elegidas.length > 0,
      };
      return prev.some((s) => s.co_art === a.co_art)
        ? prev.map((s) => (s.co_art === a.co_art ? renglon : s))
        : [...prev, renglon];
    });
    setDesplegados((prev) => { const sig = new Set(prev); sig.delete(a.co_art); return sig; });
  }, [cantidadesInput, facturasElegidas, facturaFija]);

  const alternarFacturaElegida = useCallback((coArt, factNum) => {
    setFacturasElegidas((prev) => {
      const actuales = prev[coArt] || [];
      return {
        ...prev,
        [coArt]: actuales.includes(factNum) ? actuales.filter((n) => n !== factNum) : [...actuales, factNum],
      };
    });
  }, []);

  const cambiarCantidad = useCallback((coArt, texto) => {
    setSeleccion((prev) => prev.map((s) => (s.co_art === coArt ? { ...s, cantidad: texto.replace(/\D/g, '') } : s)));
  }, []);

  const quitar = useCallback((coArt) => {
    setSeleccion((prev) => prev.filter((s) => s.co_art !== coArt));
  }, []);

  // Sacar una factura del reparto: la cantidad pasa a la siguiente con cupo.
  const excluirFactura = useCallback((coArt, factNum) => {
    setSeleccion((prev) => prev.map((s) => (s.co_art !== coArt ? s : {
      ...s,
      preferidas: s.preferidas.filter((n) => n !== factNum),
      excluidas: [...s.excluidas, factNum],
    })));
  }, []);

  // Usar primero una factura elegida a mano (o devolver una excluida al reparto).
  const preferirFactura = useCallback((coArt, factNum) => {
    setSeleccion((prev) => prev.map((s) => (s.co_art !== coArt ? s : {
      ...s,
      preferidas: [...s.preferidas.filter((n) => n !== factNum), factNum],
      excluidas: s.excluidas.filter((n) => n !== factNum),
    })));
  }, []);

  const repartos = useMemo(() => seleccion.map((s) => {
    const articulo = articulosPorCodigo.get(s.co_art);
    const n = Number(s.cantidad) || 0;
    return { ...s, articulo, n, ...repartir(articulo?.facturas || [], n, s.preferidas, s.excluidas, s.soloPreferidas) };
  }), [seleccion, articulosPorCodigo]);

  // Una línea por factura+artículo: lo que se encola (una novedad por factura).
  const lineasEnvio = useMemo(() => repartos.flatMap((r) => r.lineas.map(({ factura: f, cantidad }) => ({
    key: `${f.fact_num}|${r.co_art}`,
    fact_num: f.fact_num,
    fec_emis: f.fec_emis,
    co_art: r.co_art,
    art_des: r.articulo.art_des,
    codigo_barras: r.articulo.codigo_barras,
    cantidad_facturada: f.cantidad_facturada,
    neto_unit_usd: f.neto_unit_usd,
    neto_unit_bs: f.neto_unit_bs,
    cantidad_afectada: cantidad,
  }))), [repartos]);

  const seleccionPorFactura = useMemo(() => {
    const mapa = new Map();
    for (const l of lineasEnvio) {
      if (!mapa.has(l.fact_num)) mapa.set(l.fact_num, { fact_num: l.fact_num, fec_emis: l.fec_emis, subtotal_usd: 0, unidades: 0 });
      const g = mapa.get(l.fact_num);
      g.subtotal_usd += l.cantidad_afectada * (l.neto_unit_usd || 0);
      g.unidades += l.cantidad_afectada;
    }
    return [...mapa.values()].sort((x, y) => (y.fec_emis || '').localeCompare(x.fec_emis || ''));
  }, [lineasEnvio]);

  // Proforma: valor del artículo EN SU FACTURA (neto con descuento del
  // renglón), no el precio actual. Bs a la tasa de cada factura.
  const totalProforma = useMemo(() => lineasEnvio.reduce((t, l) => ({
    usd: t.usd + l.cantidad_afectada * (l.neto_unit_usd || 0),
    bs: t.bs + l.cantidad_afectada * (l.neto_unit_bs || 0),
  }), { usd: 0, bs: 0 }), [lineasEnvio]);

  // --- Fotos -----------------------------------------------------------------
  const abrirCamara = useCallback(async () => {
    if (fotos.length >= MAX_FOTOS) {
      showMessage({ message: `Máximo ${MAX_FOTOS} fotos`, type: 'warning' });
      return;
    }
    if (!permisoCamara?.granted) {
      const r = await pedirPermisoCamara();
      if (!r.granted) {
        showMessage({ message: 'Sin permiso de cámara', type: 'danger' });
        return;
      }
    }
    setCamaraVisible(true);
  }, [fotos.length, permisoCamara, pedirPermisoCamara]);

  const onFoto = useCallback((uri) => {
    setFotos((prev) => (prev.length >= MAX_FOTOS ? prev : [...prev, uri]));
  }, []);

  useEffect(() => {
    if (fotos.length >= MAX_FOTOS) setCamaraVisible(false);
  }, [fotos.length]);

  // --- Envío -----------------------------------------------------------------
  const validar = () => {
    if (!clave) return 'Selecciona la clave de observación.';
    if (!cliente) return 'Selecciona el cliente.';
    if (!repartos.length) return 'Agrega al menos un producto.';
    for (const r of repartos) {
      if (!r.articulo) return 'Hay un producto que ya no está en la lista; quítalo y agrégalo de nuevo.';
      if (!Number.isInteger(r.n) || r.n < 1) return `${r.articulo.art_des}: la cantidad debe ser al menos 1.`;
      if (r.faltante) {
        return `${r.articulo.art_des}: faltan ${r.faltante} und sin factura con cupo. Baja la cantidad o vuelve a incluir facturas quitadas.`;
      }
    }
    return null;
  };

  const enviar = useCallback(async () => {
    setEnviando(true);
    try {
      const nuevas = await encolarDevolucion({
        usuario: user,
        cliente,
        tipo_novedad: tipo,
        observacion_clave: clave,
        productos: lineasEnvio,
        fotos,
      });
      const resumen = await sincronizarPendientes();
      if (resumen.rechazadas) {
        showMessage({ message: 'Devolución rechazada', description: 'Revisa el motivo en el historial.', type: 'danger', duration: 4000 });
      } else if (resumen.pendientes) {
        showMessage({
          message: 'Guardada sin enviar',
          description: 'Sin conexión con el servidor. Se enviará sola al recuperar señal.',
          type: 'warning',
          duration: 4000,
        });
      } else {
        showMessage({
          message: nuevas.length > 1 ? `${nuevas.length} novedades enviadas` : 'Novedad enviada',
          type: 'success',
        });
      }
      navigation.goBack();
    } catch (e) {
      showMessage({ message: 'Error', description: e.message, type: 'danger' });
    } finally {
      setEnviando(false);
    }
  }, [user, cliente, tipo, clave, lineasEnvio, fotos, navigation]);

  const confirmarEnvio = useCallback(() => {
    const error = validar();
    if (error) {
      showMessage({ message: 'Falta información', description: error, type: 'warning', duration: 3500 });
      return;
    }
    const facturas = seleccionPorFactura.length;
    const textoFotos = fotos.length ? `${fotos.length} foto(s)` : 'sin fotos';
    Alert.alert(
      'Confirmar envío',
      `${tipo === 'Reposicion' ? 'Reposición' : 'Devolución'} ${clave} para ${cliente.cli_des}.\n` +
        `${repartos.length} producto(s) en ${facturas} factura(s), ${textoFotos}.` +
        (facturas > 1 ? `\n\nSe enviará una novedad por cada factura (${facturas}).` : ''),
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Enviar', onPress: enviar },
      ]
    );
  }, [tipo, clave, cliente, repartos, fotos, seleccionPorFactura, enviar]);

  const agregados = useMemo(() => new Set(seleccion.map((s) => s.co_art)), [seleccion]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: Theme.spacing.sm }}>
            <Ionicons name="arrow-back" size={22} color={Theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Nueva novedad</Text>
        </View>

        {/* 1. Tipo y clave */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Tipo de novedad</Text>
          <View style={styles.segmento}>
            {TIPOS_NOVEDAD.map((t) => {
              const activo = tipo === t.valor;
              return (
                <TouchableOpacity
                  key={t.valor}
                  style={[styles.segmentoOpcion, activo && styles.segmentoOpcionActiva]}
                  onPress={() => { if (!activo) { setTipo(t.valor); setClave(null); } }}
                >
                  <Text style={[styles.segmentoTexto, activo && styles.segmentoTextoActivo]}>{t.etiqueta}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.label}>Clave de observación</Text>
          <TouchableOpacity style={styles.select} onPress={() => setSelectClaveVisible(true)}>
            <Text style={[styles.selectTexto, !claveElegida && { color: Theme.colors.light }]} numberOfLines={2}>
              {claveElegida ? `${claveElegida.clave} · ${claveElegida.texto}` : 'Selecciona la clave…'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={Theme.colors.muted} />
          </TouchableOpacity>
          {claveElegida?.revision ? (
            <View style={[styles.pill, { alignSelf: 'flex-start', marginTop: Theme.spacing.xs }]}>
              <Text style={styles.pillTexto}>Revisión: {claveElegida.revision}</Text>
            </View>
          ) : null}
        </View>

        {/* 2. Cliente o factura */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>
            {cliente
              ? (facturaFija ? `Por factura · ${facturaFija} (devolución completa)` : 'Por cliente · varias facturas')
              : 'Cliente o factura'}
          </Text>
          {cliente ? (
            <View style={[styles.fila, styles.filaActiva]}>
              <View style={styles.filaEntre}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.filaTitulo}>{cliente.cli_des}</Text>
                  <Text style={styles.filaDetalle}>{cliente.co_cli} · {cliente.rif}</Text>
                  {cliente.zona ? <Text style={styles.filaDetalle}>Ruta: {cliente.zona}</Text> : null}
                </View>
                <TouchableOpacity onPress={cambiarCliente}>
                  <Text style={styles.secondaryButtonText}>Cambiar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={[styles.segmento, { marginBottom: Theme.spacing.sm }]}>
                {[{ valor: 'cliente', etiqueta: 'Por cliente' }, { valor: 'factura', etiqueta: 'Por factura' }].map((m) => {
                  const activo = modo === m.valor;
                  return (
                    <TouchableOpacity
                      key={m.valor}
                      style={[styles.segmentoOpcion, activo && styles.segmentoOpcionActiva]}
                      onPress={() => setModo(m.valor)}
                    >
                      <Text style={[styles.segmentoTexto, activo && styles.segmentoTextoActivo]}>{m.etiqueta}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={[styles.bannerOcr, { marginTop: 0, marginBottom: Theme.spacing.sm }]}>
                <Ionicons name="information-circle-outline" size={18} color={Theme.colors.info} />
                <Text style={[styles.bannerOcrTexto, { flex: 1 }]}>
                  {modo === 'cliente'
                    ? 'Por cliente: devolución de artículos sueltos. Puede tomar varias facturas del último año (una novedad por factura).'
                    : 'Por factura: devolución completa de una sola factura. Escribe su número; el cliente sale de la factura.'}
                </Text>
              </View>
              {modo === 'cliente' ? (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Nombre, código (FAR...) o RIF"
                    placeholderTextColor={Theme.colors.light}
                    value={busquedaCliente}
                    onChangeText={setBusquedaCliente}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                  {buscandoClientes ? <ActivityIndicator style={{ marginTop: Theme.spacing.md }} color={Theme.colors.primary} /> : null}
                  <View style={{ marginTop: Theme.spacing.sm }}>
                    {clientes.map((c) => (
                      <TouchableOpacity key={c.co_cli} style={styles.fila} onPress={() => elegirCliente(c)}>
                        <Text style={styles.filaTitulo}>{c.cli_des}</Text>
                        <Text style={styles.filaDetalle}>{c.co_cli} · {c.rif}{c.zona ? ` · ${c.zona}` : ''}</Text>
                      </TouchableOpacity>
                    ))}
                    {!buscandoClientes && busquedaCliente.trim().length >= 3 && !clientes.length ? (
                      <Text style={styles.emptyText}>Sin resultados.</Text>
                    ) : null}
                  </View>
                </>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Número de factura"
                    placeholderTextColor={Theme.colors.light}
                    value={busquedaFactura}
                    onChangeText={(t) => setBusquedaFactura(t.replace(/\D/g, ''))}
                    onSubmitEditing={buscarFactura}
                    keyboardType="number-pad"
                    returnKeyType="search"
                  />
                  <TouchableOpacity
                    style={[styles.secondaryButton, buscandoFactura && styles.buttonDisabled]}
                    onPress={buscarFactura}
                    disabled={buscandoFactura}
                  >
                    {buscandoFactura
                      ? <ActivityIndicator color={Theme.colors.primary} />
                      : <Ionicons name="search" size={18} color={Theme.colors.primary} />}
                    <Text style={styles.secondaryButtonText}>Buscar factura</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>

        {/* 3. Artículos */}
        {cliente ? (
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>Artículos a devolver</Text>
            {cargandoArticulos ? (
              <ActivityIndicator color={Theme.colors.primary} />
            ) : (
              <>
                <Text style={styles.filaDetalle}>
                  {facturaFija
                    ? `${articulos.length} artículo(s) en la factura ${facturaFija}. Toca uno, escribe la cantidad y agrégalo.`
                    : `${articulos.length} artículo(s) facturados a este cliente en el último año. Busca el artículo, escribe la cantidad y la app elige las facturas (la más reciente con cupo primero).`}
                </Text>
                <TouchableOpacity
                  style={[styles.secondaryButton, leyendoFoto && styles.buttonDisabled]}
                  onPress={abrirCamaraOcr}
                  disabled={leyendoFoto}
                >
                  {leyendoFoto
                    ? <ActivityIndicator color={Theme.colors.primary} />
                    : <Ionicons name="scan-outline" size={18} color={Theme.colors.primary} />}
                  <Text style={styles.secondaryButtonText}>{leyendoFoto ? 'Leyendo la foto…' : 'Buscar por foto del empaque'}</Text>
                </TouchableOpacity>
                {lecturaOcr ? (
                  <View style={styles.bannerOcr}>
                    <Text style={[styles.bannerOcrTexto, { flex: 1 }]}>Leído en la foto: {lecturaOcr}</Text>
                    <TouchableOpacity onPress={() => setLecturaOcr(null)}>
                      <Ionicons name="close" size={18} color={Theme.colors.info} />
                    </TouchableOpacity>
                  </View>
                ) : null}
                {CAMPOS_FILTRO.map((c) => (
                  <View key={c.campo} style={{ marginTop: Theme.spacing.sm }}>
                    <Text style={styles.filtroEtiqueta}>{c.etiqueta}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={c.placeholder}
                      placeholderTextColor={Theme.colors.light}
                      value={filtros[c.campo]}
                      onChangeText={(v) => cambiarFiltro(c.campo, v)}
                      onFocus={() => setCampoEnfocado(c.campo)}
                      onBlur={() => setCampoEnfocado((actual) => (actual === c.campo ? null : actual))}
                      autoCorrect={false}
                    />
                    {campoEnfocado === c.campo ? sugerencias.map((sg) => (
                      <TouchableOpacity
                        key={sg.valor}
                        style={styles.fila}
                        onPress={() => { cambiarFiltro(c.campo, sg.valor); setCampoEnfocado(null); Keyboard.dismiss(); }}
                      >
                        <Text style={styles.filaTitulo}>{sg.valor}</Text>
                        <Text style={styles.filaDetalle}>{sg.cantidad} artículo(s)</Text>
                      </TouchableOpacity>
                    )) : null}
                  </View>
                ))}
                {hayFiltros ? (
                  <TouchableOpacity
                    style={styles.limpiarFiltros}
                    onPress={() => { setFiltros(FILTROS_VACIOS); setDesplegados(new Set()); setLecturaOcr(null); }}
                  >
                    <Ionicons name="close-circle" size={16} color={Theme.colors.primaryDark} />
                    <Text style={styles.limpiarFiltrosTexto}>Limpiar filtros</Text>
                  </TouchableOpacity>
                ) : null}

                <View style={{ marginTop: Theme.spacing.sm }}>
                  {resultadosArticulos.map((a) => {
                    const abierto = desplegados.has(a.co_art);
                    const conCupo = a.facturas.filter((f) => f.disponible > 0);
                    const nInput = Number(cantidadesInput[a.co_art]) || 0;
                    const elegidas = a.facturas.map((f) => f.fact_num).filter((num) => (facturasElegidas[a.co_art] || []).includes(num));
                    const vistaPrevia = nInput ? repartir(a.facturas, nInput, elegidas, [], true) : null;
                    return (
                      <View key={a.co_art} style={[styles.fila, (abierto || agregados.has(a.co_art)) && styles.filaActiva]}>
                        <TouchableOpacity onPress={() => alternarDesplegado(a.co_art)}>
                          <View style={styles.filaEntre}>
                            <Text style={[styles.filaTitulo, { flex: 1 }]}>{agregados.has(a.co_art) ? '✓ ' : ''}{a.art_des}</Text>
                            <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={18} color={Theme.colors.muted} />
                          </View>
                          <Text style={styles.filaDetalle}>
                            {a.co_art}{a.codigo_barras ? ` · ${a.codigo_barras}` : ''}{a.marca ? ` · ${a.marca}` : ''}
                          </Text>
                        </TouchableOpacity>
                        {abierto ? (
                          <>
                            <ImagenArticulo coArt={a.co_art} />
                            {conCupo.length ? (
                              <>
                                <Text style={styles.filaDetalle}>
                                  Disponible para devolver: {a._disponible} und en {conCupo.length} factura(s).
                                  {' '}Toca una o varias facturas para devolver solo de esas; sin elegir, la app reparte desde la más reciente.
                                </Text>
                                <View style={styles.chipsFila}>
                                  {conCupo.slice(0, FACTURAS_VISIBLES).map((f) => {
                                    const activa = elegidas.includes(f.fact_num);
                                    return (
                                      <TouchableOpacity
                                        key={f.fact_num}
                                        style={[styles.chip, activa && styles.chipAgregado]}
                                        onPress={() => alternarFacturaElegida(a.co_art, f.fact_num)}
                                      >
                                        <Text style={[styles.chipTexto, activa && styles.chipTextoAgregado]}>
                                          {activa ? '✓ ' : ''}Fact. {f.fact_num} · {fechaCorta(f.fec_emis)} · {f.disponible} de {f.cantidad_facturada} und · ${formatoMonto(f.neto_unit_usd)} c/u
                                        </Text>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                                <View style={[styles.filaEntre, { marginTop: Theme.spacing.sm }]}>
                                  <Text style={[styles.filtroEtiqueta, { flex: 1 }]}>Cantidad a devolver</Text>
                                  <TextInput
                                    style={styles.inputCantidad}
                                    keyboardType="number-pad"
                                    value={cantidadesInput[a.co_art] || ''}
                                    onChangeText={(t) => setCantidadesInput((prev) => ({ ...prev, [a.co_art]: t.replace(/\D/g, '') }))}
                                    maxLength={5}
                                  />
                                  <TouchableOpacity style={[styles.chip, styles.chipAgregado]} onPress={() => agregarArticulo(a)}>
                                    <Text style={[styles.chipTexto, styles.chipTextoAgregado]}>{agregados.has(a.co_art) ? 'Actualizar' : 'Agregar'}</Text>
                                  </TouchableOpacity>
                                </View>
                                {vistaPrevia ? (
                                  <Text style={vistaPrevia.faltante ? styles.mensajeError : styles.filaDetalle}>
                                    {vistaPrevia.faltante
                                      ? (elegidas.length
                                        ? `Las facturas elegidas solo tienen ${nInput - vistaPrevia.faltante} und. Elige otra o baja la cantidad.`
                                        : `Supera lo disponible (${a._disponible} und).`)
                                      : `Se descontará de: ${vistaPrevia.lineas.map((l) => `Fact. ${l.factura.fact_num} (${l.cantidad})`).join(', ')}`}
                                  </Text>
                                ) : null}
                              </>
                            ) : (
                              <Text style={styles.mensajeError}>Sin cupo: lo facturado de este artículo ya fue devuelto.</Text>
                            )}
                          </>
                        ) : null}
                      </View>
                    );
                  })}
                  {hayFiltros && !resultadosArticulos.length ? (
                    <Text style={styles.emptyText}>
                      {facturaFija ? 'Ningún artículo de esta factura cumple esos datos.' : 'Ningún artículo facturado a este cliente en el último año cumple esos datos.'}
                    </Text>
                  ) : null}
                </View>
              </>
            )}
          </View>
        ) : null}

        {/* 4. Proforma */}
        {repartos.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>Proforma de la devolución ({repartos.length})</Text>
            <Text style={styles.filaDetalle}>
              Valor de cada artículo en su factura (neto con descuento), no el precio actual.
              Toca ✕ para sacar una factura del reparto, o una factura de abajo para usarla primero.
            </Text>
            {repartos.map((r) => {
              if (!r.articulo) return null;
              const usadas = new Set(r.lineas.map((l) => l.factura.fact_num));
              const otras = r.articulo.facturas
                .filter((f) => f.disponible > 0 && !usadas.has(f.fact_num) && !r.excluidas.includes(f.fact_num))
                .slice(0, FACTURAS_VISIBLES);
              return (
                <View key={r.co_art} style={styles.fila}>
                  <View style={styles.filaEntre}>
                    <Text style={[styles.filaTitulo, { flex: 1 }]} numberOfLines={2}>{r.articulo.art_des}</Text>
                    <TextInput
                      style={styles.inputCantidad}
                      keyboardType="number-pad"
                      value={r.cantidad}
                      onChangeText={(t) => cambiarCantidad(r.co_art, t)}
                      maxLength={5}
                    />
                    <TouchableOpacity onPress={() => quitar(r.co_art)}>
                      <Ionicons name="trash-outline" size={20} color={Theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                  {r.lineas.map(({ factura: f, cantidad }) => (
                    <View key={f.fact_num} style={[styles.filaEntre, { marginTop: Theme.spacing.xs }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.filaDetalle}>
                          Fact. {f.fact_num} · {fechaCorta(f.fec_emis)} · {cantidad} de {f.disponible} disp. · {textoDescuento(f.porc_desc)}
                        </Text>
                        <Text style={styles.filaDetalle}>
                          Neto ${formatoMonto(f.neto_unit_usd)} × {cantidad} = <Text style={styles.montoLinea}>${formatoMonto(cantidad * (f.neto_unit_usd || 0))}</Text>
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => excluirFactura(r.co_art, f.fact_num)}>
                        <Ionicons name="close-circle-outline" size={20} color={Theme.colors.muted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {r.faltante ? (
                    <Text style={styles.mensajeError}>
                      Faltan {r.faltante} und sin factura con cupo{r.soloPreferidas ? ' (solo se usan las facturas elegidas; agrega otra abajo)' : ''}.
                    </Text>
                  ) : null}
                  {otras.length || r.excluidas.length ? (
                    <View style={styles.chipsFila}>
                      {otras.map((f) => (
                        <TouchableOpacity key={f.fact_num} style={styles.chip} onPress={() => preferirFactura(r.co_art, f.fact_num)}>
                          <Text style={styles.chipTexto}>+ Fact. {f.fact_num} · {fechaCorta(f.fec_emis)} · {f.disponible} disp.</Text>
                        </TouchableOpacity>
                      ))}
                      {r.excluidas.map((n) => (
                        <TouchableOpacity key={n} style={[styles.chip, styles.buttonDisabled]} onPress={() => preferirFactura(r.co_art, n)}>
                          <Text style={styles.chipTexto}>↺ Fact. {n} (quitada)</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
            {seleccionPorFactura.length ? (
              <>
                <Text style={styles.facturaGrupoTitulo}>Por factura (una novedad cada una)</Text>
                {seleccionPorFactura.map((g) => (
                  <View key={g.fact_num} style={styles.filaEntre}>
                    <Text style={styles.filaDetalle}>Factura {g.fact_num} · {fechaCorta(g.fec_emis)} · {g.unidades} und</Text>
                    <Text style={styles.filaDetalle}>${formatoMonto(g.subtotal_usd)}</Text>
                  </View>
                ))}
              </>
            ) : null}
            <View style={styles.totalProforma}>
              <Text style={styles.totalProformaTexto}>Total devolución</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.totalProformaTexto}>${formatoMonto(totalProforma.usd)}</Text>
                <Text style={styles.filaDetalle}>Bs {formatoMonto(totalProforma.bs)} (tasa de cada factura)</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* 5. Fotos */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Evidencia fotográfica ({fotos.length}/{MAX_FOTOS})</Text>
          <View style={styles.fotosFila}>
            {fotos.map((uri) => (
              <View key={uri}>
                <Image source={{ uri }} style={styles.foto} />
                <TouchableOpacity style={styles.fotoQuitar} onPress={() => setFotos((prev) => prev.filter((u) => u !== uri))}>
                  <Ionicons name="close" size={14} color={Theme.colors.white} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          {fotos.length < MAX_FOTOS ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={abrirCamara}>
              <Ionicons name="camera-outline" size={18} color={Theme.colors.primary} />
              <Text style={styles.secondaryButtonText}>Tomar foto</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, enviando && styles.buttonDisabled]}
          onPress={confirmarEnvio}
          disabled={enviando}
        >
          {enviando ? <ActivityIndicator color={Theme.colors.white} /> : <Text style={styles.primaryButtonText}>Enviar</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={selectClaveVisible} transparent animationType="fade" onRequestClose={() => setSelectClaveVisible(false)}>
        <TouchableOpacity style={styles.selectFondo} activeOpacity={1} onPress={() => setSelectClaveVisible(false)}>
          <View style={styles.selectHoja}>
            <Text style={styles.cardTitulo}>Clave de observación · {tipo === 'Reposicion' ? 'Reposición' : 'Devolución'}</Text>
            <ScrollView>
              {claves.map((c) => (
                <TouchableOpacity
                  key={c.clave}
                  style={[styles.fila, clave === c.clave && styles.filaActiva]}
                  onPress={() => { setClave(c.clave); setSelectClaveVisible(false); }}
                >
                  <View style={styles.filaEntre}>
                    <Text style={[styles.filaTitulo, { flex: 1 }]}>{c.clave} · {c.texto}</Text>
                    {c.revision ? (
                      <View style={styles.pill}><Text style={styles.pillTexto}>Revisión: {c.revision}</Text></View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
      <CamaraModal visible={camaraVisible} onCerrar={() => setCamaraVisible(false)} onFoto={onFoto} />
      <CamaraModal visible={camaraOcrVisible} onCerrar={() => setCamaraOcrVisible(false)} onFoto={onFotoOcr} />
    </View>
  );
}
