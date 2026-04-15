import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * Genera un PDF a partir de HTML y abre el diálogo de compartir.
 * @param {string} html  - Contenido HTML completo del documento.
 * @param {string} fileName - Nombre sugerido del archivo (sin extensión).
 */
export const printAndSharePdf = async (html, fileName = 'reporte') => {
    const { uri } = await Print.printToFileAsync({ html });
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
        await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Compartir ${fileName}`,
            UTI: 'com.adobe.pdf',
        });
    }
};
