const fs = require('fs');

const path = 'src/pages/Configuracion.tsx';
let text = fs.readFileSync(path, 'utf8');

// Remove UTF-8 BOM if present.
if (text.charCodeAt(0) === 0xfeff) {
  text = text.slice(1);
}

function decodeMojibakeToken(token) {
  let current = token;
  for (let i = 0; i < 4; i += 1) {
    if (!/[ÃÂâï]/.test(current)) break;
    const next = Buffer.from(current, 'latin1').toString('utf8');
    if (next === current) break;
    current = next;
  }
  return current;
}

// Decode only non-whitespace tokens that clearly contain mojibake marker chars.
text = text.replace(/[^\s"'`<>]+/gu, (token) => {
  if (/[ÃÂâï]/.test(token)) {
    return decodeMojibakeToken(token);
  }
  return token;
});

const replacements = new Map([
  ['definici+�n', 'definición'],
  ['par+�metro', 'parámetro'],
  ['par+�metros', 'parámetros'],
  ['Producci+�n', 'Producción'],
  ['An+�lisis', 'Análisis'],
  ['N+�mero', 'Número'],
  ['S+�/No', 'Sí/No'],
  ['Relaci+�n', 'Relación'],
  ['jer+�rquico', 'jerárquico'],
  ['+�rea', 'área'],
  ['edici+�n', 'edición'],
  ['eliminaci+�n', 'eliminación'],
  ['vac+�a', 'vacía'],

  ['Configuraci?n', 'Configuración'],
  ['configuraci?n', 'configuración'],
  ['definici?n', 'definición'],
  ['M?dulo', 'Módulo'],
  ['m?dulo', 'módulo'],
  ['m?dulos', 'módulos'],
  ['b?squeda', 'búsqueda'],
  ['B?squeda', 'Búsqueda'],
  ['par?metro', 'parámetro'],
  ['par?metros', 'parámetros'],
  ['versi?n', 'versión'],
  ['descripci?n', 'descripción'],
  ['Descripci?n', 'Descripción'],
  ['C?digo', 'Código'],
  ['C?lculo', 'Cálculo'],
  ['N?mero', 'Número'],
  ['S?/No', 'Sí/No'],
  ['Relaci?n', 'Relación'],
  ['producci?n', 'producción'],
  ['m?nimo', 'mínimo'],
  ['M?nimo', 'Mínimo'],
  ['m?x', 'máx'],
  ['m?ltiples', 'múltiples'],
  ['vac?o', 'vacío'],
  ['acci?n', 'acción'],
  ['operaci?n', 'operación'],
  ['eliminaci?n', 'eliminación'],
  ['regresi?n', 'regresión'],
  ['reversi?n', 'reversión'],
  ['Activar?s', 'Activarás'],
  ['qu?', 'qué'],
  ['Qu?', 'Qué'],
  ['est?', 'está'],
  ['est?n', 'están'],
  ['s?lo', 'sólo'],
  ['S?', 'Sí'],
  ['m?s', 'más'],
  ['a?n', 'aún'],
  ['tambi?n', 'también'],
  ['p?gina', 'página'],
  ['auditor?a', 'auditoría'],
  ['gu?a', 'guía'],
  ['opci?n', 'opción'],
  ['selecci?n', 'selección'],
  ['aplicar?n', 'aplicarán'],
  ['crear?n', 'crearán'],
  ['estar?amos', 'estaríamos'],
  ['podr?', 'podrá'],
  ['Podr?s', 'Podrás'],
  ['quedar?', 'quedará'],
  ['quedar?n', 'quedarán'],
  ['autom?ticamente', 'automáticamente'],
  ['espec?fico', 'específico'],
  ['espec?ficos', 'específicos'],
  ['simult?neamente', 'simultáneamente'],
  ['r?pido', 'rápido'],
  ['r?pida', 'rápida'],
  ['r?pidas', 'rápidas'],
  ['reci?n', 'recién'],
  ['b?sica', 'básica'],
  ['B?sico', 'Básico'],
  ['b?sicos', 'básicos'],
  ['Cat?logo', 'Catálogo'],
  ['Hect?reas', 'Hectáreas'],
  ['Pa?s', 'País'],
  ['P?rez', 'Pérez'],
  ['Contrase?a', 'Contraseña'],
  ['T?', 'Tú'],
  ['t?cnico', 'técnico'],
  ['v?lido', 'válido'],
  ['?ltima', 'última'],
  ['?ltimo', 'último'],
  ['?lt.', 'últ.'],
  ['?nica', 'única'],
  ['?rea', 'área'],
  ['Est?ndar', 'Estándar'],
  ['Gesti?n', 'Gestión'],
  ['gesti?n', 'gestión'],
  ['informaci?n', 'información'],
  ['jerarqu?a', 'jerarquía'],
  ['Validaci?n', 'Validación'],
  ['Distribuci?n', 'Distribución'],
  ['Direcci?n', 'Dirección'],
  ['Personalizaci?n', 'Personalización'],
  ['Asignaci?n', 'Asignación'],
  ['Justificaci?n', 'Justificación'],
  ['Protecci?n', 'Protección'],
  ['Agrupaci?n', 'Agrupación'],
  ['Activaci?n', 'Activación'],
  ['Secci?n', 'Sección'],
  ['sesi?n', 'sesión'],
  ['restricci?n', 'restricción'],
  ['expl?cito', 'explícito'],
  ['plantaci?n', 'plantación'],
  ['Macrot?nel', 'Macrotúnel'],
  ['pesta?a', 'pestaña'],

  ['�Ǫ', '…'],
  ['Â·', '·'],
  ['Buscar formulario?', 'Buscar formulario…'],
  ['¿No encuentras el parámetro?', '¿No encuentras el parámetro?'],
  ['?No encuentras el parámetro?', '¿No encuentras el parámetro?'],
  ['?Estás seguro?', '¿Estás seguro?'],
  ['?Eliminar ', '¿Eliminar '],
  ['<span>?</span>', '<span>·</span>'],
  [' — ', ' — '],
  ['Global - todos los cultivos', 'Global - todos los cultivos'],
]);

for (const [oldValue, newValue] of replacements) {
  text = text.split(oldValue).join(newValue);
}

// Restore access-level icons to stable ASCII to avoid mojibake regressions.
text = text
  .replace('{ value: 1, label: "Lector",        icon: "����" },', '{ value: 1, label: "Lector",        icon: "L" },')
  .replace('{ value: 2, label: "Supervisor",    icon: "����" },', '{ value: 2, label: "Supervisor",    icon: "S" },')
  .replace('{ value: 3, label: "Jefe de Área",  icon: "����" },', '{ value: 3, label: "Jefe de Área",  icon: "JA" },')
  .replace('{ value: 3, label: "Jefe de +�rea",  icon: "����" },', '{ value: 3, label: "Jefe de Área",  icon: "JA" },')
  .replace('{ value: 4, label: "Productor",     icon: "����" },', '{ value: 4, label: "Productor",     icon: "P" },')
  .replace('{ value: 5, label: "Cliente Admin", icon: "����" },', '{ value: 5, label: "Cliente Admin", icon: "CA" },')
  .replace('{ value: 6, label: "Super Admin",   icon: "���" },', '{ value: 6, label: "Super Admin",   icon: "SA" },');

fs.writeFileSync(path, text, { encoding: 'utf8' });
