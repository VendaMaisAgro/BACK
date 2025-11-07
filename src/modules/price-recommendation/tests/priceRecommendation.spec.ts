import { PrismaClient } from '@prisma/client';
import { PriceRecommendationService } from '../priceRecommendation.service';

const prisma = new PrismaClient();
const service = new PriceRecommendationService();

describe('PriceRecommendationService', () => {
  let today: Date;
  let recId: string;

  beforeAll(async () => {
    today = new Date();
    // Cria recomendação de preço fake
    const rec = await prisma.priceRecommendation.create({
      data: {
        productName: 'TOMATE',
        marketPrice: 10.5,
        suggestedPrice: 12.0,
        date: today,
      },
    });
    recId = rec.id;
  });

  afterAll(async () => {
    await prisma.priceRecommendation.deleteMany();
    await prisma.$disconnect();
  });

  describe('getByName', () => {
    it('deve retornar recomendação pelo nome', async () => {
      const result = await service.getByName('tomate');
      expect(result).not.toBeNull();
      expect(result?.productName).toBe('TOMATE');
    });

    it('deve retornar null para nome inexistente', async () => {
      const result = await service.getByName('banana');
      expect(result).toBeNull();
    });
  });

  describe('listToday', () => {
    it('deve listar recomendações do dia', async () => {
      const results = await service.listToday();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].date.toISOString().slice(0, 10)).toBe(today.toISOString().slice(0, 10));
    });
  });

  describe('extractData', () => {
    it('deve lançar erro se não encontrar PDF', async () => {
      await expect(service.extractData('https://url-invalida')).rejects.toThrow();
    });

    // Para testar extração real, é necessário mockar fetchTodayCotacaoPdf e axios/pdf-parse.
    // Exemplo de mock:
    // it('deve extrair dados de um PDF válido', async () => {
    //   jest.spyOn(service, 'extractData').mockResolvedValue([['TOMATE', '10,00']]);
    //   const items = await service.extractData('url-fake');
    //   expect(Array.isArray(items)).toBe(true);
    // });
  });
});