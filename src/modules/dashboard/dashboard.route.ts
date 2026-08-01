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
 *     security:
 *       - BearerAuth: []
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
 *       Paginada — statusCounts/terminal/funnel sempre consideram todas as vendas do período filtrado, list retorna
 *       só a página pedida (já filtrada por etapa, se informada).
 *       startDate/endDate filtram por createdAt (data do pedido) e afetam statusCounts/terminal/funnel/list juntos —
 *       o dashboard inteiro reflete o período escolhido. stage filtra só a list, pela etapa calculada (0-10).
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *         description: Página da lista detalhada (1-indexed)
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20, maximum: 100 }
 *         description: Itens por página da lista detalhada (máx. 100)
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *         description: Filtra vendas com createdAt >= startDate (ISO 8601). Front computa os presets (hoje, 7/15/30 dias) e envia aqui.
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *         description: Filtra vendas com createdAt <= endDate (ISO 8601)
 *       - in: query
 *         name: stage
 *         schema: { type: string, example: "4,5,6" }
 *         description: Lista de etapas separadas por vírgula (0-10; 0 = terminal Cancelado/Recusado) para filtrar só a lista detalhada
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
 *                       stage: { type: integer, example: 0, description: "Sempre 0 — fora da esteira numerada 1-10" }
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
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, format: uuid }
 *                           orderNumber: { type: integer, example: 102 }
 *                           produto: { type: string, example: "Manga (+2)" }
 *                           vendedor: { type: string, example: "Coop X" }
 *                           valor: { type: number, example: 50000.0 }
 *                           status: { type: string, example: "Em trânsito" }
 *                           diasEtapa: { type: integer, example: 2 }
 *                     page: { type: integer, example: 1 }
 *                     pageSize: { type: integer, example: 20 }
 *                     total: { type: integer, example: 137 }
 *                     totalPages: { type: integer, example: 7 }
 *       400: { description: "page/pageSize/startDate/endDate/stage inválidos" }
 *       401: { description: Não autenticado }
 *       403: { description: Acesso restrito a administradores }
 */
router.get("/pipeline", controller.getPipelineOverview as RequestHandler);

/**
 * @swagger
 * /dashboard/alerts:
 *   get:
 *     summary: Alertas Operacionais — 4 regras de risco/atraso, com contagem e lista acionável
 *     description: >
 *       Sem pagamento antes da colheita: plannedHarvestDate já chegou e a entrada (down payment) ainda
 *       não foi confirmada. Sem upload de documentos: shippedAt preenchido mas nenhuma nota_fiscal enviada.
 *       Entrega atrasada: plannedDeliveryDate no passado sem actualDeliveryDate. Pagamento vencido: existe
 *       Payment com status='pending' há mais de 3 dias. Vendas Canceladas/Recusadas ficam fora de todas as regras.
 *       counts sempre reflete o total de cada regra; list é limitada (limit, default 50, máx. 200) e agrupada
 *       por regra, não paginada — é uma lista de exceções a resolver, não um dataset completo pra navegar.
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 200 }
 *         description: Máximo de itens retornados na lista combinada (as 4 regras somadas)
 *     responses:
 *       200:
 *         description: Alertas operacionais atuais
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 counts:
 *                   type: object
 *                   properties:
 *                     semPagamentoAntesColheita: { type: integer, example: 5 }
 *                     semUploadDocumentos: { type: integer, example: 3 }
 *                     entregaAtrasada: { type: integer, example: 7 }
 *                     pagamentoVencido: { type: integer, example: 4 }
 *                 list:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, format: uuid }
 *                           orderNumber: { type: integer, example: 10 }
 *                           problema: { type: string, example: "Sem upload de documentos (NF) após embarque" }
 *                           responsavel: { type: string, example: "Vendedor" }
 *                           acao: { type: string, example: "Cobrar upload da nota fiscal" }
 *                     total: { type: integer, example: 19, description: "Soma de counts — pode ser maior que items.length se exceder limit" }
 *                     limit: { type: integer, example: 50 }
 *       400: { description: "limit inválido (precisa ser inteiro positivo)" }
 *       401: { description: Não autenticado }
 *       403: { description: Acesso restrito a administradores }
 */
router.get("/alerts", controller.getOperationalAlerts as RequestHandler);

/**
 * @swagger
 * /dashboard/logistics:
 *   get:
 *     summary: Logística e Desempenho — tempo médio de entrega, % no prazo, atraso médio e desempenho por comprador/vendedor
 *     description: >
 *       Considera só vendas com actualDeliveryDate preenchido (efetivamente entregues), fora Canceladas/Recusadas.
 *       averageDeliveryDays: média de dias entre shippedAt e actualDeliveryDate (null se nenhuma venda tem shippedAt).
 *       onTimePercent/averageDelayDays: comparam actualDeliveryDate x plannedDeliveryDate (null se nenhuma venda
 *       tem plannedDeliveryDate); averageDelayDays considera só as entregas atrasadas (não conta as no prazo como 0).
 *       byBuyer/bySeller: mesma base de % no prazo, agrupada por comprador/vendedor (venda com múltiplos
 *       vendedores conta para cada um); alerta:true quando onTimePercent < 80%. Sem janela de tempo (histórico completo).
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Indicadores logísticos atuais
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deliveredCount: { type: integer, example: 42 }
 *                 averageDeliveryDays: { type: number, nullable: true, example: 2.5 }
 *                 onTimePercent: { type: number, nullable: true, example: 82.0 }
 *                 averageDelayDays: { type: number, nullable: true, example: 1.8 }
 *                 byBuyer:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       name: { type: string, example: "Comprador A" }
 *                       delivered: { type: integer, example: 20 }
 *                       onTimePercent: { type: number, example: 95.0 }
 *                       alerta: { type: boolean, example: false }
 *                 bySeller:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       name: { type: string, example: "Coop Y" }
 *                       delivered: { type: integer, example: 8 }
 *                       onTimePercent: { type: number, example: 60.0 }
 *                       alerta: { type: boolean, example: true }
 *       401: { description: Não autenticado }
 *       403: { description: Acesso restrito a administradores }
 */
router.get("/logistics", controller.getLogisticsOverview as RequestHandler);

export default router;
