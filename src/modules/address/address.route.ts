import { Router } from "express";
import { AddressController } from "./address.controller";

const controller = new AddressController();
const router = Router();

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
 *     summary: Adiciona um endereço para o usuário
 *     tags: [Address]
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
 */
router.post("/:userId", controller.add);

/**
 * @swagger
 * /address/set-default/{userId}/{addressId}:
 *   put:
 *     summary: Define um endereço como padrão
 *     tags: [Address]
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
 */
router.put("/set-default/:userId/:addressId", controller.setDefault);

/**
 * @swagger
 * /address/{addressId}:
 *   put:
 *     summary: Atualiza um endereço
 *     tags: [Address]
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
 */
router.put("/:addressId", controller.update);

/**
 * @swagger
 * /address/{addressId}:
 *   delete:
 *     summary: Remove um endereço
 *     tags: [Address]
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
 */
router.delete("/:addressId", controller.remove);

/**
 * @swagger
 * /address/user/{userId}:
 *   get:
 *     summary: Lista endereços de um usuário
 *     tags: [Address]
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
 */
router.get("/user/:userId", controller.list);

export default router;
