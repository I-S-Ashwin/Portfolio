/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: { colors: { ink: 'var(--ink)', paper: 'var(--paper)', muted: 'var(--muted)', line: 'var(--line)', accent: 'var(--accent)' }, fontFamily: { sans: ['var(--font-sans)'], mono: ['var(--font-mono)'] }, boxShadow: { soft: 'var(--shadow-soft)' } } },
  plugins: [],
};
