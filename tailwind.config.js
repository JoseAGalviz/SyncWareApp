/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./App.js', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Marca — mismo verde usado en Theme.js ("verde refinado")
        primary: {
          DEFAULT: '#0E9F6E',
          dark: '#0B7F58',
          light: '#3CCB95',
          muted: '#E7F6EF',
        },
        // Azul noche de la navegación (Theme.colors.dark)
        night: {
          DEFAULT: '#0F2A3A',
          soft: '#1C3D50',
        },
        // Superficies claras — de fondo de página a card elevada.
        surface: {
          base: '#F5F7F6',
          raised: '#F9FBFA',
          card: '#FFFFFF',
          border: '#E4E9E7',
        },
        // Texto sobre fondo claro
        ink: {
          DEFAULT: '#12211C',
          muted: '#5F6F69',
          faint: '#94A39D',
        },
        // Semánticos (mismos valores que Theme.js)
        warning: '#D99A1E',
        danger: '#D64545',
        info: '#2A7FB8',
      },
    },
  },
  plugins: [],
};
