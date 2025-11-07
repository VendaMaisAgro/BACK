import { Router } from 'express';
import { PriceController } from './priceRecommendation.controller';
import { validateParams } from '../../middlewares/validate';
import { getByNameParamsSchema } from './priceRecommendation.schema';
import { PriceRecommendationService } from './priceRecommendation.service';
import { syncPricesOnce } from './syncPricesJob';

const router = Router();
const ctrl = new PriceController();
const service = new PriceRecommendationService();

// formatação pt-BR (sem quebrar o contrato atual)
const toBR = (v: any) =>
  v == null
    ? null
    : new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(v));

const withPtBR = (r: any) => ({
  ...r,
  productFullName: r.productUnit
    ? `${r.productName} (${r.productUnit})`
    : r.productName,
  marketPriceBR: toBR(r.marketPrice),
  suggestedPriceBR: toBR(r.suggestedPrice),
  pricePerKgBR: r.pricePerKg == null ? null : toBR(r.pricePerKg),
});

/**
 * @swagger
 * tags:
 *   - name: PriceRecommendation
 *     description: Endpoints principais para consulta de recomendações e cotações de preços
 *   - name: PriceRecommendation (Debug)
 *     description: Rotas auxiliares para testes e sincronização de dados (não usar em produção)
 *
 * components:
 *   schemas:
 *     PriceRecommendation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: b1a2c3d4-e5f6-7890-abcd-1234567890ef
 *         productName:
 *           type: string
 *           description: Nome limpo do produto (sem tipo, números ou parênteses)
 *           example: Tomate
 *         productUnit:
 *           type: string
 *           nullable: true
 *           example: 'Cx 20 Kg'
 *         productUnitKind:
 *           type: string
 *           nullable: true
 *           example: 'Cx'
 *         productUnitKg:
 *           type: number
 *           format: float
 *           nullable: true
 *           example: 20
 *         pricePerKg:
 *           type: number
 *           format: float
 *           nullable: true
 *           example: 0.43
 *         marketPrice:
 *           type: number
 *           format: float
 *           example: 8.50
 *         suggestedPrice:
 *           type: number
 *           format: float
 *           example: 8.50
 *         date:
 *           type: string
 *           format: date
 *           example: '2025-10-09'
 *         algorithmVersion:
 *           type: string
 *           description: Origem da cotação (ama-pdf-v1 ou agrolink-ocr-v1)
 *           example: ama-pdf-v1
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: '2025-10-09T12:00:00.000Z'
 *
 *     PriceRecommendationBR:
 *       allOf:
 *         - $ref: '#/components/schemas/PriceRecommendation'
 *         - type: object
 *           properties:
 *             productFullName:
 *               type: string
 *               example: 'Tomate (Cx 20 Kg)'
 *             marketPriceBR:
 *               type: string
 *               example: '8,50'
 *             suggestedPriceBR:
 *               type: string
 *               example: '8,50'
 *             pricePerKgBR:
 *               type: string
 *               example: '0,43'
 *
 *     AgrolinkItem:
 *       type: object
 *       description: Dados coletados via OCR no site Agrolink
 *       properties:
 *         produto:
 *           type: string
 *           example: 'Alho Comum Cx 10Kg Juazeiro (BA)'
 *         name:
 *           type: string
 *           example: 'Alho Comum'
 *         unit:
 *           type: string
 *           nullable: true
 *           example: 'Cx 10 Kg'
 *         local:
 *           type: string
 *           example: 'Juazeiro (BA)'
 *         preco:
 *           type: string
 *           example: '7,20'
 *         data:
 *           type: string
 *           example: '09/10/2025'
 *
 *     AmaExtractedProduct:
 *       description: Tuplas [nome, preço] extraídas do PDF da AMA
 *       type: array
 *       items:
 *         type: array
 *         items:
 *           type: string
 *       example:
 *         - - Tomate
 *           - '8,50'
 *         - - Cenoura
 *           - '5,00'
 *
 * paths:
 *   /price-recommendations/today:
 *     get:
 *       summary: Lista recomendações do dia atual
 *       tags: [PriceRecommendation]
 *       responses:
 *         200:
 *           description: Lista de recomendações do dia
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   data:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/PriceRecommendationBR'
 *
 *   /price-recommendations/{productName}:
 *     get:
 *       summary: Busca recomendação por nome do produto
 *       tags: [PriceRecommendation]
 *       parameters:
 *         - in: path
 *           name: productName
 *           required: true
 *           schema:
 *             type: string
 *           description: Nome do produto (ex. "Tomate")
 *       responses:
 *         200:
 *           description: Recomendação encontrada
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/PriceRecommendationBR'
 *         404:
 *           description: Produto não encontrado
 *
 *   /price-recommendations/latest:
 *     get:
 *       summary: Lista o último preço de cada produto (preferindo AMA)
 *       tags: [PriceRecommendation]
 *       responses:
 *         200:
 *           description: Últimos preços registrados por produto
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   count:
 *                     type: integer
 *                   data:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/PriceRecommendationBR'
 *
 *   /price-recommendations/t/agrolink:
 *     get:
 *       summary: Coleta dados do site Agrolink (modo debug)
 *       tags: [PriceRecommendation (Debug)]
 *       responses:
 *         200:
 *           description: Dados coletados do Agrolink
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   fonte:
 *                     type: string
 *                     example: agrolink
 *                   coletados:
 *                     type: integer
 *                   itens:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/AgrolinkItem'
 *
 *   /price-recommendations/t/extract-pdf-data:
 *     get:
 *       summary: Extrai e interpreta dados de um PDF da AMA (modo debug)
 *       tags: [PriceRecommendation (Debug)]
 *       parameters:
 *         - in: query
 *           name: url
 *           required: true
 *           schema:
 *             type: string
 *           description: URL completa do PDF da AMA
 *       responses:
 *         200:
 *           description: Linhas extraídas com sucesso
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/AmaExtractedProduct'
 */

/* ================================
   Rotas normais e de debugging
   ================================ */

router.get('/today', ctrl.listToday);

router.get('/t/extract-pdf-data', ctrl.extractPdfData);

router.get('/t/agrolink', async (_req, res, next) => {
  try {
    const itens = await service.collectAgrolink();
    res.json({ fonte: 'agrolink', coletados: itens.length, itens });
  } catch (err) {
    next(err);
  }
});

router.post('/t/agrolink/sync', async (req, res, next) => {
  try {
    const overwrite = (req.query.overwrite ?? 'false') === 'true';
    const r = await service.materializeFromAgrolink(overwrite);
    res.json({ ...r, overwrite });
  } catch (err) {
    next(err);
  }
});

router.post('/t/sync', async (req, res, next) => {
  try {
    const min = Number(req.query.min ?? 10);
    const overwrite = (req.query.overwrite ?? 'false') === 'true';
    const r = await syncPricesOnce(min, overwrite);
    res.json(r);
  } catch (err) {
    next(err);
  }
});

/* ================================
   Endpoints de “último valor”
   ================================ */

router.get('/by-name/latest', async (req, res, next) => {
  try {
    const name = String(req.query.name || '').trim();
    if (!name) {
      res.status(400).json({ error: 'Parâmetro "name" é obrigatório' });
      return;
    }
    const rec = await service.getLatestByNamePreferAMA(name);
    if (!rec) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }
    res.json({ data: withPtBR(rec) });
  } catch (err) {
    next(err);
  }
});

router.get('/latest', async (_req, res, next) => {
  try {
    const rows = await service.getLatestAllPreferAMA();
    res.json({ count: rows.length, data: rows.map(withPtBR) });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/:productName/latest',
  validateParams(getByNameParamsSchema),
  async (req, res, next) => {
    try {
      const { productName } = req.params;
      const rec = await service.getLatestByNamePreferAMA(productName);
      if (!rec) {
        res.status(404).json({ error: 'Produto não encontrado' });
        return;
      }
      res.json({ data: withPtBR(rec) });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/:productName', validateParams(getByNameParamsSchema), (req, res, next) =>
  new PriceController().getByName(req, res, next)
);

export default router;