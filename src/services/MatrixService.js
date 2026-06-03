import { Config } from '../constants/Config';
const MATRIX_BASE_URL = `${Config.API_BASE_URL}/api/auditoria`;

export const MatrixService = {
    /**
     * Obtiene los datos de la matriz excel por co_ven del usuario.
     * @param {string} coVen - El co_ven del usuario logueado (con o sin ceros a la izquierda).
     * @returns {Promise<Array>} - Lista de registros.
     */
    getMatrixData: async (coVen) => {
        try {
            if (!coVen) {
                throw new Error('El código de vendedor no está definido.');
            }

            // Eliminar ceros a la izquierda
            const usuario = String(parseInt(coVen, 10));

            const url = `${MATRIX_BASE_URL}/matrix-excel-datos`;
            console.log("[MatrixService] Petición POST a:", url, "usuario:", usuario);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario }),
            });

            if (!response.ok) {
                throw new Error('Error al consultar los datos de la matriz.');
            }

            const data = await response.json();
            return data.rows || [];
        } catch (error) {
            console.error('MatrixService Error:', error);
            throw error;
        }
    }
};
