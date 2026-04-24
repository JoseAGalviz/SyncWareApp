const BASE_URL = 'https://98.94.185.164.nip.io/api/auditoria';

export const CoberturaVendedoresService = {
    getData: async (coVen) => {
        if (!coVen) throw new Error('Código de vendedor no definido.');

        const url = `${BASE_URL}/cobertura-vendedores?co_ven=${encodeURIComponent(coVen)}`;

        console.log('[CoberturaVendedoresService] GET:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) throw new Error('Error al consultar cobertura de vendedores.');

        const data = await response.json();
        return data.data || [];
    },
};
