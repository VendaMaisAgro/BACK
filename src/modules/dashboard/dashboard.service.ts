import { PrismaClient } from "@prisma/client";
import { calculatePipelineStage, PIPELINE_STAGES } from "../../lib/pipelineStage";

interface MonthBucket {
  key: string; // "2026-07"
  label: string; // "jul/2026"
  start: Date;
  end: Date; // exclusivo
}

interface MonthlyValue {
  month: string;
  label: string;
  previsto: number;
  realizado: number;
}

interface MoneySeries {
  monthly: MonthlyValue[];
  accumulated: { previsto: number; realizado: number };
}

interface CountSeries {
  monthly: MonthlyValue[];
}

export interface ExecutiveOverview {
  period: { from: string; to: string };
  faturamento: MoneySeries;
  receita: MoneySeries;
  operacoes: CountSeries;
}

function buildLast12Months(now: Date): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = start.toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" });
    buckets.push({ key, label, start, end });
  }
  return buckets;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function round2(value: number): number {
  return parseFloat(value.toFixed(2));
}

function round1(value: number): number {
  return parseFloat(value.toFixed(1));
}

function diffInDays(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 86_400_000;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function contractTotalOf(sale: {
  transportValue: number;
  adjustedContractTotal: number | null;
  boughtProducts: { value: number }[];
}): number {
  return sale.adjustedContractTotal ?? sale.boughtProducts.reduce((sum, bp) => sum + bp.value, 0) + sale.transportValue;
}

const FUNNEL_BUCKETS = [
  { key: "cadastro", label: "Cadastro", minStage: 1 },
  { key: "pagamento", label: "Pagamento", minStage: 2 },
  { key: "colheita", label: "Colheita", minStage: 3 },
  { key: "em_transito", label: "Em Trânsito", minStage: 5 },
  { key: "entrega", label: "Entrega", minStage: 7 },
] as const;

export interface PipelineStatusCount {
  stage: number;
  key: string;
  label: string;
  count: number;
}

export interface PipelineFunnelBucket {
  key: string;
  label: string;
  count: number;
}

export interface PipelineListItem {
  id: string;
  orderNumber: number;
  produto: string;
  vendedor: string;
  valor: number;
  status: string;
  diasEtapa: number;
}

export interface PipelineSummary {
  statusCounts: PipelineStatusCount[];
  terminal: PipelineStatusCount[];
  funnel: PipelineFunnelBucket[];
}

export interface PipelineListPage {
  items: PipelineListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PipelineDateFilter {
  startDate?: Date;
  endDate?: Date;
}

function buildCreatedAtWhere(filter: PipelineDateFilter): Record<string, unknown> {
  if (!filter.startDate && !filter.endDate) return {};
  return {
    createdAt: {
      ...(filter.startDate && { gte: filter.startDate }),
      ...(filter.endDate && { lte: filter.endDate }),
    },
  };
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Quando o filtro `stage` é usado sem startDate, o scan leve precisa de uma janela máxima —
 * senão pode virar um scan do dataset inteiro (etapa é campo derivado, não dá pra filtrar/paginar
 * só no banco). 180 dias cobre o uso prático (ver "quem está em tal etapa" recentemente).
 */
const MAX_STAGE_FILTER_WINDOW_DAYS = 180;

/** Prazo padrão (dias) considerado para um pagamento pendente "vencer" — mesmo default usado ao gerar boleto (expirationDays). */
const PENDING_PAYMENT_OVERDUE_DAYS = 3;
const DEFAULT_ALERT_LIST_LIMIT = 50;
const MAX_ALERT_LIST_LIMIT = 200;
const ACTIVE_SALE_STATUS_FILTER = { notIn: ["Cancelado", "Recusado pelo vendedor"] };

const ALERT_TYPES = {
  semPagamentoAntesColheita: {
    problema: "Sem pagamento antes da colheita",
    responsavel: "Comprador",
    acao: "Cobrar pagamento da entrada",
  },
  semUploadDocumentos: {
    problema: "Sem upload de documentos (NF) após embarque",
    responsavel: "Vendedor",
    acao: "Cobrar upload da nota fiscal",
  },
  entregaAtrasada: {
    problema: "Entrega atrasada",
    responsavel: "Vendedor",
    acao: "Verificar status da entrega",
  },
  pagamentoVencido: {
    problema: "Pagamento vencido",
    responsavel: "Comprador",
    acao: "Cobrar pagamento pendente",
  },
} as const;

export interface OperationalAlertCounts {
  semPagamentoAntesColheita: number;
  semUploadDocumentos: number;
  entregaAtrasada: number;
  pagamentoVencido: number;
}

export interface OperationalAlertItem {
  id: string;
  orderNumber: number;
  problema: string;
  responsavel: string;
  acao: string;
}

export interface OperationalAlertsOverview {
  counts: OperationalAlertCounts;
  list: { items: OperationalAlertItem[]; total: number; limit: number };
}

/** Abaixo desse percentual de entregas no prazo, comprador/vendedor entra com alerta:true. */
const ON_TIME_ALERT_THRESHOLD_PERCENT = 80;

export interface LogisticsPartyPerformance {
  id: string;
  name: string;
  delivered: number;
  onTimePercent: number;
  alerta: boolean;
}

export interface LogisticsOverview {
  deliveredCount: number;
  averageDeliveryDays: number | null;
  onTimePercent: number | null;
  averageDelayDays: number | null;
  byBuyer: LogisticsPartyPerformance[];
  bySeller: LogisticsPartyPerformance[];
}

export class DashboardService {
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Visão Executiva: Faturamento (valor contratado) e Receita (valor efetivamente recebido)
   * Previsto x Realizado por mês, últimos 12 meses, + Operações (contagem) Previsto x Realizado.
   * Previsto agrupa pela data planejada de entrega (plannedDeliveryDate); Realizado agrupa pela
   * data efetiva (actualDeliveryDate para faturamento/operações, Payment.updatedAt para receita).
   */
  async getExecutiveOverview(now: Date = new Date()): Promise<ExecutiveOverview> {
    const months = buildLast12Months(now);
    const windowStart = months[0].start;
    const windowEnd = months[months.length - 1].end;

    const [previstoSales, realizadoSales, completedPayments] = await Promise.all([
      this.prisma.saleData.findMany({
        where: { plannedDeliveryDate: { gte: windowStart, lt: windowEnd } },
        select: {
          plannedDeliveryDate: true,
          transportValue: true,
          adjustedContractTotal: true,
          boughtProducts: { select: { value: true } },
        },
      }),
      this.prisma.saleData.findMany({
        where: { actualDeliveryDate: { gte: windowStart, lt: windowEnd } },
        select: {
          actualDeliveryDate: true,
          transportValue: true,
          adjustedContractTotal: true,
          boughtProducts: { select: { value: true } },
        },
      }),
      this.prisma.payment.findMany({
        where: { status: "completed", updatedAt: { gte: windowStart, lt: windowEnd } },
        select: { amount: true, updatedAt: true },
      }),
    ]);

    const previstoPorMes = new Map<string, number>();
    const previstoOperacoesPorMes = new Map<string, number>();
    for (const sale of previstoSales) {
      const key = monthKey(sale.plannedDeliveryDate as Date);
      previstoPorMes.set(key, (previstoPorMes.get(key) ?? 0) + contractTotalOf(sale));
      previstoOperacoesPorMes.set(key, (previstoOperacoesPorMes.get(key) ?? 0) + 1);
    }

    const realizadoFaturamentoPorMes = new Map<string, number>();
    const realizadoOperacoesPorMes = new Map<string, number>();
    for (const sale of realizadoSales) {
      const key = monthKey(sale.actualDeliveryDate as Date);
      realizadoFaturamentoPorMes.set(key, (realizadoFaturamentoPorMes.get(key) ?? 0) + contractTotalOf(sale));
      realizadoOperacoesPorMes.set(key, (realizadoOperacoesPorMes.get(key) ?? 0) + 1);
    }

    const realizadoReceitaPorMes = new Map<string, number>();
    for (const payment of completedPayments) {
      const key = monthKey(payment.updatedAt);
      realizadoReceitaPorMes.set(key, (realizadoReceitaPorMes.get(key) ?? 0) + payment.amount);
    }

    const faturamentoMonthly: MonthlyValue[] = [];
    const receitaMonthly: MonthlyValue[] = [];
    const operacoesMonthly: MonthlyValue[] = [];

    for (const { key, label } of months) {
      const previsto = round2(previstoPorMes.get(key) ?? 0);
      faturamentoMonthly.push({ month: key, label, previsto, realizado: round2(realizadoFaturamentoPorMes.get(key) ?? 0) });
      receitaMonthly.push({ month: key, label, previsto, realizado: round2(realizadoReceitaPorMes.get(key) ?? 0) });
      operacoesMonthly.push({
        month: key,
        label,
        previsto: previstoOperacoesPorMes.get(key) ?? 0,
        realizado: realizadoOperacoesPorMes.get(key) ?? 0,
      });
    }

    const sumField = (arr: MonthlyValue[], field: "previsto" | "realizado") =>
      round2(arr.reduce((sum, m) => sum + m[field], 0));

    return {
      period: { from: months[0].key, to: months[months.length - 1].key },
      faturamento: {
        monthly: faturamentoMonthly,
        accumulated: { previsto: sumField(faturamentoMonthly, "previsto"), realizado: sumField(faturamentoMonthly, "realizado") },
      },
      receita: {
        monthly: receitaMonthly,
        accumulated: { previsto: sumField(receitaMonthly, "previsto"), realizado: sumField(receitaMonthly, "realizado") },
      },
      operacoes: { monthly: operacoesMonthly },
    };
  }

  /**
   * Status por etapa (10 etapas + terminais Cancelado/Recusado) e funil cumulativo em 5 baldes.
   * Faz um único scan leve (sem boughtProducts/Payment.amount) sobre as vendas do período filtrado —
   * precisa ler todas porque a etapa é derivada em código (calculatePipelineStage), não uma coluna do banco.
   */
  async getPipelineSummary(filter: PipelineDateFilter = {}, now: Date = new Date()): Promise<PipelineSummary> {
    const sales = await this.prisma.saleData.findMany({
      where: buildCreatedAtWhere(filter),
      select: {
        status: true,
        createdAt: true,
        statusChangedAt: true,
        downPaymentCompleted: true,
        paymentCompleted: true,
        shippedAt: true,
        arrivedAt: true,
        actualDeliveryDate: true,
        weightDocumentId: true,
        Payment: { where: { status: "completed" }, select: { phase: true, status: true, updatedAt: true } },
      },
    });

    const statusCounts: PipelineStatusCount[] = PIPELINE_STAGES.map((s) => ({ ...s, count: 0 }));
    const terminal: PipelineStatusCount[] = [
      { stage: 0, key: "cancelado", label: "Cancelado", count: 0 },
      { stage: 0, key: "recusado_vendedor", label: "Recusado pelo vendedor", count: 0 },
    ];
    const funnel: PipelineFunnelBucket[] = FUNNEL_BUCKETS.map(({ key, label }) => ({ key, label, count: 0 }));

    for (const sale of sales) {
      const stageResult = calculatePipelineStage(sale, now);

      if (stageResult.stage === 0) {
        const bucket = terminal.find((t) => t.key === stageResult.key);
        if (bucket) bucket.count += 1;
        continue;
      }

      const bucket = statusCounts.find((s) => s.stage === stageResult.stage);
      if (bucket) bucket.count += 1;
      for (const funnelBucket of FUNNEL_BUCKETS) {
        if (stageResult.stage >= funnelBucket.minStage) {
          const target = funnel.find((f) => f.key === funnelBucket.key)!;
          target.count += 1;
        }
      }
    }

    return { statusCounts, terminal, funnel };
  }

  /**
   * Lista detalhada paginada (produto/vendedor/valor/status/dias na etapa), 1 linha por venda.
   * Só essa consulta carrega boughtProducts/product/seller, e só para a página pedida.
   * Filtro de etapa (stage) exige duas fases, porque a etapa é derivada em código, não uma coluna:
   * 1) scan leve (mesmos campos do summary) para achar os IDs que batem com data+etapa;
   * 2) busca pesada (boughtProducts/product/seller) só dos IDs da página pedida.
   * Sem filtro de etapa, a paginação continua direta no banco (take/skip), sem esse scan extra.
   */
  async getPipelineList(
    params: { page?: number; pageSize?: number; stage?: number[] } & PipelineDateFilter = {},
    now: Date = new Date()
  ): Promise<PipelineListPage> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));
    const createdAtWhere = buildCreatedAtWhere(params);

    const heavySelect = {
      id: true,
      orderNumber: true,
      status: true,
      createdAt: true,
      statusChangedAt: true,
      downPaymentCompleted: true,
      paymentCompleted: true,
      shippedAt: true,
      arrivedAt: true,
      actualDeliveryDate: true,
      weightDocumentId: true,
      transportValue: true,
      adjustedContractTotal: true,
      boughtProducts: {
        select: {
          value: true,
          product: { select: { name: true, seller: { select: { name: true } } } },
        },
      },
      Payment: { where: { status: "completed" as const }, select: { phase: true, status: true, updatedAt: true } },
    } as const;

    let total: number;
    let sales: Awaited<ReturnType<typeof this.prisma.saleData.findMany<{ select: typeof heavySelect }>>>;

    if (params.stage && params.stage.length > 0) {
      const stageSet = new Set(params.stage);

      // Sem startDate, o scan leve fica sem limite superior de idade — impõe uma janela máxima
      // pra manter o comportamento estável independente do volume de vendas.
      const stageFilterWhere = params.startDate
        ? createdAtWhere
        : buildCreatedAtWhere({
            startDate: new Date(now.getTime() - MAX_STAGE_FILTER_WINDOW_DAYS * 86_400_000),
            endDate: params.endDate,
          });

      // stage não depende de Payment (calculatePipelineStage só usa Payment para enteredAt/daysInStage,
      // que aqui não são lidos) — omitir a relação evita I/O e payload desnecessários neste scan.
      const lightRows = await this.prisma.saleData.findMany({
        where: stageFilterWhere,
        orderBy: { orderNumber: "desc" },
        select: {
          id: true,
          status: true,
          createdAt: true,
          statusChangedAt: true,
          downPaymentCompleted: true,
          paymentCompleted: true,
          shippedAt: true,
          arrivedAt: true,
          actualDeliveryDate: true,
          weightDocumentId: true,
        },
      });

      const matchingIds = lightRows
        .filter((row) => stageSet.has(calculatePipelineStage(row, now).stage))
        .map((row) => row.id);

      total = matchingIds.length;
      const pageIds = matchingIds.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

      const heavyRows = await this.prisma.saleData.findMany({ where: { id: { in: pageIds } }, select: heavySelect });
      const byId = new Map(heavyRows.map((row) => [row.id, row]));
      sales = pageIds.map((id) => byId.get(id)!);
    } else {
      [total, sales] = await Promise.all([
        this.prisma.saleData.count({ where: createdAtWhere }),
        this.prisma.saleData.findMany({
          where: createdAtWhere,
          orderBy: { orderNumber: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: heavySelect,
        }),
      ]);
    }

    const items: PipelineListItem[] = sales.map((sale) => {
      const stageResult = calculatePipelineStage(sale, now);
      const products = sale.boughtProducts;
      const produto = products.length === 0
        ? "-"
        : products.length === 1
          ? products[0].product.name
          : `${products[0].product.name} (+${products.length - 1})`;
      const sellerNames = [...new Set(products.map((bp) => bp.product.seller.name))];
      const vendedor = sellerNames.length === 0 ? "-" : sellerNames.length === 1 ? sellerNames[0] : "Múltiplos vendedores";

      return {
        id: sale.id,
        orderNumber: sale.orderNumber,
        produto,
        vendedor,
        valor: round2(contractTotalOf(sale)),
        status: stageResult.label,
        diasEtapa: stageResult.daysInStage,
      };
    });

    return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  /**
   * Alertas Operacionais (4 regras, reaproveitando campos/relações já existentes em SaleData):
   * - Sem pagamento antes da colheita: plannedHarvestDate já chegou e a entrada ainda não foi confirmada
   *   (mesma condição que bloqueia authorizeHarvest).
   * - Sem upload de documentos após embarque: shippedAt preenchido mas nenhum OperationDocument nota_fiscal.
   * - Entrega atrasada: plannedDeliveryDate no passado sem actualDeliveryDate (mesmos candidatos do aceite tácito).
   * - Pagamento vencido: existe Payment pending com mais de PENDING_PAYMENT_OVERDUE_DAYS dias.
   * Vendas Canceladas/Recusadas ficam fora de todas as regras.
   */
  async getOperationalAlerts(params: { limit?: number } = {}, now: Date = new Date()): Promise<OperationalAlertsOverview> {
    const limit = Math.min(MAX_ALERT_LIST_LIMIT, Math.max(1, params.limit ?? DEFAULT_ALERT_LIST_LIMIT));
    const overdueCutoff = new Date(now.getTime() - PENDING_PAYMENT_OVERDUE_DAYS * 86_400_000);

    const semPagamentoWhere = {
      plannedHarvestDate: { lte: now },
      downPaymentCompleted: false,
      status: ACTIVE_SALE_STATUS_FILTER,
    };
    const semUploadWhere = {
      shippedAt: { not: null },
      status: ACTIVE_SALE_STATUS_FILTER,
      operationDocuments: { none: { docType: "nota_fiscal" } },
    };
    const entregaAtrasadaWhere = {
      plannedDeliveryDate: { lt: now },
      actualDeliveryDate: null,
      status: ACTIVE_SALE_STATUS_FILTER,
    };
    const pagamentoVencidoWhere = {
      status: ACTIVE_SALE_STATUS_FILTER,
      Payment: { some: { status: "pending", createdAt: { lt: overdueCutoff } } },
    };

    const saleIdCols = { select: { id: true, orderNumber: true } };

    const [
      semPagamentoCount, semPagamentoRows,
      semUploadCount, semUploadRows,
      entregaAtrasadaCount, entregaAtrasadaRows,
      pagamentoVencidoCount, pagamentoVencidoRows,
    ] = await Promise.all([
      this.prisma.saleData.count({ where: semPagamentoWhere }),
      this.prisma.saleData.findMany({ where: semPagamentoWhere, orderBy: { plannedHarvestDate: "asc" }, take: limit, ...saleIdCols }),
      this.prisma.saleData.count({ where: semUploadWhere }),
      this.prisma.saleData.findMany({ where: semUploadWhere, orderBy: { shippedAt: "asc" }, take: limit, ...saleIdCols }),
      this.prisma.saleData.count({ where: entregaAtrasadaWhere }),
      this.prisma.saleData.findMany({ where: entregaAtrasadaWhere, orderBy: { plannedDeliveryDate: "asc" }, take: limit, ...saleIdCols }),
      this.prisma.saleData.count({ where: pagamentoVencidoWhere }),
      this.prisma.saleData.findMany({ where: pagamentoVencidoWhere, orderBy: { orderNumber: "asc" }, take: limit, ...saleIdCols }),
    ]);

    const counts: OperationalAlertCounts = {
      semPagamentoAntesColheita: semPagamentoCount,
      semUploadDocumentos: semUploadCount,
      entregaAtrasada: entregaAtrasadaCount,
      pagamentoVencido: pagamentoVencidoCount,
    };

    const buildItems = (rows: { id: string; orderNumber: number }[], type: keyof typeof ALERT_TYPES): OperationalAlertItem[] =>
      rows.map((row) => ({ id: row.id, orderNumber: row.orderNumber, ...ALERT_TYPES[type] }));

    const items = [
      ...buildItems(semPagamentoRows, "semPagamentoAntesColheita"),
      ...buildItems(semUploadRows, "semUploadDocumentos"),
      ...buildItems(entregaAtrasadaRows, "entregaAtrasada"),
      ...buildItems(pagamentoVencidoRows, "pagamentoVencido"),
    ].slice(0, limit);

    const total = counts.semPagamentoAntesColheita + counts.semUploadDocumentos + counts.entregaAtrasada + counts.pagamentoVencido;

    return { counts, list: { items, total, limit } };
  }

  /**
   * Logística e Desempenho: tempo médio de entrega (shippedAt → actualDeliveryDate), % no prazo e
   * atraso médio (plannedDeliveryDate x actualDeliveryDate), + desempenho por comprador/vendedor.
   * Considera só vendas efetivamente entregues (actualDeliveryDate preenchido), fora Canceladas/Recusadas.
   */
  async getLogisticsOverview(): Promise<LogisticsOverview> {
    const deliveredSales = await this.prisma.saleData.findMany({
      where: { actualDeliveryDate: { not: null }, status: ACTIVE_SALE_STATUS_FILTER },
      select: {
        shippedAt: true,
        actualDeliveryDate: true,
        plannedDeliveryDate: true,
        buyerId: true,
        buyer: { select: { name: true } },
        boughtProducts: {
          select: { product: { select: { sellerId: true, seller: { select: { name: true } } } } },
        },
      },
    });

    const deliveryDurations: number[] = [];
    const delayDurations: number[] = [];
    let onTimeCount = 0;
    let onTimeEligibleCount = 0;

    const buyerStats = new Map<string, { name: string; delivered: number; onTime: number }>();
    const sellerStats = new Map<string, { name: string; delivered: number; onTime: number }>();

    for (const sale of deliveredSales) {
      const actualDeliveryDate = sale.actualDeliveryDate as Date;

      if (sale.shippedAt) {
        deliveryDurations.push(diffInDays(sale.shippedAt, actualDeliveryDate));
      }

      if (sale.plannedDeliveryDate) {
        onTimeEligibleCount += 1;
        const isOnTime = actualDeliveryDate <= sale.plannedDeliveryDate;
        if (isOnTime) onTimeCount += 1;
        else delayDurations.push(diffInDays(sale.plannedDeliveryDate, actualDeliveryDate));

        const buyerEntry = buyerStats.get(sale.buyerId) ?? { name: sale.buyer.name, delivered: 0, onTime: 0 };
        buyerEntry.delivered += 1;
        if (isOnTime) buyerEntry.onTime += 1;
        buyerStats.set(sale.buyerId, buyerEntry);

        const sellerNameById = new Map<string, string>();
        for (const bp of sale.boughtProducts) {
          sellerNameById.set(bp.product.sellerId, bp.product.seller.name);
        }
        for (const [sellerId, sellerName] of sellerNameById) {
          const sellerEntry = sellerStats.get(sellerId) ?? { name: sellerName, delivered: 0, onTime: 0 };
          sellerEntry.delivered += 1;
          if (isOnTime) sellerEntry.onTime += 1;
          sellerStats.set(sellerId, sellerEntry);
        }
      }
    }

    const toPerformanceList = (stats: Map<string, { name: string; delivered: number; onTime: number }>): LogisticsPartyPerformance[] =>
      [...stats.entries()]
        .map(([id, s]) => {
          const onTimePercent = round1((s.onTime / s.delivered) * 100);
          return { id, name: s.name, delivered: s.delivered, onTimePercent, alerta: onTimePercent < ON_TIME_ALERT_THRESHOLD_PERCENT };
        })
        .sort((a, b) => a.onTimePercent - b.onTimePercent);

    const avgDeliveryDays = average(deliveryDurations);
    const avgDelayDays = average(delayDurations);

    return {
      deliveredCount: deliveredSales.length,
      averageDeliveryDays: avgDeliveryDays !== null ? round1(avgDeliveryDays) : null,
      onTimePercent: onTimeEligibleCount > 0 ? round1((onTimeCount / onTimeEligibleCount) * 100) : null,
      averageDelayDays: avgDelayDays !== null ? round1(avgDelayDays) : null,
      byBuyer: toPerformanceList(buyerStats),
      bySeller: toPerformanceList(sellerStats),
    };
  }
}
