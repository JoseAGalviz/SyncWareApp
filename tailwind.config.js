/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./App.js', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Marca — mismo verde que ya usaba el theme claro (Theme.js primary), ahora
        // como acento sobre fondo oscuro en vez de fondo claro con texto oscuro.
        primary: {
          DEFAULT: '#10B981',
          dark: '#059669',
          light: '#34D399',
          muted: '#064E3B',
        },
        // Superficies oscuras — escala única, de fondo de página a card elevada.
        surface: {
          base: '#0B1120',
          raised: '#111827',
          card: '#1A2333',
          border: '#2A3446',
        },
        // Texto sobre fondo oscuro
        ink: {
          DEFAULT: '#E5E7EB',
          muted: '#94A3B8',
          faint: '#64748B',
        },
        // Semánticos (mismos valores que Theme.js para no romper significado de color)
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#38BDF8',
      },
    },
  },
  plugins: [],
};
