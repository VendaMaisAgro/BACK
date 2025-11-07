import express from 'express';
import { CartController } from "./cart.controller";
import { protectRoute } from '../../middlewares/auth.middleware';
import { RequestHandler } from 'express';

const router = express.Router();
const controller = new CartController;
router.use(protectRoute as RequestHandler);

/**
 * @swagger
 * components:
 *   schemas:
 *    CartItem:
 *     type: object
 *    required:
 *      - userId
 *      - productId
 *      - sellingUnitProductId
 *      - amount
 *      - value
 *    properties:
 *     userId:
 *      type: integer
 *      example: 1
 *     productId:
 *      type: integer
 *      example: 2
 *     sellingUnitProductId:
 *      type: integer
 *      example: 3
 *     amount:
 *      type: integer
 *      example: 5
 *     value:
 *      type: number
 *      example: 10.5
 * /cart/{userId}:
 *   get:
 *     summary: Buscar carrinho de um usuário
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Carrinho retornado com sucesso
 */
router.get("/:userId", controller.getUserCart as RequestHandler);

/**
 * @swagger
 * /cart/add:
 *   post:
 *     summary: Adiciona um item ao carrinho
 *     tags: [Cart]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *               productId:
 *                 type: integer
 *               sellingUnitProductId:
 *                 type: integer
 *               amount:
 *                 type: integer
 *               value:
 *                 type: number
 *     responses:
 *       201:
 *         description: Item adicionado com sucesso
 */
router.post("/add", controller.addToCart as RequestHandler);

/**
 * @swagger
 * /cart/item/{itemId}:
 *   put:
 *     summary: Atualiza a quantidade e o valor de um item do carrinho
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do item do carrinho a ser atualizado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - value
 *             properties:
 *               amount:
 *                 type: integer
 *                 example: 3
 *               value:
 *                 type: number
 *                 example: 29.99
 *     responses:
 *       200:
 *         description: Item atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 amount:
 *                   type: integer
 *                   example: 3
 *                 value:
 *                   type: number
 *                   example: 29.99
 *                 product:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 2
 *                     name:
 *                       type: string
 *                       example: "Banana"
 *                     description:
 *                       type: string
 *                       example: "Banana prata fresca"
 *                 sellingUnitProduct:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 5
 *                     unit:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: "Caixa de 20kg"
 *       400:
 *         description: Quantidade maior que o estoque ou dados inválidos
 *       404:
 *         description: Item não encontrado
 */

router.put("/item/:itemId", controller.updateItem as RequestHandler);

/**
 * @swagger
 * /cart/item/{itemId}:
 *   delete:
 *     summary: Remove um item do carrinho
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Item removido com sucesso
 */
router.delete("/item/:itemId", controller.removeItem as RequestHandler);

/**
 * @swagger
 * /cart/clear:
 *   delete:
 *     summary: Limpa o carrinho do usuário
 *     tags: [Cart]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *     responses:
 *       204:
 *         description: Carrinho limpo com sucesso
 */
router.delete("/clear", controller.clearCart as RequestHandler);

export default router;
