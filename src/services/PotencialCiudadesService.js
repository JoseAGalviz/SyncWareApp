import { api } from './api';

const BASE_URL = 'https://98.94.185.164.nip.io/api/auditoria';

export const PotencialCiudadesService = {
    /**
     * Obtiene los datos de potencial por ciudad filtrados por segmento bitrix.
     * @param {string} segmento - El segmento bitrix del usuario.
     * @returns {Promise<Array>} - Lista de registros por ciudad.
     */
    getPotencialData: async (segmento) => {
        try {
            if (!segmento) {
                throw new Error('El segmento del vendedor no está definido.');
            }

            const url = `${BASE_URL}/excel-data-potencial`;

            const payload = {
                segmento_bitrix_excel: segmento
            };

            console.log('[PotencialCiudadesService] Petición POST a:', url, 'con:', payload);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Error al consultar los datos de potencial por ciudad.');
            }

            const data = await response.json();
            return data || [];
        } catch (error) {
            console.error('PotencialCiudadesService Error:', error);
            throw error;
        }
    },
};
