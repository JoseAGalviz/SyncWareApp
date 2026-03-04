import { api } from './api';

const MATRIX_BASE_URL = 'https://98.94.185.164.nip.io/api/auditoria';

export const MatrixService = {
    /**
     * Obtiene los datos de la matriz excel filtrados por segmento bitrix.
     * @param {string} segmento - El segmento bitrix excel del usuario.
     * @returns {Promise<Array>} - Lista de registros.
     */
    getMatrixData: async (segmento) => {
        try {
            if (!segmento) {
                throw new Error('El segmento del vendedor no está definido.');
            }

            const url = `${MATRIX_BASE_URL}/matrix-excel-datos?segmento_bitrix=${encodeURIComponent(segmento)}`;
            console.log("[MatrixService] Petición GET a:", url);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Error al consultar los datos de la matriz.');
            }

            const data = await response.json();
            // Retornamos solo la propiedad 'rows' según la estructura del endpoint
            return data.rows || [];
        } catch (error) {
            console.error('MatrixService Error:', error);
            throw error;
        }
    }
};
