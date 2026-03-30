import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Prefer VITE_API_URL from the process env (Railway, Vercel, CI).
// Only read frontend/.env when unset so local .env does not override deploy env.
const envPath = path.join(__dirname, '..', '.env');
if (!String(process.env.VITE_API_URL || '').trim() && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const m = line.match(/^\s*VITE_API_URL\s*=\s*(.+?)\s*$/);
    if (m) {
      const val = m[1].replace(/^["']|["']$/g, '').trim();
      process.env.VITE_API_URL = val;
      break;
    }
  }
}

const apiUrl = String(process.env.VITE_API_URL || '').trim().replace(/\/$/, '');
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
