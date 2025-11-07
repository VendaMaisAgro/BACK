// src/modules/uploadS3/uploadS3.routes.ts
import { Router } from "express";
import multer from "multer";
import { protectRoute } from '../../middlewares/auth.middleware';
import { UploadS3Controller } from "./uploadS3.controller";

const router = Router();
const controller = new UploadS3Controller();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protectRoute);

/**
 * @swagger
 * /uploadS3/upload:
 *   post:
 *     summary: Faz upload de um arquivo para o S3
 *     tags: [UploadS3]
 *     responses:
 *       201:
 *         description: Arquivo enviado
 */
router.post("/upload", upload.single("file"), controller.uploadHandler);

/**
 * @swagger
 * /uploadS3:
 *   get:
 *     summary: Gera URL assinada para acessar arquivo
 *     tags: [UploadS3]
 *     parameters:
 *       - in: query
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/", controller.getUrlHandler);

/**
 * @swagger
 * /uploadS3:
 *   delete:
 *     summary: Remove um arquivo do S3
 *     tags: [UploadS3]
 *     parameters:
 *       - in: query
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 */
router.delete("/", controller.deleteHandler);

export default router;
