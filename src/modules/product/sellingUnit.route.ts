import express from 'express';
import { SellingUnitProductController } from './sellingunitProduct.controller';
import { protectRoute } from '../../middlewares/auth.middleware';

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

export default router;
