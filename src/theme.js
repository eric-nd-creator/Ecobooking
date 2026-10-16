// Single source of truth for colors that must be plain CSS/hex values (chart
// libraries like Recharts take a `fill`/`stroke` prop, not a Tailwind class) —
// keeps every chart's palette in sync with the brand/accent tokens in
// tailwind.config.js instead of each page re-declaring its own hex array.
export const CHART_COLORS = ['#1a5276', '#2980b9', '#f39c12', '#27ae60', '#9b59b6', '#e74c3c'];

export const BRAND_HEX = '#1a5276';
export const ACCENT_HEX = '#f39c12';
export const DANGER_HEX = '#e74c3c';
export const SUCCESS_HEX = '#27ae60';
