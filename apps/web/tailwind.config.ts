import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        severity: {
          low: '#16a34a',
          med: '#eab308',
          high: '#f97316',
          critical: '#dc2626',
        },
      },
    },
  },
  plugins: [],
};

export default config;
