export type SplitResult = { name: string; unit: string | null };
export type UnitDetails = {
  unitKind: string | null;
  unitKg: number | null;
  packCount: number | null;
};

const UNIT_WORDS = [
  'cx',
  'sc',
  'kg',
  'g',
  'l',
  'lt',
  'un',
  'unid',
  'maço',
  'maco',
  'dúzia',
  'duzia',
  'dz',
  'mo-\\d{1,2}',
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
  'produtor',
  'produtora',
  'produtores',
  'produtoras',
  'beneficiador',
  'beneficiadora',
  'beneficiadores',
  'beneficiadoras',
  'beneficiado',
  'beneficiados',
  'beneficiada',
  'beneficiadas',
  'tipo',
  'tipos',
  'E',
  // termos comerciais que não queremos no nome limpo
  'primeira',
  'segunda',
];

const UNIT_STOPWORDS = [
  'cx',
  'sc',
  'kg',
  'g',
  'l',
  'lt',
  'un',
  'unid',
  'maço',
  'maco',
  'dúzia',
  'duzia',
  'dz',
];

/* -------------------------------------------
   Função principal de limpeza de nome
-------------------------------------------- */

export function cleanProductName(raw: string): string {
  if (!raw) return '';

  const original = normSpaces(raw);
  let s = original;

  // 1) remove parênteses e o conteúdo dentro
  s = s.replace(/\([^)]*\)/g, ' ');

  // 2) remove números isolados (ex: "1ª", "2", "11", "13")
  s = s.replace(/\b\d+[ºª]?\b/g, ' ');

  // 3) remove pontuações e conectores visuais
  s = s
    .replace(/[|:–—\-]/g, ' ')
    .replace(/^[\-–—]\s*/, '')
    .replace(/[ºª°]/g, ' ')
    .trim();

  // 4) remove stopwords isoladas
  if (STOPWORDS.length) {
    const rxStops = new RegExp(`\\b(?:${STOPWORDS.join('|')})\\b`, 'gi');
    s = s.replace(rxStops, ' ');
  }

  // 5) remove prefixos tipo "PRODUTO:", "TIPO:" etc
  s = s.replace(/^(?:\w+\s*){0,2}:\s*/i, '');

  // 6) remove tokens de unidade caso ainda tenham sobrado
  if (UNIT_STOPWORDS.length) {
    const rxUnits = new RegExp(`\\b(?:${UNIT_STOPWORDS.join('|')})\\b`, 'gi');
    s = s.replace(rxUnits, ' ');
  }

  // 7) remove caracteres especiais (mantém apenas letras + espaço)
  s = s.replace(/[^\p{L}\s]/gu, ' ');

  // 8) normaliza espaços
  s = normSpaces(s);

  // 9) fallback: se a limpeza “sumir” com tudo, volta pro original
  if (!s) return original;

  return s;
}

/* -------------------------------------------
   Normalização de unidade
-------------------------------------------- */

function normalizeUnit(u: string | null): string | null {
  if (!u) return null;

  // remove parênteses e símbolos estranhos
  let s = u
    .replace(/[()]/g, ' ')
    .replace(/[^\p{L}\d\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!s) return null;

  // normaliza casos “grudados” comuns: Cx20Kg, Sc10kg, 20Kg etc.
  // Cx20Kg -> Cx 20 Kg
  s = s.replace(/(Cx|cx)\s*(\d+(?:[.,]\d+)?)\s*(Kg|kg)?/g, 'Cx $2 Kg');
  // Sc20Kg -> Sc 20 Kg
  s = s.replace(/(Sc|sc)\s*(\d+(?:[.,]\d+)?)\s*(Kg|kg)?/g, 'Sc $2 Kg');
  // 20Kg -> 20 Kg
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*(Kg|kg)\b/g, '$1 Kg');

  // padroniza siglas
  s = s
    .replace(/\bcx\b/gi, 'Cx')
    .replace(/\bsc\b/gi, 'Sc')
    .replace(/\bkg\b/gi, 'Kg')
    .replace(/\bg\b/gi, 'g')
    .replace(/\blt\b/gi, 'Lt')
    .replace(/\bl\b/gi, 'L')
    .replace(/\bunid\b/gi, 'Unid')
    .replace(/\bun\b/gi, 'Un');

  return normSpaces(s);
}

/* -------------------------------------------
   splitAgrolinkProduct
-------------------------------------------- */

/**
 * Varre de trás pra frente coletando tokens de unidade (Cx/Sc/Kg/Lt/Un + números).
 * Ex.: "Alho Comum Cx 10Kg Juazeiro (BA)" → name="Alho Comum", unit="Cx 10 Kg"
 */
export function splitAgrolinkProduct(raw: string): SplitResult {
  if (!raw) return { name: '', unit: null };

  const s = normSpaces(stripLocationSuffix(raw));
  if (!s) return { name: '', unit: null };

  const tokens = s.split(' ');
  const unitTokens: string[] = [];

  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];

    // casos grudados tipo "Cx20Kg" / "Sc15Kg"
    const glued = t.match(/^(Cx|Sc)(\d+(?:[.,]\d+)?)Kg$/i);
    if (glued) {
      const kind = glued[1]; // Cx | Sc
      const num = glued[2];  // 20
      unitTokens.unshift(kind, `${num}Kg`);
      continue;
    }

    // 10Kg, 20kg etc.
    if (RX.numWithSuffix.test(t)) {
      unitTokens.unshift(t);
      continue;
    }

    // tokens unitários simples (Cx, Sc, Kg, 20, etc.)
    if (RX.unitWord.test(t) || RX.number.test(t)) {
      unitTokens.unshift(t);
      continue;
    }

    // par "CX 10KG" já separado em dois tokens
    if (i >= 1 && RX.unitWord.test(tokens[i - 1]) && RX.numWithSuffix.test(t)) {
      unitTokens.unshift(tokens[i - 1], t);
      i--;
      continue;
    }

    // encontrou um token que não é unidade → fecha aqui
    const rawName = normSpaces(tokens.slice(0, i + 1).join(' '));
    const unit = unitTokens.length ? normalizeUnit(unitTokens.join(' ')) : null;
    return { name: cleanProductName(rawName), unit };
  }

  // se não detectou unidade, devolve só o nome limpo
  return { name: cleanProductName(s), unit: null };
}

/* -------------------------------------------
   parseUnitDetails
-------------------------------------------- */

/** Extrai unidade (Kind) e Kg numérico de uma string como "Sc 20 Kg", "Cx 13 Kg", "12 Cx 13 Kg", "1 Kg". */
export function parseUnitDetails(unit: string | null): UnitDetails {
  if (!unit) return { unitKind: null, unitKg: null, packCount: null };
  const s = normSpaces(unit);

  // "12 Cx 13 Kg" | "Cx 20 Kg" | "15 Kg"
  let m = s.match(
    /^(?:(\d+(?:[.,]\d+)?)\s+)?(Cx|Sc|Kg|Mo-\d{1,2}|Lt|L|Un|Unid)\s*(\d+(?:[.,]\d+)?)?\s*Kg?$/i
  );
  if (m) {
    const packCount = m[1] ? parseFloat(m[1].replace(',', '.')) : null;
    const kindRaw = m[2];
    const unitKind = kindRaw.charAt(0).toUpperCase() + kindRaw.slice(1).toLowerCase();

    // caso “15 Kg” → packCount=15, kind=Kg, sem grupo 3 → tratamos como Kg=15
    if (/^Kg$/i.test(unitKind) && packCount && !m[3]) {
      return { unitKind: 'Kg', unitKg: packCount, packCount: null };
    }

    const kg = m[3]
      ? parseFloat(m[3].replace(',', '.'))
      : unitKind === 'Kg'
      ? 1
      : null;

    return { unitKind, unitKg: kg ?? null, packCount };
  }

  // "1 Kg"
  m = s.match(/^(\d+(?:[.,]\d+)?)\s*Kg$/i);
  if (m) {
    return {
      unitKind: 'Kg',
      unitKg: parseFloat(m[1].replace(',', '.')),
      packCount: null,
    };
  }

  // "Kg"
  if (/^Kg$/i.test(s)) return { unitKind: 'Kg', unitKg: 1, packCount: null };

  return { unitKind: null, unitKg: null, packCount: null };
}