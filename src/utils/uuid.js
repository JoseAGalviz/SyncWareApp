// UUID v4 simple, sin dependencia de crypto.getRandomValues (no siempre disponible en Hermes/RN).
// Uso: identificador de correlación cliente-servidor para idempotencia offline, no requiere ser
// criptográficamente seguro.
export function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
