/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./App.js', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Marca — mismo verde usado en Theme.js
        primary: {
          DEFAULT: '#10B981',
          dark: '#059669',
          light: '#34D399',
          muted: '#ECFDF5',
        },
        // Superficies claras — de fondo de página a card elevada.
        surface: {
          base: '#F1F5F9',
          raised: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
        },
        // Texto sobre fondo claro
        ink: {
          DEFAULT: '#0F172A',
          muted: '#64748B',
          faint: '#94A3B8',
        },
        // Semánticos (mismos valores que Theme.js)
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#0EA5E9',
      },
    },
  },
  plugins: [],
};
