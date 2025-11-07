import { Router, Request, Response, NextFunction } from 'express';
import { ContractController } from './contract.controller';
import { protectRoute } from '../../middlewares/auth.middleware';

const router = Router();
const controller = new ContractController();

const wrap =
  (fn: (req: Request, res: Response) => Promise<any> | void) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res)).catch(next);

/**
 * @swagger
 * tags:
 *   - name: Checkout
 *     description: Fluxo de aceite de contrato por venda (comprador e vendedor)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CheckoutAcceptPayload:
 *       type: object
 *       required:
 *         - accepted
 *       properties:
 *         accepted:
 *           type: boolean
 *           example: true
 *         contractId:
 *           type: integer
 *           nullable: true
 *           example: 1
 *           description: Se omitido, usa automaticamente o contrato de intermediação por CPF/CNPJ do comprador.
 *
 *     ResolvedContract:
 *       type: object
 *       properties:
 *         saleId:
 *           type: integer
 *           example: 1
 *         contractId:
 *           type: integer
 *           example: 10
 *         kind:
 *           type: string
 *           enum:
 *             - sale_intermediation_cpf
 *             - sale_intermediation_cnpj
 *             - quality_agent_ps
 *             - terms_of_use
 *             - privacy_policy
 *             - sale_tos
 *         version:
 *           type: string
 *           example: "1.2.0"
 *         sha256Hash:
 *           type: string
 *           example: "a3f9c3..."
 *         createdAt:
 *           type: string
 *           format: date-time
 *         contentResolved:
 *           type: string
 *           description: Conteúdo do contrato com placeholders resolvidos
 *         contextPreview:
 *           type: object
 *           properties:
 *             buyer:
 *               type: object
 *             seller:
 *               type: object
 *             totals:
 *               type: object
 *         sellersInSale:
 *           type: array
 *           items:
 *             type: integer
 *           description: Lista de IDs de vendedores presentes na venda (multi-seller).
 *
 *     CheckoutStatusResponse:
 *       type: object
 *       properties:
 *         saleId:
 *           type: integer
 *           example: 1
 *         buyer:
 *           type: object
 *           nullable: true
 *           properties:
 *             accepted:
 *               type: boolean
 *             at:
 *               type: string
 *               format: date-time
 *             userId:
 *               type: integer
 *               description: ID do comprador que aceitou (resposta).
 *             contractId:
 *               type: integer
 *         sellers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               sellerId:
 *                 type: integer
 *               accepted:
 *                 type: boolean
 *               at:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               userId:
 *                 type: integer
 *                 nullable: true
 *                 description: ID do vendedor que aceitou (resposta).
 *               contractId:
 *                 type: integer
 *                 nullable: true
 *         allSellersAccepted:
 *           type: boolean
 *         bothAccepted:
 *           type: boolean
 *           description: true quando buyer.accepted && allSellersAccepted
 */

/**
 * @swagger
 * /sales/{saleId}/checkout/buyer:
 *   post:
 *     summary: Aceite do comprador (assina contrato da venda)
 *     tags:
 *       - Checkout
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckoutAcceptPayload'
 *     responses:
 *       201:
 *         description: Aceite do comprador registrado
 *       400:
 *         description: Parâmetros inválidos
 *       403:
 *         description: Usuário não é o comprador desta venda
 *       404:
 *         description: Venda ou contrato não encontrado
 *       409:
 *         description: Aceite já existente para BUYER
 */
router.post('/:saleId/checkout/buyer', protectRoute, wrap(controller.buyerAccept.bind(controller)));

/**
 * @swagger
 * /sales/{saleId}/checkout/seller:
 *   post:
 *     summary: Aceite do vendedor (confirmação final da venda)
 *     tags:
 *       - Checkout
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckoutAcceptPayload'
 *     responses:
 *       201:
 *         description: Aceite do vendedor registrado
 *       400:
 *         description: Parâmetros inválidos
 *       403:
 *         description: Usuário não é vendedor desta venda
 *       404:
 *         description: Venda ou contrato não encontrado
 *       409:
 *         description: Aceite já existente para SELLER
 */
router.post('/:saleId/checkout/seller', protectRoute, wrap(controller.sellerAccept.bind(controller)));

/**
 * @swagger
 * /sales/{saleId}/checkout/status:
 *   get:
 *     summary: Status agregado dos aceites do comprador e vendedores da venda
 *     tags:
 *       - Checkout
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Status dos aceites (multi-seller)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckoutStatusResponse'
 *       404:
 *         description: Nenhum aceite para esta venda
 */
router.get('/:saleId/checkout/status', protectRoute, wrap(controller.statusBySale.bind(controller)));

/**
 * @swagger
 * /sales/{saleId}/contract:
 *   get:
 *     summary: Retorna o contrato RESOLVIDO (placeholders preenchidos) para a venda
 *     tags:
 *       - Checkout
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: kind
 *         required: false
 *         description: Tipo do contrato. Se omitido, o sistema escolhe automaticamente por CPF/CNPJ do comprador.
 *         schema:
 *           type: string
 *           enum:
 *             - sale_intermediation_cpf
 *             - sale_intermediation_cnpj
 *             - quality_agent_ps
 *             - terms_of_use
 *             - privacy_policy
 *             - sale_tos
 *       - in: query
 *         name: sellerId
 *         required: false
 *         description: Obrigatório quando a venda possuir itens de múltiplos vendedores.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contrato resolvido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResolvedContract'
 *       400:
 *         description: sellerId é obrigatório para vendas com múltiplos vendedores
 *       404:
 *         description: Venda ou contrato não encontrado
 */
router.get('/:saleId/contract', protectRoute, wrap(controller.contractBySale.bind(controller)));

/**
 * @swagger
 * /sales/{saleId}/contract/pdf:
 *   get:
 *     summary: Retorna o PDF do contrato para a venda (placeholders resolvidos)
 *     tags:
 *       - Checkout
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: kind
 *         required: false
 *         description: Tipo do contrato. Se omitido, o sistema escolhe automaticamente por CPF/CNPJ do comprador.
 *         schema:
 *           type: string
 *           enum:
 *             - sale_intermediation_cpf
 *             - sale_intermediation_cnpj
 *             - quality_agent_ps
 *             - terms_of_use
 *             - privacy_policy
 *             - sale_tos
 *       - in: query
 *         name: sellerId
 *         required: false
 *         description: Obrigatório quando a venda possuir itens de múltiplos vendedores.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: PDF inline
 *       400:
 *         description: sellerId é obrigatório para vendas com múltiplos vendedores
 *       404:
 *         description: Venda ou contrato não encontrado
 */
router.get('/:saleId/contract/pdf', protectRoute, wrap(controller.contractPdfBySale.bind(controller)));

export default router;