import express, { RequestHandler } from 'express';
import { protectRoute } from '../../middlewares/auth.middleware';
import { PaymentController } from './payment.controller';

const router = express.Router();
const controller = new PaymentController();

/**
 * @swagger
 * /payment-methods/webhook:
 *   post:
 *     summary: Endpoint para processar webhooks do Mercado Pago
 *     description: Recebe notificações do Mercado Pago sobre mudanças no status dos pagamentos (Payment API e Orders API)
 *     tags: [PaymentMethods]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 example: "payment"
 *               topic:
 *                 type: string
 *                 example: "order"
 *               action:
 *                 type: string
 *                 example: "payment.updated"
 *               data:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: "ORD01HRYFWNYRE1MR1E60MW3X0T2P"
 *     responses:
 *       200:
 *         description: Webhook processado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 paymentId:
 *                   type: string
 *                 status:
 *                   type: string
 *       500:
 *         description: Erro ao processar webhook
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Erro ao processar webhook."
 *                 message:
 *                   type: string
 */
router.post('/webhook', controller.processWebhook as RequestHandler);

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
 * /payment-methods/methods:
 *   get:
 *     summary: Lista todos os meios de pagamento disponíveis
 *     description: Retorna todos os métodos de pagamento aceitos pelo Mercado Pago
 *     tags: [PaymentMethods]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de meios de pagamento retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: "pix"
 *                   name:
 *                     type: string
 *                     example: "PIX"
 *                   payment_type_id:
 *                     type: string
 *                     example: "bank_transfer"
 *                   status:
 *                     type: string
 *                     example: "active"
 *       500:
 *         description: Erro ao buscar meios de pagamento
 */
router.get('/methods', controller.getPaymentMethods as RequestHandler);

/**
 * @swagger
 * /payment-methods/pix:
 *   post:
 *     summary: Cria um pagamento PIX usando Orders API (Checkout Transparente)
 *     description: Cria um pagamento PIX instantâneo retornando QR Code e Pix Copia e Cola
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
 *               - amount
 *               - email
 *             properties:
 *               saleId:
 *                 type: string
 *                 description: ID da venda no sistema
 *                 example: "sale-123-abc-456"
 *               paymentMethodId:
 *                 type: string
 *                 description: ID do método de pagamento (PIX)
 *                 example: "pm-pix-001"
 *               amount:
 *                 type: number
 *                 description: Valor do pagamento
 *                 example: 150.50
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email do pagador
 *                 example: "cliente@example.com"
 *               expirationMinutes:
 *                 type: number
 *                 description: Tempo de expiração em minutos (30 a 43200 - 30 dias)
 *                 example: 60
 *                 default: 30
 *     responses:
 *       201:
 *         description: Pagamento PIX criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentId:
 *                   type: string
 *                   description: ID do pagamento no banco local
 *                   example: "pay-uuid-123-456"
 *                 orderId:
 *                   type: string
 *                   description: ID da Order no Mercado Pago
 *                   example: "ORD01HRYFWNYRE1MR1E60MW3X0T2P"
 *                 orderStatus:
 *                   type: string
 *                   example: "action_required"
 *                 payment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "PAY01HRYFXQ53Q3JPEC48MYWMR0TE"
 *                     status:
 *                       type: string
 *                       example: "action_required"
 *                     status_detail:
 *                       type: string
 *                       example: "waiting_transfer"
 *                     qr_code:
 *                       type: string
 *                       description: Código PIX Copia e Cola
 *                       example: "00020126580014br.gov.bcb.pix..."
 *                     qr_code_base64:
 *                       type: string
 *                       description: Imagem QR Code em Base64
 *                       example: "iVBORw0KGgoAAAANSUhEUgAABWQAAAVk..."
 *                     ticket_url:
 *                       type: string
 *                       description: URL da página de pagamento
 *                       example: "https://www.mercadopago.com.br/sandbox/payments/..."
 *       400:
 *         description: Dados obrigatórios não fornecidos ou inválidos
 *       500:
 *         description: Erro ao criar pagamento PIX
 */
router.post('/pix', controller.createPixPayment as RequestHandler);

/**
 * @swagger
 * /payment-methods/configure-webhook:
 *   post:
 *     summary: Configura webhook do Mercado Pago
 *     description: Registra a URL de webhook no Mercado Pago para receber notificações de pagamentos
 *     tags: [PaymentMethods]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Webhook configurado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "webhook-id-123"
 *                 url:
 *                   type: string
 *                   example: "https://api.vendamaisagro.com.br/payment-methods/webhook"
 *                 events:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       topic:
 *                         type: string
 *                         example: "payment"
 *       500:
 *         description: Erro ao configurar webhook
 */
router.post('/configure-webhook', controller.configureWebhook as RequestHandler);

/**
 * @swagger
 * /payment-methods/payments/{id}/sync:
 *   post:
 *     summary: Sincroniza o status de um pagamento com o Mercado Pago
 *     description: Busca o status atual do pagamento no Mercado Pago e atualiza no banco de dados. Útil quando o webhook não chega ou para verificação manual.
 *     tags: [PaymentMethods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pagamento no sistema
 *         example: "d307cd23-bf88-4b0d-bd33-3c93ef5f8ba6"
 *     responses:
 *       200:
 *         description: Status sincronizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 updated:
 *                   type: boolean
 *                   example: true
 *                 payment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "d307cd23-bf88-4b0d-bd33-3c93ef5f8ba6"
 *                     status:
 *                       type: string
 *                       example: "completed"
 *                     mp_payment_id:
 *                       type: string
 *                       example: "1234567890"
 *                     mp_status:
 *                       type: string
 *                       example: "approved"
 *                 mercadopago:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "1234567890"
 *                     status:
 *                       type: string
 *                       example: "approved"
 *                     transaction_amount:
 *                       type: number
 *                       example: 100.00
 *                     date_approved:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Pagamento não encontrado ou não processado ainda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Pagamento ainda não foi realizado ou processado pelo Mercado Pago"
 *       400:
 *         description: ID inválido
 *       500:
 *         description: Erro ao sincronizar status
 */
router.post('/:id/sync', controller.syncPaymentStatus as RequestHandler);

/**
 * @swagger
 * /payment-methods/payments/{id}/debug:
 *   get:
 *     summary: Debug de um pagamento - informações detalhadas
 *     description: Retorna informações completas do pagamento tanto no banco quanto no Mercado Pago para debug
 *     tags: [PaymentMethods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pagamento no sistema
 *         example: "d307cd23-bf88-4b0d-bd33-3c93ef5f8ba6"
 *     responses:
 *       200:
 *         description: Informações de debug retornadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentRecord:
 *                   type: object
 *                   description: Dados do pagamento no banco
 *                 mpData:
 *                   type: object
 *                   description: Dados do pagamento no Mercado Pago
 *                 canSync:
 *                   type: boolean
 *                   description: Se é possível sincronizar o pagamento
 *       400:
 *         description: ID inválido
 *       500:
 *         description: Erro ao buscar informações de debug
 */
router.get('/:id/debug', controller.debugPayment as RequestHandler);

/**
 * @swagger
 * /payment-methods/payments/{id}/cancel:
 *   post:
 *     summary: Cancela um pagamento PIX pendente
 *     description: Cancela um pagamento PIX que ainda não foi pago (status pending)
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
 *         example: "pay-uuid-123-456"
 *     responses:
 *       200:
 *         description: Pagamento cancelado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 paymentId:
 *                   type: string
 *                   example: "pay-uuid-123-456"
 *                 status:
 *                   type: string
 *                   example: "cancelled"
 *       400:
 *         description: Pagamento não pode ser cancelado (não está pendente)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Pagamento não pode ser cancelado. Status atual: completed"
 *       500:
 *         description: Erro ao cancelar pagamento
 */
router.post('/:id/cancel', controller.cancelPixPayment as RequestHandler);

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

export default router;