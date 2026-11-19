import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          950: "#09251F",
          900: "#0F3D34", // Primary Deep Dark Emerald Background (Palette)
          850: "#11453B",
          800: "#134E43", // Rich Pine Teal Surface / Card Background (Palette)
          700: "#1B6356",
          600: "#247D6D",
          500: "#2E9986",
        },
        obsidian: {
          // Harmonized with luxury emerald palette
          950: "#0F3D34",
          900: "#134E43",
          850: "#11453B",
          800: "#185B4F",
          700: "#247D6D",
        },
        lumiere: {
          gold: "#C8A96A", // Warm Vintage Gold (Palette)
          goldLight: "#D6B87B",
          goldDark: "#B39355",
          cream: "#F7F6F1", // Warm Cream Text (Palette)
          mint: "#E6F0E9", // Mint Frost Highlight (Palette)
          muted: "#A2B8AF", // Soft Sage Muted Text
          dark: "#0F3D34",
          surface: "#134E43",
          amber: "#C8A96A",
          accent: "#C8A96A",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Playfair Display", "Georgia", "Cambria", "Times New Roman", "serif"],
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      animation: {
        'float-slow': 'float 6s ease-in-out infinite',
        'float-reverse': 'floatReverse 7s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 4s ease-in-out infinite',
        'spin-slow': 'spin 30s linear infinite',
        'shimmer': 'shimmer 2.5s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        floatReverse: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(8px) rotate(-2deg)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.02)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
