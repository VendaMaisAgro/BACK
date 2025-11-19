// src/modules/price-recommendation/tests/materializeFromAgrolink.spec.ts

import { PrismaClient } from '@prisma/client';
import { PriceRecommendationService } from '../priceRecommendation.service';
import { collectAgrolinkJuazeiro } from '../agrolink.collector';

// mocka o coletor do Agrolink para não rodar Puppeteer nos testes
jest.mock('../agrolink.collector', () => ({
  collectAgrolinkJuazeiro: jest.fn(),
}));

// mocka o logger para não poluir o output de teste
jest.mock('../../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const prisma = new PrismaClient();
const service = new PriceRecommendationService();
const mockedCollect = collectAgrolinkJuazeiro as jest.MockedFunction<
  typeof collectAgrolinkJuazeiro
>;

describe('PriceRecommendationService.materializeFromAgrolink', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await prisma.priceRecommendation.deleteMany();
  });

  afterAll(async () => {
    await prisma.priceRecommendation.deleteMany();
    await prisma.$disconnect();
  });

  it('grava itens do Agrolink com campos derivados corretos no banco', async () => {
    mockedCollect.mockResolvedValue([
      {
        produto: 'Alho Comum Cx 10Kg Juazeiro (BA)',
        name: 'Alho Comum Cx 10Kg Juazeiro (BA)',
        unit: null,
        local: 'Juazeiro (BA)',
        preco: '62,80',
        data: '17/11/2025',
      },
    ] as any);

    const { coletados, gravados } = await service.materializeFromAgrolink(false);

    expect(coletados).toBe(1);
    expect(gravados).toBe(1);

    const recs = await prisma.priceRecommendation.findMany();
    expect(recs).toHaveLength(1);

    const rec = recs[0];

    // nome limpo + upper
    expect(rec.productName).toBe('ALHO COMUM');

    // unidade extraída de "Cx 10Kg"
    expect(rec.productUnit).toBe('Cx 10 Kg');
    expect(rec.productUnitKind).toBe('Cx');
    expect(Number(rec.productUnitKg)).toBeCloseTo(10, 5);

    // preço total e por Kg calculado
    expect(Number(rec.marketPrice)).toBeCloseTo(62.8, 2);
    expect(Number(rec.suggestedPrice)).toBeCloseTo(62.8, 2);
    expect(Number(rec.pricePerKg!)).toBeCloseTo(6.28, 2);

    // origem correta
    expect(rec.algorithmVersion).toBe('agrolink-ocr-v1');

    // data "17/11/2025" → 2025-11-17 em UTC
    expect(rec.date.toISOString().startsWith('2025-11-17')).toBe(true);
  });

  it('usa createMany + skipDuplicates quando overwriteExisting = false', async () => {
    mockedCollect.mockResolvedValue([
      {
        produto: 'Tomate Kg Juazeiro (BA)',
        name: 'Tomate Kg Juazeiro (BA)',
        unit: null,
        local: 'Juazeiro (BA)',
        preco: '10,50',
        data: '17/11/2025',
      },
    ] as any);

    const r1 = await service.materializeFromAgrolink(false);
    const r2 = await service.materializeFromAgrolink(false);

    expect(r1.coletados).toBe(1);
    expect(r1.gravados).toBe(1);

    // segunda chamada: mesmo produto + mesma data → não grava de novo
    expect(r2.coletados).toBe(1);
    expect(r2.gravados).toBe(0);

    const recs = await prisma.priceRecommendation.findMany();
    expect(recs).toHaveLength(1);
  });

  it('faz upsert quando overwriteExisting = true (atualizando preço e origem)', async () => {
    // primeira coleta com um preço
    mockedCollect.mockResolvedValue([
      {
        produto: 'Tomate Kg Juazeiro (BA)',
        name: 'Tomate Kg Juazeiro (BA)',
        unit: null,
        local: 'Juazeiro (BA)',
        preco: '10,50',
        data: '17/11/2025',
      },
    ] as any);

    const first = await service.materializeFromAgrolink(true);
    expect(first.coletados).toBe(1);
    expect(first.gravados).toBe(1);

    // segunda coleta do mesmo produto/data, com outro preço
    mockedCollect.mockResolvedValueOnce([
      {
        produto: 'Tomate Kg Juazeiro (BA)',
        name: 'Tomate Kg Juazeiro (BA)',
        unit: null,
        local: 'Juazeiro (BA)',
        preco: '12,00',
        data: '17/11/2025',
      },
    ] as any);

    const second = await service.materializeFromAgrolink(true);
    expect(second.coletados).toBe(1);
    expect(second.gravados).toBe(1);

    const recs = await prisma.priceRecommendation.findMany();
    expect(recs).toHaveLength(1);

    const rec = recs[0];
    expect(rec.productName).toBe('TOMATE');
    expect(Number(rec.marketPrice)).toBeCloseTo(12.0, 2);
    expect(rec.algorithmVersion).toBe('agrolink-ocr-v1');
  });
});
