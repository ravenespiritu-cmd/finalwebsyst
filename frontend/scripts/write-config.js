import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiUrl = (process.env.VITE_API_URL || '').replace(/\/$/, '');
const publicDir = path.join(__dirname, '..', 'public');
const configPath = path.join(publicDir, 'config.json');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(
  configPath,
  JSON.stringify({ apiUrl }, null, 2),
  'utf8'
);
console.log('Wrote config.json with apiUrl:', apiUrl || '(empty)');
