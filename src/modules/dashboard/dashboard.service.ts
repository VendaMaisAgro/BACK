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

export interface PipelineOverview {
  statusCounts: PipelineStatusCount[];
  terminal: PipelineStatusCount[];
  funnel: PipelineFunnelBucket[];
  list: PipelineListItem[];
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
   * Pipeline das Operações: contagem por uma das 10 etapas (+ terminais Cancelado/Recusado),
   * funil cumulativo em 5 baldes e lista detalhada com status e dias na etapa atual.
   * Reaproveita calculatePipelineStage (item 2) e os campos Payment.status/phase existentes.
   */
  async getPipelineOverview(now: Date = new Date()): Promise<PipelineOverview> {
    const sales = await this.prisma.saleData.findMany({
      orderBy: { orderNumber: "desc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true,
        updatedAt: true,
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
        Payment: { select: { phase: true, status: true, updatedAt: true } },
      },
    });

    const statusCounts: PipelineStatusCount[] = PIPELINE_STAGES.map((s) => ({ ...s, count: 0 }));
    const terminal: PipelineStatusCount[] = [
      { stage: 0, key: "cancelado", label: "Cancelado", count: 0 },
      { stage: 0, key: "recusado_vendedor", label: "Recusado pelo vendedor", count: 0 },
    ];
    const funnel: PipelineFunnelBucket[] = FUNNEL_BUCKETS.map(({ key, label }) => ({ key, label, count: 0 }));
    const list: PipelineListItem[] = [];

    for (const sale of sales) {
      const stageResult = calculatePipelineStage(sale, now);

      if (stageResult.stage === 0) {
        const bucket = terminal.find((t) => t.key === stageResult.key);
        if (bucket) bucket.count += 1;
      } else {
        const bucket = statusCounts.find((s) => s.stage === stageResult.stage);
        if (bucket) bucket.count += 1;
        for (const funnelBucket of FUNNEL_BUCKETS) {
          if (stageResult.stage >= funnelBucket.minStage) {
            const target = funnel.find((f) => f.key === funnelBucket.key)!;
            target.count += 1;
          }
        }
      }

      const products = sale.boughtProducts;
      const produto = products.length === 0
        ? "-"
        : products.length === 1
          ? products[0].product.name
          : `${products[0].product.name} (+${products.length - 1})`;
      const sellerNames = [...new Set(products.map((bp) => bp.product.seller.name))];
      const vendedor = sellerNames.length === 0 ? "-" : sellerNames.length === 1 ? sellerNames[0] : "Múltiplos vendedores";

      list.push({
        id: sale.id,
        orderNumber: sale.orderNumber,
        produto,
        vendedor,
        valor: round2(contractTotalOf(sale)),
        status: stageResult.label,
        diasEtapa: stageResult.daysInStage,
      });
    }

    return { statusCounts, terminal, funnel, list };
  }
}
