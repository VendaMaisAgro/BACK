import express, { RequestHandler } from 'express';
import { protectRoute } from '../../middlewares/auth.middleware';
import { PaymentController } from './payment.controller';

const router = express.Router();
const controller = new PaymentController();
router.use(protectRoute);

/**
 * @swagger
 * /payment-methods/preference:
 *   post:
 *     summary: Cria uma preferência de pagamento Mercado Pago (Checkout Pro)
 *     description: Cria uma preferência de pagamento no Mercado Pago e registra o pagamento vinculado a uma venda
 *     tags: [PaymentMethods]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - saleId
 *               - paymentMethodId
 *               - productId
 *               - title
 *               - unit_price
 *               - quantity
 *               - amount
 *             properties:
 *               saleId:
 *                 type: string
 *                 description: ID da venda no sistema
 *                 example: "clx456ghi789"
 *               paymentMethodId:
 *                 type: string
 *                 description: ID do método de pagamento
 *                 example: "clx123abc456"
 *               productId:
 *                 type: string
 *                 description: ID do produto
 *                 example: "clx999xyz123"
 *               title:
 *                 type: string
 *                 description: Título do produto/serviço
 *                 example: "Fertilizante NPK 10-10-10 - 50kg"
 *               unit_price:
 *                 type: number
 *                 description: Preço unitário do produto
 *                 example: 250.50
 *               quantity:
 *                 type: integer
 *                 description: Quantidade de itens
 *                 example: 2
 *               amount:
 *                 type: number
 *                 description: Valor total do pagamento
 *                 example: 501.00
 *     responses:
 *       201:
 *         description: Preferência criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentId:
 *                   type: string
 *                   description: ID do pagamento criado no sistema
 *                   example: "clx789def012"
 *                 mp_preference_id:
 *                   type: string
 *                   description: ID da preferência no Mercado Pago
 *                   example: "123456789-abc-def"
 *                 init_point:
 *                   type: string
 *                   description: URL para redirecionar o usuário ao checkout
 *                   example: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=123456789"
 *       400:
 *         description: Dados obrigatórios não fornecidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Dados obrigatórios não fornecidos."
 *       500:
 *         description: Erro ao criar preferência de pagamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Erro ao criar preferência de pagamento."
 *                 message:
 *                   type: string
 *                   example: "At least one policy returned UNAUTHORIZED."
 */
router.post('/preference', controller.createPreference as RequestHandler);

/**
 * @swagger
 * /payment-methods/payments/{id}:
 *   get:
 *     summary: Busca um pagamento específico por ID
 *     tags: [PaymentMethods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pagamento
 *         example: "clx789def012"
 *     responses:
 *       200:
 *         description: Pagamento encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "ID inválido."
 *       404:
 *         description: Pagamento não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Pagamento não encontrado."
 *       500:
 *         description: Erro ao buscar pagamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Erro ao buscar pagamento."
 *                 message:
 *                   type: string
 */
router.get('/:id', controller.getById as RequestHandler);

/**
 * @swagger
 * /payment-methods/payments/{id}:
 *   patch:
 *     summary: Atualiza informações de um pagamento
 *     description: Atualiza dados como status, mp_payment_id, etc.
 *     tags: [PaymentMethods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pagamento
 *         example: "clx789def012"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected, cancelled]
 *                 example: "approved"
 *               mp_payment_id:
 *                 type: string
 *                 example: "987654321"
 *               amount:
 *                 type: number
 *                 example: 250.50
 *     responses:
 *       200:
 *         description: Pagamento atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "ID inválido."
 *       500:
 *         description: Erro ao atualizar pagamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Erro ao atualizar pagamento."
 *                 message:
 *                   type: string
 */
router.patch('/:id', controller.updatePayment as RequestHandler);

export default router;