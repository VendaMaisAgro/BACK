import express from 'express';
import { SellingUnitProductController } from './sellingunitProduct.controller';
import { protectRoute, requireAdmin } from '../../middlewares/auth.middleware';

const router = express.Router();
const controller = new SellingUnitProductController();

/**
 * @swagger
 * /selling-units:
 *   get:
 *     summary: Lista todas as unidades de venda disponíveis (kg, un, cx, etc.)
 *     tags: [SellingUnit]
 *     responses:
 *       200:
 *         description: Lista de unidades de venda
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   unit:
 *                     type: string
 *                     example: kg
 *                   title:
 *                     type: string
 *                     example: Quilograma
 */
router.get('/', controller.getAllSellingUnits.bind(controller) as express.RequestHandler);

/**
 * @swagger
 * /selling-units:
 *   post:
 *     summary: Cria uma nova unidade de medida (somente admin)
 *     tags: [SellingUnit]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [unit, title]
 *             properties:
 *               unit:
 *                 type: string
 *                 example: kg
 *               title:
 *                 type: string
 *                 example: Quilograma
 *     responses:
 *       201: { description: Unidade de medida criada }
 *       400: { description: Dados inválidos ou duplicados }
 *       403: { description: Requer perfil admin }
 */
router.post(
  '/',
  protectRoute as express.RequestHandler,
  requireAdmin as express.RequestHandler,
  controller.createSellingUnit.bind(controller) as express.RequestHandler
);

/**
 * @swagger
 * /selling-units/{id}:
 *   put:
 *     summary: Atualiza uma unidade de medida (somente admin)
 *     tags: [SellingUnit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               unit: { type: string, example: kg }
 *               title: { type: string, example: Quilograma }
 *     responses:
 *       200: { description: Unidade de medida atualizada }
 *       400: { description: Dados inválidos ou duplicados }
 *       403: { description: Requer perfil admin }
 */
router.put(
  '/:id',
  protectRoute as express.RequestHandler,
  requireAdmin as express.RequestHandler,
  controller.updateSellingUnit.bind(controller) as express.RequestHandler
);

/**
 * @swagger
 * /selling-units/{id}:
 *   delete:
 *     summary: Remove uma unidade de medida (somente admin)
 *     tags: [SellingUnit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Unidade de medida removida }
 *       400: { description: Unidade em uso por produtos existentes }
 *       403: { description: Requer perfil admin }
 *       404: { description: Unidade não encontrada }
 */
router.delete(
  '/:id',
  protectRoute as express.RequestHandler,
  requireAdmin as express.RequestHandler,
  controller.deleteSellingUnit.bind(controller) as express.RequestHandler
);

export default router;
