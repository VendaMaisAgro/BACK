import express, { RequestHandler } from 'express';
import { protectRoute } from '../../middlewares/auth.middleware';
import { TransportTypesController } from './transport-types.controller';

const router = express.Router();
const controller = new TransportTypesController();
router.use(protectRoute);

/**
 * @swagger
 * tags:
 *   name: Transport
 *   description: Meios de transporte
 *   externalDocs:
 *     description: Documentação externa
 *     url: https://example.com/docs
 * components:
 *   schemes:
 *     TransportType:
 *       type: object
 *       required:
 *         - type
 *         - valueFreight
 *       properties:
 *         type:
 *           type: string
 *           example: "Retirada"
 *         valueFreight:
 *           type: number
 *           example: 10.5
 */
router.post('/', controller.create as RequestHandler);

/**
 * @swagger
 * components:
 *   schemas:
 *     TransportType:
 *       type: object
 *       required:
 *         - id
 *         - type
 *         - valueFreight
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         type:
 *           type: string
 *           example: "Retirada"
 *         valueFreight:
 *           type: number
 *           example: 10.5
 *
 * /transport-types:
 *   get:
 *     summary: Busca todos os meios de transporte
 *     tags: [Transport]
 *     responses:
 *       200:
 *         description: Lista de meios de transporte
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TransportType'
 */
router.get('/', controller.getAll as RequestHandler);

router.get('/:id', controller.getById as RequestHandler);
router.put('/:id', controller.update as RequestHandler);
router.delete('/:id', controller.delete as RequestHandler);

export default router;
