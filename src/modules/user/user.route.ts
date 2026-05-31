import { Router } from "express";
import { UserController } from "./user.controller";
import multer from "multer";

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
 * /user:
 *   get:
 *     summary: Lista todos os usuários
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Lista de usuários
 */
router.get("/", controller.getAllHandler);

/**
 * @swagger
 * /user/{id}:
 *   get:
 *     summary: Busca usuário por ID
 *     tags: [User]
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
 *       404:
 *         description: Usuário não encontrado
 */
router.get("/:id", controller.getByIdHandler);

/**
 * @swagger
 * /user/{id}:
 *   put:
 *     summary: Atualiza um usuário
 *     tags: [User]
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
 */
router.put("/:id", upload.single("img"), controller.updateHandler);

/**
 * @swagger
 * /user/{id}:
 *   delete:
 *     summary: Remove um usuário
 *     tags: [User]
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
 */
router.delete("/:id", controller.deleteHandler);

export default router;
