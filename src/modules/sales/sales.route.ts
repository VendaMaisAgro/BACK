import express from "express";
import { SaleController } from "./sales.controller";
import { protectRoute } from "../../middlewares/auth.middleware";
import { RequestHandler } from "express";

const router = express.Router();
const controller = new SaleController();
router.use(protectRoute as RequestHandler);

/**
 * @swagger
 * components:
 *   schemas:
 *     BoughtProduct:
 *       type: object
 *       required: [productId, sellingUnitProductId, value, amount]
 *       properties:
 *         productId:
 *           type: string
 *           format: uuid
 *           example: "d2a4c3f8-1b2c-4d5e-8f90-1234567890ab"
 *         sellingUnitProductId:
 *           type: string
 *           format: uuid
 *           example: "f1e2d3c4-b5a6-7c8d-9e0f-112233445566"
 *         value:
 *           type: number
 *           example: 50.0
 *         amount:
 *           type: integer
 *           example: 2
 *
 *     SaleData:
 *       type: object
 *       required: [transportTypeId, transportValue, addressId, paymentMethodId, buyerId, boughtProducts]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef0123456789"
 *         transportTypeId:
 *           type: string
 *           format: uuid
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-10-10T16:35:16.684Z"
 *         shippedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         arrivedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         transportValue:
 *           type: number
 *           example: 15.5
 *         cargoWeightKg:
 *           description: Peso total da carga em KG (informado pelo vendedor). No request envia-se número; no response pode vir string (Decimal).
 *           oneOf:
 *             - type: number
 *               example: 125.5
 *             - type: string
 *               example: "125.50"
 *         productRating:
 *           type: number
 *           example: 0
 *         sellerRating:
 *           type: number
 *           example: 0
 *         sellerApproved:
 *           type: boolean
 *           nullable: true
 *           description: "Decisão do vendedor: true=aceito, false=recusado, null=pendente"
 *           example: null
 *         status:
 *           type: string
 *           example: "Pedido realizado!"
 *         addressId:
 *           type: string
 *           format: uuid
 *         paymentMethodId:
 *           type: string
 *           format: uuid
 *         buyerId:
 *           type: string
 *           format: uuid
 *         paymentCompleted:
 *           type: boolean
 *           example: false
 *         boughtProducts:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BoughtProduct'
 */
router.post("/", controller.create as RequestHandler);

/**
 * @swagger
 * /sales:
 *   post:
 *     summary: Cria uma nova venda
 *     tags: [Sales]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SaleData'
 *           examples:
 *             basico:
 *               summary: Venda simples com peso de carga
 *               value:
 *                 transportTypeId: "11111111-2222-3333-4444-555555555555"
 *                 createdAt: "2025-10-10T16:35:16.684Z"
 *                 transportValue: 15.5
 *                 cargoWeightKg: 125.5
 *                 addressId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
 *                 paymentMethodId: "99999999-8888-7777-6666-555555555555"
 *                 buyerId: "12121212-3434-5656-7878-909090909090"
 *                 boughtProducts:
 *                   - productId: "aaaaaaaa-bbbb-cccc-dddd-000000000001"
 *                     sellingUnitProductId: "aaaaaaaa-bbbb-cccc-dddd-000000000002"
 *                     value: 50
 *                     amount: 2
 *     responses:
 *       201:
 *         description: Venda criada com sucesso
 */
router.get("/", controller.getAll as RequestHandler);

/**
 * @swagger
 * /sales/{id}:
 *   get:
 *     summary: Busca venda por ID
 *     tags: [Sales]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string, format: uuid }
 *         required: true
 *         description: ID da venda
 *     responses:
 *       200:
 *         description: Venda encontrada
 */
router.get("/:id", controller.getById as RequestHandler);

/**
 * @swagger
 * /sales/{id}:
 *   put:
 *     summary: Atualiza uma venda
 *     tags: [Sales]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string, format: uuid }
 *         required: true
 *         description: ID da venda
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SaleData'
 *           examples:
 *             atualizarPeso:
 *               summary: Atualizar apenas o peso da carga (KG)
 *               value:
 *                 cargoWeightKg: 140.25
 *     responses:
 *       200:
 *         description: Venda atualizada
 */
router.put("/:id", controller.update as RequestHandler);

/**
 * @swagger
 * /sales/{id}:
 *   delete:
 *     summary: Remove uma venda
 *     tags: [Sales]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string, format: uuid }
 *         required: true
 *         description: ID da venda
 *     responses:
 *       204:
 *         description: Venda removida
 */
router.delete("/:id", controller.delete as RequestHandler);

/**
 * @swagger
 * /sales/{id}/calculate-freight:
 *   patch:
 *     summary: Calcula o valor do frete com base em distância e valor por km
 *     tags: [Sales]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID da venda (saleDataId)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [distanceKm, pricePerKm]
 *             properties:
 *               distanceKm: { type: number, example: 150 }
 *               pricePerKm: { type: number, example: 1.5 }
 *     responses:
 *       200:
 *         description: Frete calculado com sucesso
 */
router.patch("/:id/calculate-freight", controller.calculateFreight as unknown as RequestHandler);

router.get("/producer/:userId", controller.getSalesForProducer);
router.get("/buyer/:userId", controller.getPurchasesForBuyer);

/**
 * @swagger
 * /sales/{id}/seller-decision:
 *   patch:
 *     summary: Marca a decisão do vendedor (aceitar ou recusar o pedido)
 *     tags: [Sales]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID da venda (saleDataId)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [approved]
 *             properties:
 *               approved:
 *                 type: boolean
 *                 description: true=aceitar, false=recusar
 *           examples:
 *             aceitar: { value: { approved: true } }
 *             recusar: { value: { approved: false } }
 *     responses:
 *       200: { description: Decisão registrada }
 *       400: { description: Payload inválido }
 *       404: { description: Venda não encontrada }
 */
router.patch("/:id/seller-decision", controller.setSellerDecision as RequestHandler);

export default router;
