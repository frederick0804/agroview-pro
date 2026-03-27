const fs = require('fs');

const filePath = 'src/pages/Configuracion.tsx';
const text = fs.readFileSync(filePath, 'utf8');
const lines = text.split(/\r?\n/);

const markerRegex = /[\u00C3\u00C2\u00E2\u00EF\uFFFD]/;

for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i];
  if (markerRegex.test(line)) {
    process.stdout.write(`${i + 1}: ${line}\n`);
  }
}
