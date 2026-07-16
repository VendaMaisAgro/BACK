import { Router } from "express";
import { UserController } from "./user.controller";
import multer from "multer";
import { protectRoute, requireAdmin } from "../../middlewares/auth.middleware";

const router = Router();
const controller = new UserController();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos') as any, false);
    }
  },
});

/**
 * @swagger
 * /user/register:
 *   post:
 *     summary: Cria um novo usuário
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone_number, password, role, securityQuestions]
 *             properties:
 *               name:
 *                 type: string
 *                 example: João Silva
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@email.com
 *               phone_number:
 *                 type: string
 *                 example: "11999999999"
 *               password:
 *                 type: string
 *                 description: Mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial
 *                 example: Senha@123
 *               role:
 *                 type: string
 *                 enum: [buyer, producer]
 *               cpf:
 *                 type: string
 *                 description: Obrigatório se não informar cnpj
 *                 example: "52998224725"
 *               cnpj:
 *                 type: string
 *                 description: Obrigatório se não informar cpf
 *                 example: "11222333000181"
 *               ccir:
 *                 type: string
 *                 example: "12345678"
 *               securityQuestions:
 *                 type: object
 *                 required: [answer_1, answer_2, answer_3]
 *                 properties:
 *                   answer_1:
 *                     type: string
 *                     example: Rex
 *                   answer_2:
 *                     type: string
 *                     example: Florianópolis
 *                   answer_3:
 *                     type: string
 *                     example: Maria
 *     responses:
 *       201:
 *         description: Usuário cadastrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Usuário cadastrado com sucesso!
 *       400:
 *         description: Dados inválidos ou duplicados (e-mail, CPF ou CNPJ já cadastrado)
 */
router.post("/register", controller.createHandler);

/**
 * @swagger
 * /user/admin:
 *   post:
 *     summary: Cria um novo usuário admin (somente admins podem criar outros admins)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone_number, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Admin Silva
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@empresa.com
 *               phone_number:
 *                 type: string
 *                 example: "11999999999"
 *               password:
 *                 type: string
 *                 description: Mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial
 *                 example: Senha@123
 *               cpf:
 *                 type: string
 *                 description: Obrigatório se não informar cnpj (login é sempre por CPF/CNPJ)
 *                 example: "52998224725"
 *               cnpj:
 *                 type: string
 *                 description: Obrigatório se não informar cpf (login é sempre por CPF/CNPJ)
 *                 example: "11222333000181"
 *     responses:
 *       201:
 *         description: Usuário admin criado com sucesso
 *       400:
 *         description: Dados inválidos ou e-mail já cadastrado
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Requer perfil admin
 */
router.post("/admin", protectRoute, requireAdmin, controller.createAdminHandler);

/**
 * @swagger
 * /user:
 *   get:
 *     summary: Lista todos os usuários (somente admin)
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Requer perfil admin
 */
router.get("/", protectRoute, requireAdmin, controller.getAllHandler);

/**
 * @swagger
 * /user/{id}:
 *   get:
 *     summary: Busca usuário por ID (somente o próprio usuário ou admin)
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do usuário
 *     responses:
 *       200:
 *         description: Usuário encontrado
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Requer ser o próprio usuário ou admin
 *       404:
 *         description: Usuário não encontrado
 */
router.get("/:id", protectRoute, controller.getByIdHandler);

/**
 * @swagger
 * /user/{id}:
 *   put:
 *     summary: Atualiza um usuário (somente o próprio usuário ou admin)
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Requer ser o próprio usuário ou admin
 */
router.put("/:id", protectRoute, upload.single("img"), controller.updateHandler);

/**
 * @swagger
 * /user/{id}:
 *   delete:
 *     summary: Remove um usuário (somente o próprio usuário ou admin)
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do usuário
 *     responses:
 *       204:
 *         description: Usuário removido
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Requer ser o próprio usuário ou admin
 */
router.delete("/:id", protectRoute, controller.deleteHandler);

export default router;
