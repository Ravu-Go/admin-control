import fs from 'node:fs';
const tokens = JSON.parse(fs.readFileSync(new URL('./src/design/tokens.json', import.meta.url), 'utf8'));
export default { content: ['./index.html', './src/**/*.{ts,tsx}'], theme: { extend: { colors: tokens.colors, borderRadius: Object.fromEntries(Object.entries(tokens.radius).map(([k,v])=>[k, `${v}px`])), fontFamily: { sans: ['Inter', 'sans-serif'] } } } };
