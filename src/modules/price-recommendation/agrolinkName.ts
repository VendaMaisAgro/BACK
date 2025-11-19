export type SplitResult = { name: string; unit: string | null };
export type UnitDetails = { unitKind: string | null; unitKg: number | null; packCount: number | null };

const UNIT_WORDS = [
  'cx', 'sc', 'kg', 'g', 'l', 'lt', 'un', 'unid',
  'maço', 'maco', 'dúzia', 'duzia', 'dz', 'mo-\\d{1,2}'
];

const RX = {
  number: /^\d+(?:[.,]\d+)?$/i,
  numWithSuffix: /^\d+(?:[.,]\d+)?\s*(kg|g|l|lt)$/i,
  unitWord: new RegExp(`^(?:${UNIT_WORDS.join('|')})$`, 'i'),
};

export const normSpaces = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Remove sufixos de localidade comuns no texto do produto */
export function stripLocationSuffix(s: string) {
  return s
    .replace(/\bJUAZEIRO\s*\(BA\)\b/gi, ' ')
    .replace(/\(\s*[A-Z]{2}\s*\)\s*$/g, ' ') // “(BA)” etc no final
    .replace(/\bJUAZEIRO\b\s*$/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* -------------------------------------------
   STOPWORDS para limpar nomes de produtos
-------------------------------------------- */
const STOPWORDS = [
  'produtor', 'produtora', 'produtores', 'produtoras',
  'beneficiador', 'beneficiadora', 'beneficiadores', 'beneficiadoras',
  'beneficiado', 'beneficiados', 'beneficiada', 'beneficiadas',
  'tipo', 'tipos', 'E',
  'primeira', 'segunda'
];

/* Palavras de unidades que NÃO devem ficar no nome limpo */
const UNIT_STOPWORDS = [
  'cx', 'sc', 'kg', 'g', 'l', 'lt', 'un', 'unid',
  'maço', 'maco', 'dúzia', 'duzia', 'dz'
];

/* -------------------------------------------
   Função de normalização principal
-------------------------------------------- */
export function cleanProductName(raw: string): string {
  if (!raw) return '';

  const original = normSpaces(raw);
  let s = original;

  // remove parênteses e o conteúdo dentro
  s = s.replace(/\([^)]*\)/g, ' ');

  // remove números isolados
  s = s.replace(/\b\d+[ºª]?\b/g, ' ');

  // remove pontuações
  s = s
    .replace(/[|:–—\-]/g, ' ')
    .replace(/^[\-–—]\s*/, '')
    .replace(/[ºª°]/g, ' ')
    .trim();

  // remove STOPWORDS
  if (STOPWORDS.length) {
    const rxStops = new RegExp(`\\b(?:${STOPWORDS.join('|')})\\b`, 'gi');
    s = s.replace(rxStops, ' ');
  }

  // remove prefixos tipo "Produto:", "Tipo:"
  s = s.replace(/^(?:\w+\s*){0,2}:\s*/i, '');

  // remove tokens de unidade caso ainda sobrem
  if (UNIT_STOPWORDS.length) {
    const rxUnits = new RegExp(`\\b(?:${UNIT_STOPWORDS.join('|')})\\b`, 'gi');
    s = s.replace(rxUnits, ' ');
  }

  // remove caracteres especiais, mantendo só letras e espaços
  s = s.replace(/[^\p{L}\s]/gu, ' ');

  // normaliza espaços
  s = normSpaces(s);

  // fallback: evita retornar vazio
  if (!s) return original;

  return s;
}

/* -------------------------------------------
   splitAgrolinkProduct
-------------------------------------------- */
function normalizeUnit(u: string) {
  return u
    .replace(/(\d)\s*(kg|g|l|lt)\b/gi, '$1 $2') // 10KG -> 10 Kg
    .replace(/\bcx\b/gi, 'Cx')
    .replace(/\bsc\b/gi, 'Sc')
    .replace(/\bkg\b/gi, 'Kg')
    .replace(/\bg\b/gi, 'g')
    .replace(/\blt\b/gi, 'Lt')
    .replace(/\bl\b/gi, 'L')
    .replace(/\bunid\b/gi, 'Unid')
    .replace(/\bun\b/gi, 'Un')
    .replace(/\bm[ao]ço\b/gi, 'Maço')
    .replace(/\bd[úu]zia\b/gi, 'Dúzia')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Varre de trás para frente para separar nome + unidade */
export function splitAgrolinkProduct(raw: string): SplitResult {
  if (!raw) return { name: '', unit: null };

  const s = normSpaces(stripLocationSuffix(raw));
  if (!s) return { name: '', unit: null };

  const tokens = s.split(' ');
  const unitTokens: string[] = [];

  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];

    if (RX.numWithSuffix.test(t)) { unitTokens.unshift(t); continue; }
    if (RX.unitWord.test(t) || RX.number.test(t)) { unitTokens.unshift(t); continue; }

    if (i >= 1 && RX.unitWord.test(tokens[i - 1]) && RX.numWithSuffix.test(t)) {
      unitTokens.unshift(tokens[i - 1], t);
      i--;
      continue;
    }

    const rawName = normSpaces(tokens.slice(0, i + 1).join(' '));
    const unit = unitTokens.length ? normalizeUnit(unitTokens.join(' ')) : null;
    return { name: cleanProductName(rawName), unit };
  }

  return { name: cleanProductName(s), unit: null };
}

/* -------------------------------------------
   parseUnitDetails
-------------------------------------------- */
export function parseUnitDetails(unit: string | null): UnitDetails {
  if (!unit) return { unitKind: null, unitKg: null, packCount: null };
  const s = normSpaces(unit);

  let m = s.match(/^(?:(\d+(?:[.,]\d+)?)\s+)?(Cx|Sc|Kg|Mo-\d{1,2}|Lt|L|Un|Unid)\s*(\d+(?:[.,]\d+)?)?\s*Kg?$/i);
  if (m) {
    const packCount = m[1] ? parseFloat(m[1].replace(',', '.')) : null;
    const kindRaw = m[2];
    const unitKind = kindRaw.charAt(0).toUpperCase() + kindRaw.slice(1).toLowerCase();

    if (/^Kg$/i.test(unitKind) && packCount && !m[3]) {
      return { unitKind: 'Kg', unitKg: packCount, packCount: null };
    }

    const kg = m[3] ? parseFloat(m[3].replace(',', '.')) : (unitKind === 'Kg' ? 1 : null);
    return { unitKind, unitKg: kg ?? null, packCount };
  }

  m = s.match(/^(\d+(?:[.,]\d+)?)\s*Kg$/i);
  if (m) {
    return { unitKind: 'Kg', unitKg: parseFloat(m[1].replace(',', '.')), packCount: null };
  }

  if (/^Kg$/i.test(s)) return { unitKind: 'Kg', unitKg: 1, packCount: null };

  return { unitKind: null, unitKg: null, packCount: null };
}
