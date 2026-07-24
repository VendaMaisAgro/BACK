import express, { RequestHandler } from "express";
import { DashboardController } from "./dashboard.controller";
import { protectRoute, requireAdmin } from "../../middlewares/auth.middleware";

const router = express.Router();
const controller = new DashboardController();

router.use(protectRoute as RequestHandler);
router.use(requireAdmin as RequestHandler);

/**
 * @swagger
 * /dashboard/executive-overview:
 *   get:
 *     summary: Visão Executiva do dashboard (Faturamento, Receita e Operações — Previsto x Realizado, últimos 12 meses)
 *     description: >
 *       Faturamento: valor total contratado por venda (produtos + frete, ou adjustedContractTotal quando houver).
 *       Receita: valor efetivamente recebido (soma de Payment com status='completed').
 *       Operações: contagem de vendas.
 *       Previsto agrupa pelo mês de plannedDeliveryDate; Realizado agrupa pelo mês de actualDeliveryDate
 *       (Faturamento/Operações) ou pelo mês de confirmação do pagamento (Receita).
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Dados agregados dos últimos 12 meses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     from: { type: string, example: "2025-08" }
 *                     to: { type: string, example: "2026-07" }
 *                 faturamento:
 *                   type: object
 *                   properties:
 *                     monthly:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month: { type: string, example: "2026-07" }
 *                           label: { type: string, example: "jul/2026" }
 *                           previsto: { type: number, example: 125000.00 }
 *                           realizado: { type: number, example: 98000.00 }
 *                     accumulated:
 *                       type: object
 *                       properties:
 *                         previsto: { type: number }
 *                         realizado: { type: number }
 *                 receita:
 *                   type: object
 *                   description: Mesma estrutura de faturamento
 *                 operacoes:
 *                   type: object
 *                   properties:
 *                     monthly:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month: { type: string, example: "2026-07" }
 *                           label: { type: string, example: "jul/2026" }
 *                           previsto: { type: integer, example: 12 }
 *                           realizado: { type: integer, example: 10 }
 *       401: { description: Não autenticado }
 *       403: { description: Acesso restrito a administradores }
 */
router.get("/executive-overview", controller.getExecutiveOverview as RequestHandler);

/**
 * @swagger
 * /dashboard/pipeline:
 *   get:
 *     summary: Pipeline das Operações — status por etapa, funil e lista detalhada
 *     description: >
 *       statusCounts: contagem de vendas em cada uma das 10 etapas do pipeline (ver src/lib/pipelineStage.ts).
 *       terminal: contagem de vendas em estados terminais fora do fluxo (Cancelado, Recusado pelo vendedor).
 *       funnel: 5 baldes cumulativos (Cadastro, Pagamento, Colheita, Em Trânsito, Entrega) — cada balde conta
 *       vendas que já alcançaram ao menos aquela etapa; vendas Canceladas/Recusadas ficam fora do funil.
 *       list: 1 linha por venda (produto/vendedor resumidos quando há múltiplos itens), com status e dias na etapa atual.
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Dados agregados do pipeline
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCounts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       stage: { type: integer, example: 4 }
 *                       key: { type: string, example: "colheita_embarque" }
 *                       label: { type: string, example: "Colheita realizada/Embarque" }
 *                       count: { type: integer, example: 5 }
 *                 terminal:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key: { type: string, example: "cancelado" }
 *                       label: { type: string, example: "Cancelado" }
 *                       count: { type: integer, example: 2 }
 *                 funnel:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key: { type: string, example: "em_transito" }
 *                       label: { type: string, example: "Em Trânsito" }
 *                       count: { type: integer, example: 50 }
 *                 list:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       orderNumber: { type: integer, example: 102 }
 *                       produto: { type: string, example: "Manga (+2)" }
 *                       vendedor: { type: string, example: "Coop X" }
 *                       valor: { type: number, example: 50000.0 }
 *                       status: { type: string, example: "Em trânsito" }
 *                       diasEtapa: { type: integer, example: 2 }
 *       401: { description: Não autenticado }
 *       403: { description: Acesso restrito a administradores }
 */
router.get("/pipeline", controller.getPipelineOverview as RequestHandler);

export default router;
