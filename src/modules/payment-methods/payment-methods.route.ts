import express, { RequestHandler } from 'express';
import { protectRoute } from '../../middlewares/auth.middleware';
import { PaymentMethodsController } from './payment-methods.controller';

const router = express.Router();
const controller = new PaymentMethodsController();
router.use(protectRoute);

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentMethod:
 *       type: object
 *       required:
 *         - id
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           example: "clx123abc456"
 *         name:
 *           type: string
 *           example: "Mercado Pago"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Payment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "clx789def012"
 *         saleId:
 *           type: string
 *           example: "clx456ghi789"
 *         paymentMethodId:
 *           type: string
 *           example: "clx123abc456"
 *         amount:
 *           type: number
 *           example: 250.50
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected, cancelled]
 *           example: "pending"
 *         mp_preference_id:
 *           type: string
 *           example: "123456789-abc-def"
 *         mp_payment_id:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

router.post('/', controller.create as RequestHandler);

/**
 * @swagger
 * /payment-methods:
 *   get:
 *     summary: Busca todos os métodos de pagamento disponíveis
 *     tags: [PaymentMethods]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de métodos de pagamento
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PaymentMethod'
 *       500:
 *         description: Erro ao buscar métodos de pagamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Falha ao buscar os tipos de pagamento, por favor tente novamente."
 */
router.get('/', controller.getAll as RequestHandler);

/**
 * @swagger
 * /payment-methods/{id}:
 *   get:
 *     summary: Busca um método de pagamento por ID
 *     tags: [PaymentMethods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do método de pagamento
 *         example: "clx123abc456"
 *     responses:
 *       200:
 *         description: Método de pagamento encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentMethod'
 *       404:
 *         description: Método de pagamento não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Método de pagamento não encontrado."
 *       500:
 *         description: Erro ao buscar método de pagamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Falha ao buscar o método de pagamento, por favor tente novamente."
 */
router.get('/:id', controller.getPaymentMethodById as RequestHandler);

/**
 * @swagger
 * /payment-methods/{id}:
 *   put:
 *     summary: Atualiza um método de pagamento por ID
 *     tags: [PaymentMethods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do método de pagamento
 *         example: "clx123abc456"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "PayPal"
 *               description:
 *                 type: string
 *                 example: "Pagamento via PayPal"
 *     responses:
 *       200:
 *         description: Método de pagamento atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentMethod'
 *       500:
 *         description: Erro ao atualizar método de pagamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Falha ao atualizar o método de pagamento, por favor tente novamente."
 */
router.put('/:id', controller.update as RequestHandler);

/**
 * @swagger
 * /payment-methods/{id}:
 *   delete:
 *     summary: Deleta um método de pagamento por ID
 *     tags: [PaymentMethods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do método de pagamento
 *         example: "clx123abc456"
 *     responses:
 *       200:
 *         description: Método de pagamento deletado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Método de pagamento deletado com sucesso."
 *       500:
 *         description: Erro ao deletar método de pagamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Falha ao deletar o método de pagamento, por favor tente novamente."
 */
router.delete('/:id', controller.delete as RequestHandler);

export default router;