import { PrismaClient, PriceRecommendation } from '@prisma/client';
import axios from 'axios';
import pdf from 'pdf-parse';
import { fetchTodayCotacaoPdf } from './fetchAmaPdf';
import { collectAgrolinkJuazeiro, AgrolinkItem } from './agrolink.collector';
import { splitAgrolinkProduct, parseUnitDetails, cleanProductName } from './agrolinkName';
import { logger } from '../../lib/logger';

/* ───────── helpers ───────── */
const parseDecimal = (v: string) =>
  parseFloat(v.replace(/\./g, '').replace(',', '.'));

const parseDateBRtoUS = (dmy: string) => {
  const [day, month, year] = dmy.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`; // yyyy-mm-dd
};

const dateBRToUTCDate = (dmy: string) => {
  const [yyyy, mm, dd] = parseDateBRtoUS(dmy).split('-').map(Number);
  return new Date(Date.UTC(yyyy, mm - 1, dd));
};

const prefRank = (alg?: string | null) => {
  const s = (alg || '').toLowerCase();
  if (s.startsWith('ama')) return 3;        // AMA primeiro
  if (s.startsWith('agrolink')) return 2;   // depois Agrolink
  return 1;                                 // demais
};

// escapa texto para regex
const rxEscape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// remove o local (ex.: "Juazeiro (BA)") do texto do produto
const stripLocalFrom = (raw: string, local?: string) => {
  let s = raw || '';

  if (local) {
    const rx = new RegExp(`\\s*${rxEscape(local)}\\s*`, 'i');
    s = s.replace(rx, ' ');
  }

  // fallback: limpa padrões comuns de UF/cidade no fim
  s = s
    .replace(/\bJUAZEIRO\s*\(BA\)\b/gi, ' ')
    .replace(/\(\s*[A-Z]{2}\s*\)\s*$/g, ' ')
    .replace(/\bJUAZEIRO\b\s*$/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return s;
};

const computePricePerKg = (priceNum: number, unitKg: number | null) =>
  unitKg && unitKg > 0 ? Number((priceNum / unitKg).toFixed(2)) : null;

/**
 * Normaliza um nome de produto para gravação no banco:
 * - aplica cleanProductName
 * - remove espaços duplicados
 * - trim
 * - UPPERCASE
 *
 * Se o resultado ficar vazio, retorna null (caller decide se ignora a linha).
 */
const sanitizeProductNameForDb = (raw: string): string | null => {
  const cleaned = cleanProductName(raw || '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .toUpperCase();

  if (!cleaned) {
    return null;
  }
  return cleaned;
};

/* ───────── prisma ───────── */
const prisma = new PrismaClient();

/* ───────── service ───────── */
export class PriceRecommendationService {
  /* ↓ consultas simples */
  async getByName(name: string) {
    const cleaned = cleanProductName(name);
    return prisma.priceRecommendation.findFirst({
      where: { productName: { equals: cleaned, mode: 'insensitive' } },
    });
  }

  async listToday() {
    const todayISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return prisma.priceRecommendation.findMany({
      where: { date: new Date(todayISO) },
      orderBy: { productName: 'asc' },
    });
  }

  /** regex para “99,99” (com/sem milhar) */
  private priceRx = /\d{1,3}(?:\.\d{3})*,\d{2}/g;

  /** lê blocos 3-linhas: nome | medida | preços (AMA) */
  private extractProducts(lines: string[]): Array<{ name: string; price: string; measure?: string }> {
    const items: Array<{ name: string; price: string; measure?: string }> = [];

    for (let i = 2; i < lines.length; i++) {
      const priceLine = lines[i];
      const prices = [...priceLine.matchAll(this.priceRx)];
      if (!prices.length) continue;

      const price = prices.at(-1)![0];    // último valor
      const nameLine = lines[i - 2];      // duas acima
      const measLine = lines[i - 1];      // uma acima (medida)

      if (/^data[:\s]/i.test(nameLine) || !nameLine.trim()) continue;

      const name = nameLine.replace(/\s{2,}/g, ' ').trim();
      const measure = (measLine || '').replace(/\s+/g, ' ').trim(); // ex.: "UNID." ou "KG"
      items.push({ name, price, measure });
    }
    return items;
  }

  /* -------- pipeline principal AMA -------- */
  async extractData(url?: string): Promise<[string, string][]> {
    /* 1 — URL final do PDF */
    let pdfUrl = url;
    if (!pdfUrl) {
      const fetched = await fetchTodayCotacaoPdf();
      if (!fetched) throw new Error('Nenhum PDF de cotação encontrado para hoje');
      pdfUrl = fetched;
    }

    /* 2 — download e texto */
    const arrayBuffer = (
      await axios.get<ArrayBuffer>(pdfUrl, { responseType: 'arraybuffer' })
    ).data;
    const { text } = await pdf(Buffer.from(arrayBuffer));

    /* 3 — extrai data dd/mm/yyyy */
    const mDate = text.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (!mDate) throw new Error('Data não encontrada no PDF');

    const priceDate = dateBRToUTCDate(mDate[1]);

    /* 4 — tokeniza linhas úteis */
    const rawLines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    /* 5 — extrai produtos */
    const items = this.extractProducts(rawLines);
    logger.info('[AMA Sync] linhas totais:', rawLines.length);
    logger.info('[AMA Sync] produtos detectados:', items.length);

    /* 6 — grava no banco (com sanização forte de nome) */
    const dataToInsert = items
      .map(({ name, price, measure }) => {
        const productName = sanitizeProductNameForDb(name);
        if (!productName) {
          logger.warn('[AMA Sync] Nome limpo vazio, ignorando linha:', { rawName: name });
          return null;
        }

        const measureUpper = (measure || '').toUpperCase();

        // regra simples: "KG" → Kind=Kg, Kg=1; "UNID." → Kind=Un, Kg=null
        const productUnitKind =
          /KG\b/.test(measureUpper) ? 'Kg' :
          /UNID/.test(measureUpper) ? 'Un' : null;

        const productUnitKg =
          productUnitKind === 'Kg' ? 1 : null;

        const priceNum = parseDecimal(price);
        const pricePerKg =
          productUnitKg && productUnitKg > 0 ? Number((priceNum / productUnitKg).toFixed(2)) : null;

        return {
          productName,
          productUnit: null,                 // manter compat; se quiser pode guardar "Kg" / "Un"
          productUnitKind,
          productUnitKg,
          pricePerKg,
          marketPrice: priceNum,
          suggestedPrice: priceNum,
          date: priceDate,
          algorithmVersion: 'ama-pdf-v1',
        };
      })
      .filter((row): row is any => row !== null);

    if (dataToInsert.length === 0) {
      logger.warn('[AMA Sync] Nenhum item válido para inserir após sanitização');
    } else {
      await prisma.priceRecommendation.createMany({
        data: dataToInsert,
        skipDuplicates: true,
      });
    }

    // mantém a assinatura do endpoint de debug (pares [nome, preço])
    return items.map(({ name, price }) => [name, price] as [string, string]);
  }

  /* ======  AGROLINK  ======= */

  /** Apenas coleta do Agrolink (OCR), sem salvar */
  async collectAgrolink(): Promise<AgrolinkItem[]> {
    return collectAgrolinkJuazeiro();
  }

  /**
   * Coleta do Agrolink e materializa em PriceRecommendation.
   * - overwriteExisting=false (padrão): createMany + skipDuplicates (NÃO substitui AMA).
   * - overwriteExisting=true: upsert (substitui se já existir productName+date).
   * Obs.: split para armazenar productName, productUnit, productUnitKind, productUnitKg e pricePerKg.
   */
  async materializeFromAgrolink(
    overwriteExisting = false
  ): Promise<{ coletados: number; gravados: number }> {
    const items = await this.collectAgrolink();

    if (!overwriteExisting) {
      const data = items
        .map((it) => {
          const raw = stripLocalFrom(it.produto || (it as any).name || '', it.local);
          const { name, unit } = splitAgrolinkProduct(raw);
          const productName = sanitizeProductNameForDb(name || raw);

          if (!productName) {
            logger.warn('[Agrolink Sync] Nome limpo vazio, ignorando item:', {
              rawProduto: it.produto,
              parsedName: name,
            });
            return null;
          }

          const details = parseUnitDetails(unit);
          const priceNum = parseDecimal(it.preco);
          const pKg = computePricePerKg(priceNum, details.unitKg);

          return {
            productName,
            productUnit: unit ?? null,
            productUnitKind: details.unitKind,
            productUnitKg: details.unitKg,
            pricePerKg: pKg,
            marketPrice: priceNum,
            suggestedPrice: priceNum,
            date: dateBRToUTCDate(it.data),
            algorithmVersion: 'agrolink-ocr-v1',
          };
        })
        .filter((row): row is any => row !== null);

      if (data.length === 0) {
        logger.warn('[Agrolink Sync] Nenhum item válido para inserir após sanitização');
        return { coletados: items.length, gravados: 0 };
      }

      const { count } = await prisma.priceRecommendation.createMany({
        data,
        skipDuplicates: true,
      });

      return { coletados: items.length, gravados: count };
    }

    // overwriteExisting = true → upsert por (productName, date)
    let gravados = 0;
    for (const it of items) {
      const raw = stripLocalFrom(it.produto || (it as any).name || '', it.local);
      const { name, unit } = splitAgrolinkProduct(raw);
      const productName = sanitizeProductNameForDb(name || raw);

      if (!productName) {
        logger.warn('[Agrolink Sync] Nome limpo vazio (overwrite=true), ignorando item:', {
          rawProduto: it.produto,
          parsedName: name,
        });
        continue;
      }

      const details = parseUnitDetails(unit);
      const productUnit = unit ?? null;
      const date = dateBRToUTCDate(it.data);
      const priceNum = parseDecimal(it.preco);
      const pKg = computePricePerKg(priceNum, details.unitKg);

      await prisma.priceRecommendation.upsert({
        where: { productName_date: { productName, date } },
        update: {
          productUnit,
          productUnitKind: details.unitKind,
          productUnitKg: details.unitKg,
          pricePerKg: pKg,
          marketPrice: priceNum,
          suggestedPrice: priceNum,
          algorithmVersion: 'agrolink-ocr-v1',
        },
        create: {
          productName,
          productUnit,
          productUnitKind: details.unitKind,
          productUnitKg: details.unitKg,
          pricePerKg: pKg,
          marketPrice: priceNum,
          suggestedPrice: priceNum,
          date,
          algorithmVersion: 'agrolink-ocr-v1',
        },
      });
      gravados++;
    }

    return { coletados: items.length, gravados };
  }

  /* ===== Latest (prefer AMA) ===== */

  /** Último registro para UM produto, com preferência AMA em empates */
  async getLatestByNamePreferAMA(name: string): Promise<PriceRecommendation | null> {
    const rows = await prisma.priceRecommendation.findMany({
      where: { productName: { equals: cleanProductName(name), mode: 'insensitive' } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
    if (!rows.length) return null;

    const topDateMs = rows[0].date.getTime();
    const candidates = rows.filter((r) => r.date.getTime() === topDateMs);

    candidates.sort((a, b) => {
      const byRank = prefRank(b.algorithmVersion) - prefRank(a.algorithmVersion);
      if (byRank !== 0) return byRank;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return candidates[0] || null;
  }

  /** Último registro para CADA produto, com preferência AMA em empates */
  async getLatestAllPreferAMA() {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        productName: string;
        productUnit: string | null;
        productUnitKind: string | null;
        productUnitKg: any | null;
        pricePerKg: any | null;
        marketPrice: any;
        suggestedPrice: any;
        date: Date;
        algorithmVersion: string | null;
        createdAt: Date;
      }>
    >`
      WITH latest_date AS (
        SELECT "productName", MAX("date") AS max_date
        FROM "PriceRecommendation"
        GROUP BY "productName"
      ),
      candidates AS (
        SELECT pr.*
        FROM "PriceRecommendation" pr
        JOIN latest_date ld
          ON pr."productName" = ld."productName" AND pr."date" = ld.max_date
      ),
      ranked AS (
        SELECT
          c.*,
          CASE
            WHEN lower(c."algorithmVersion") LIKE 'ama%' THEN 2
            WHEN lower(c."algorithmVersion") LIKE 'agrolink%' THEN 1
            ELSE 0
          END AS source_rank,
          ROW_NUMBER() OVER (
            PARTITION BY c."productName"
            ORDER BY
              CASE
                WHEN lower(c."algorithmVersion") LIKE 'ama%' THEN 2
                WHEN lower(c."algorithmVersion") LIKE 'agrolink%' THEN 1
                ELSE 0
              END DESC,
              c."createdAt" DESC
          ) AS rn
        FROM candidates c
      )
      SELECT
        id,
        "productName",
        "productUnit",
        "productUnitKind",
        "productUnitKg",
        "pricePerKg",
        "marketPrice",
        "suggestedPrice",
        "date",
        "algorithmVersion",
        "createdAt"
      FROM ranked
      WHERE rn = 1
      ORDER BY "productName" ASC;
    `;
    return rows as any;
  }
}