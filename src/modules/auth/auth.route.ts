import express from 'express';

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Endpoints de autenticação
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Realiza o login do usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *       401:
 *         description: Credenciais inválidas
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Realiza o logout do usuário
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 */

/**
 * @swagger
 * /auth/recover-password:
 *   post:
 *     summary: Recupera a senha do usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Instruções de recuperação enviadas
 *       404:
 *         description: Usuário não encontrado
 */
import { login, logout } from './auth.controller';
import { recoverPassword } from './auth.controller';

const authRouter = express.Router();



authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.post('/recover-password', recoverPassword);

export default authRouter;
