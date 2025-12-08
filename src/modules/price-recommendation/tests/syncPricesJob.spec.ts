// src/modules/price-recommendation/tests/syncPricesJob.spec.ts

// 1) Mocks primeiro (por causa da hoisting do Jest)
jest.mock('../priceRecommendation.service', () => {
  const mockExtractData = jest.fn();
  const mockMaterializeFromAgrolink = jest.fn();

  const MockedService = jest.fn().mockImplementation(() => ({
    extractData: mockExtractData,
    materializeFromAgrolink: mockMaterializeFromAgrolink,
  }));

  return {
    PriceRecommendationService: MockedService,
    __mocks: { mockExtractData, mockMaterializeFromAgrolink },
  };
});

jest.mock('../../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// evita que o cron real seja agendado durante os testes
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

// 2) Agora podemos fazer require dos módulos já com os mocks aplicados
const { syncPricesOnce } = require('../syncPricesJob');
const { logger } = require('../../../lib/logger');
const { __mocks } = require('../priceRecommendation.service') as any;

const { mockExtractData, mockMaterializeFromAgrolink } = __mocks;

describe('syncPricesJob - fallback AMA -> Agrolink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve fazer fallback para Agrolink quando AMA falha, sem gerar logger.error', async () => {
    // AMA falha
    mockExtractData.mockRejectedValueOnce(new Error('Falha na AMA'));

    // Agrolink funciona
    mockMaterializeFromAgrolink.mockResolvedValueOnce({
      coletados: 30,
      gravados: 20,
    });

    const result = await syncPricesOnce(10, false);

    // resultado esperado
    expect(result).toEqual({
      ok: true,
      source: 'AGROLINK',
      amaCount: 0,
      agrolink: { coletados: 30, gravados: 20 },
    });

    // conferindo logs
    expect(logger.info).toHaveBeenCalledWith(
      '[Prices Sync] AMA falhou. Fallback Agrolink...',
      'Falha na AMA'
    );

    // ponto principal da subtask:
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('deve usar AMA quando houver itens suficientes, sem chamar Agrolink', async () => {
    mockExtractData.mockResolvedValueOnce([
      ['TOMATE', '10,50'],
      ['CENOURA', '5,00'],
    ]);

    const result = await syncPricesOnce(1, false);

    expect(result).toEqual({
      ok: true,
      source: 'AMA',
      amaCount: 2,
      agrolink: null,
    });

    expect(mockMaterializeFromAgrolink).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
