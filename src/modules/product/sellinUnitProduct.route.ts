import express from 'express';
import { SellingUnitProductController } from './sellingunitProduct.controller';
import { protectRoute } from '../../middlewares/auth.middleware';

const router = express.Router();
const controller = new SellingUnitProductController();

router.use(protectRoute as express.RequestHandler);

/**
 * @swagger
 * components:
 *   schemas:
 *     SellingUnitProduct:
 *       type: object
 *       required:
 *         - unitId
 *         - minPrice
 *         - productId
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         unitId:
 *           type: integer
 *           example: 1
 *         minPrice:
 *           type: number
 *           example: 5.99
 *         productId:
 *           type: integer
 *           example: 1
 *         unit:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             unit:
 *               type: string
 *             title:
 *               type: string
 *         product:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *             category:
 *               type: string
 *
 *     CreateSellingUnitProduct:
 *       type: object
 *       required:
 *         - unitId
 *         - minPrice
 *         - productId
 *       properties:
 *         unitId:
 *           type: integer
 *           example: 1
 *           description: ID da unidade de venda
 *         minPrice:
 *           type: number
 *           example: 5.99
 *           description: Preço mínimo para esta unidade
 *         productId:
 *           type: integer
 *           example: 1
 *           description: ID do produto
 *
 *     UpdateSellingUnitProduct:
 *       type: object
 *       properties:
 *         unitId:
 *           type: integer
 *           example: 1
 *           description: ID da unidade de venda
 *         minPrice:
 *           type: number
 *           example: 5.99
 *           description: Preço mínimo para esta unidade
 */

/**
 * @swagger
 * /selling-unit-products:
 *   post:
 *     summary: Cria uma nova unidade de venda para um produto
 *     tags: [SellingUnitProduct]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSellingUnitProduct'
 *     responses:
 *       201:
 *         description: Unidade de venda do produto criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellingUnitProduct'
 *       400:
 *         description: Erro de validação ou referência
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/', controller.create as express.RequestHandler);

/**
 * @swagger
 * /selling-unit-products:
 *   get:
 *     summary: Lista todas as unidades de venda dos produtos
 *     tags: [SellingUnitProduct]
 *     responses:
 *       200:
 *         description: Lista de unidades de venda dos produtos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SellingUnitProduct'
 */
router.get('/', controller.getAll as express.RequestHandler);

/**
 * @swagger
 * /selling-unit-products/product/{productId}:
 *   get:
 *     summary: Lista todas as unidades de venda de um produto específico
 *     tags: [SellingUnitProduct]
 *     parameters:
 *       - in: path
 *         name: productId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do produto
 *     responses:
 *       200:
 *         description: Lista de unidades de venda do produto
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SellingUnitProduct'
 *       404:
 *         description: Produto não encontrado
 */
router.get('/product/:productId', controller.getByProductId as express.RequestHandler);

/**
 * @swagger
 * /selling-unit-products/{id}:
 *   get:
 *     summary: Busca unidade de venda do produto por ID
 *     tags: [SellingUnitProduct]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID da unidade de venda do produto
 *     responses:
 *       200:
 *         description: Unidade de venda do produto encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellingUnitProduct'
 *       404:
 *         description: Unidade de venda do produto não encontrada
 */
router.get('/:id', controller.getById as express.RequestHandler);

/**
 * @swagger
 * /selling-unit-products/{id}:
 *   put:
 *     summary: Atualiza uma unidade de venda do produto
 *     tags: [SellingUnitProduct]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID da unidade de venda do produto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSellingUnitProduct'
 *     responses:
 *       200:
 *         description: Unidade de venda do produto atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SellingUnitProduct'
 *       400:
 *         description: Erro de validação
 *       404:
 *         description: Unidade de venda do produto não encontrada
 */
router.put('/:id', controller.update as express.RequestHandler);

/**
 * @swagger
 * /selling-unit-products/{id}:
 *   delete:
 *     summary: Remove uma unidade de venda do produto
 *     tags: [SellingUnitProduct]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID da unidade de venda do produto
 *     responses:
 *       204:
 *         description: Unidade de venda do produto removida
 *       400:
 *         description: Erro - possui registros relacionados
 *       404:
 *         description: Unidade de venda do produto não encontrada
 */
router.delete('/:id', controller.delete as express.RequestHandler);

/**
 * @swagger
 * /selling-unit-products/product/{productId}:
 *   delete:
 *     summary: Remove todas as unidades de venda de um produto
 *     tags: [SellingUnitProduct]
 *     parameters:
 *       - in: path
 *         name: productId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do produto
 *     responses:
 *       200:
 *         description: Unidades de venda do produto removidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedCount:
 *                   type: integer
 *       400:
 *         description: Erro - possui registros relacionados
 *       404:
 *         description: Produto não encontrado
 */
router.delete('/product/:productId', controller.deleteByProductId as express.RequestHandler);

export default router;