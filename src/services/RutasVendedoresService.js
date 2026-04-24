const BASE_URL = 'https://98.94.185.164.nip.io/api/auditoria';

export const RutasVendedoresService = {
    getData: async (coVen) => {
        if (!coVen) throw new Error('Código de vendedor no definido.');

        const url = `${BASE_URL}/vendedores-rutas?co_ven=${encodeURIComponent(coVen)}`;
        console.log('[RutasVendedoresService] GET:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) throw new Error('Error al consultar rutas de vendedores.');

        const json = await response.json();
        return json.data || [];
    },
};
