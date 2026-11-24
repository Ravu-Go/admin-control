import fs from 'node:fs';
const tokens = JSON.parse(fs.readFileSync(new URL('../src/design/tokens.json', import.meta.url), 'utf8'));
let css = ':root {\n';
for (const [name, value] of Object.entries(tokens.colors)) css += `  --color-${name}: ${value};\n`;
for (const [name, value] of Object.entries(tokens.radius)) css += `  --radius-${name}: ${value}px;\n`;
css += `  --font-family: ${tokens.font.family};\n  --sidebar-width: ${tokens.layout.sidebar}px;\n  --topbar-height: ${tokens.layout.topbar}px;\n}\n`;
fs.writeFileSync(new URL('../src/design/tokens.css', import.meta.url), css);
