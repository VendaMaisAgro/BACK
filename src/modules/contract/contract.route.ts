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
 *   name: Contract
 *   description: Administração e consulta de contratos
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ContractVersionPayload:
 *       type: object
 *       required:
 *         - content
 *         - version
 *       properties:
 *         content:
 *           type: string
 *           example: "1) TÍTULO ..."
 *         version:
 *           type: string
 *           example: "1.2.0"
 *         kind:
 *           type: string
 *           enum:
 *             - sale_intermediation_cpf
 *             - sale_intermediation_cnpj
 *             - quality_agent_ps
 *             - terms_of_use
 *             - privacy_policy
 *             - sale_tos
 *           example: sale_intermediation_cpf
 *           description: Tipo de contrato. Se omitido, usa sale_tos.
 *
 *     ContractAcceptPayload:
 *       type: object
 *       required:
 *         - accepted
 *         - contractId
 *         - role
 *       properties:
 *         accepted:
 *           type: boolean
 *           example: true
 *         contractId:
 *           type: integer
 *           example: 42
 *         role:
 *           type: string
 *           enum:
 *             - BUYER
 *             - SELLER
 *         saleId:
 *           type: integer
 *           nullable: true
 *           description: Se enviado, registra aceite associado a uma venda.
 */

/**
 * @swagger
 * /contract/latest:
 *   get:
 *     summary: Retorna a última versão do contrato (por tipo)
 *     tags:
 *       - Contract
 *     parameters:
 *       - in: query
 *         name: kind
 *         schema:
 *           type: string
 *           enum:
 *             - sale_intermediation_cpf
 *             - sale_intermediation_cnpj
 *             - quality_agent_ps
 *             - terms_of_use
 *             - privacy_policy
 *             - sale_tos
 *         description: Tipo do contrato. Se omitido, retorna o último global.
 *     responses:
 *       200:
 *         description: Última versão
 *       404:
 *         description: Nenhum contrato encontrado
 */
router.get('/latest', wrap(controller.latest.bind(controller)));

/**
 * @swagger
 * /contract/pdf:
 *   get:
 *     summary: Renderiza o PDF inline do contrato mais recente (por tipo)
 *     tags:
 *       - Contract
 *     parameters:
 *       - in: query
 *         name: kind
 *         schema:
 *           type: string
 *           enum:
 *             - sale_intermediation_cpf
 *             - sale_intermediation_cnpj
 *             - quality_agent_ps
 *             - terms_of_use
 *             - privacy_policy
 *             - sale_tos
 *     responses:
 *       200:
 *         description: PDF
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/pdf', wrap(controller.generate.bind(controller)));

/**
 * @swagger
 * /contract/version:
 *   post:
 *     summary: Cria uma nova versão de contrato (com tipo)
 *     tags:
 *       - Contract
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContractVersionPayload'
 *     responses:
 *       201:
 *         description: Versão criada
 *       400:
 *         description: content e version são obrigatórios
 */
router.post('/version', protectRoute, wrap(controller.createVersion.bind(controller)));

/**
 * @swagger
 * /contract/accept:
 *   post:
 *     summary: Registra aceite de contrato sem venda (Termos/Privacidade) ou com venda se informado saleId
 *     tags:
 *       - Contract
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContractAcceptPayload'
 *     responses:
 *       201:
 *         description: Aceite registrado
 *       400:
 *         description: Parâmetros inválidos
 *       403:
 *         description: Usuário não pertence à venda (quando há saleId)
 *       404:
 *         description: Contrato inexistente ou venda não encontrada
 *       409:
 *         description: Aceite duplicado
 */
router.post('/accept', protectRoute, wrap(controller.accept.bind(controller)));

/**
 * @swagger
 * /contract/accept/status/{saleId}:
 *   get:
 *     summary: Status de aceite por venda (buyer/seller)
 *     tags:
 *       - Contract
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
 *         description: Status encontrado
 *       400:
 *         description: Parâmetros inválidos
 *       404:
 *         description: Nenhum aceite para esta venda
 */
router.get('/accept/status/:saleId', protectRoute, wrap(controller.statusBySale.bind(controller)));

export default router;