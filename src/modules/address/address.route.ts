import { Router, RequestHandler } from "express";
import { AddressController } from "./address.controller";
import { protectRoute } from "../../middlewares/auth.middleware";

const controller = new AddressController();
const router = Router();
router.use(protectRoute as RequestHandler);

/**
 * @swagger
 * components:
 *   schemas:
 *     Address:
 *       type: object
 *       required:
 *         - addressee
 *         - phone_number_addressee
 *         - alias
 *         - street
 *         - number
 *         - cep
 *         - uf
 *         - city
 *         - default
 *       properties:
 *         addressee:
 *           type: string
 *           example: "João da Silva"
 *         phone_number_addressee:
 *           type: string
 *           example: "11999999999"
 *         alias:
 *           type: string
 *           example: "Casa"
 *         street:
 *           type: string
 *           example: "Rua das Flores"
 *         number:
 *           type: string
 *           example: "123"
 *         complement:
 *           type: string
 *           example: "Apto 45"
 *         referencePoint:
 *           type: string
 *           example: "Próximo à padaria"
 *         cep:
 *           type: string
 *           example: "01234-567"
 *         uf:
 *           type: string
 *           example: "SP"
 *         city:
 *           type: string
 *           example: "São Paulo"
 *         default:
 *           type: boolean
 *           example: "true"
 *
 * /address/{userId}:
 *   post:
 *     summary: Adiciona um endereço para o usuário (somente o próprio usuário ou admin)
 *     tags: [Address]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Address'
 *     responses:
 *       201:
 *         description: Endereço adicionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Address'
 *       400:
 *         description: Erro ao adicionar endereço
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Requer ser o próprio usuário ou admin
 */
router.post("/:userId", controller.add);

/**
 * @swagger
 * /address/set-default/{userId}/{addressId}:
 *   put:
 *     summary: Define um endereço como padrão (somente o próprio usuário ou admin)
 *     tags: [Address]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do usuário
 *       - in: path
 *         name: addressId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do endereço a ser definido como padrão
 *     responses:
 *       200:
 *         description: Endereço definido como padrão
 *       400:
 *         description: Erro ao definir endereço padrão
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Requer ser o próprio usuário ou admin
 */
router.put("/set-default/:userId/:addressId", controller.setDefault);

/**
 * @swagger
 * /address/{addressId}:
 *   put:
 *     summary: Atualiza um endereço (somente o dono do endereço ou admin)
 *     tags: [Address]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do endereço
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Address'
 *     responses:
 *       200:
 *         description: Endereço atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Address'
 *       400:
 *         description: Erro ao atualizar endereço
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Requer ser o dono do endereço ou admin
 *       404:
 *         description: Endereço não encontrado
 */
router.put("/:addressId", controller.update);

/**
 * @swagger
 * /address/{addressId}:
 *   delete:
 *     summary: Remove um endereço (somente o dono do endereço ou admin)
 *     tags: [Address]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do endereço
 *     responses:
 *       204:
 *         description: Endereço removido
 *       400:
 *         description: Erro ao remover endereço
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Requer ser o dono do endereço ou admin
 *       404:
 *         description: Endereço não encontrado
 */
router.delete("/:addressId", controller.remove);

/**
 * @swagger
 * /address/user/{userId}:
 *   get:
 *     summary: Lista endereços de um usuário (somente o próprio usuário ou admin)
 *     tags: [Address]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do usuário
 *     responses:
 *       200:
 *         description: Lista de endereços
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Address'
 *       400:
 *         description: Erro ao listar endereços
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Requer ser o próprio usuário ou admin
 */
router.get("/user/:userId", controller.list);

export default router;
