// Run only in the private API CI or an authorised local workspace. Never publish the output.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import tokens from '../src/design/tokens.json' with { type: 'json' };
import masks from '../tests/private/approved-differences.json' with { type: 'json' };
const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Supply the private native A01.png path and a directory outside the frontend repository.');
const directory = path.resolve(output);
if (directory === process.cwd() || directory.startsWith(process.cwd() + path.sep)) throw new Error('Keep native design references outside this public repository.');
fs.mkdirSync(directory, { recursive: true });
const source = PNG.sync.read(fs.readFileSync(input));
if (source.width !== 1440 || source.height !== 1042) throw new Error('Expected original 1440x1042 native export.');
const cropped = new PNG({ width: 1440, height: 1000 });
PNG.bitblt(source, cropped, 0, 42, 1440, 1000, 0, 0);
for (const area of masks) {
  const color = tokens.colors[area.color].slice(1).match(/../g).map(value => parseInt(value,16));
  for (let y = area.y; y < area.y + area.height; y++) for (let x = area.x; x < area.x + area.width; x++) {
    const i = (y * 1440 + x) * 4;
    cropped.data[i] = color[0]; cropped.data[i+1] = color[1]; cropped.data[i+2] = color[2]; cropped.data[i+3] = 255;
  }
}
fs.writeFileSync(path.join(directory, 'a01-chrome.png'), PNG.sync.write(cropped));
console.log('Prepared native reference in private storage.');
