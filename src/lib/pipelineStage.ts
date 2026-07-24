/**
 * Etapas do pipeline operacional (Dashboard Executivo > Pipeline das Operações).
 * "Cancelado" e "Recusado pelo vendedor" são estados terminais fora da esteira numerada.
 */
export const PIPELINE_STAGES = [
  { stage: 1, key: "contrato_emitido", label: "Contrato emitido" },
  { stage: 2, key: "pagamento_escrow", label: "Pagamento em escrow" },
  { stage: 3, key: "liberacao_colheita", label: "Liberação para colheita" },
  { stage: 4, key: "colheita_embarque", label: "Colheita realizada/Embarque" },
  { stage: 5, key: "pesagem_documentos", label: "Pesagem + documentos enviados" },
  { stage: 6, key: "em_transito", label: "Em trânsito" },
  { stage: 7, key: "entregue", label: "Entregue" },
  { stage: 8, key: "aceite", label: "Aceite" },
  { stage: 9, key: "pagamento_liberado", label: "Pagamento liberado" },
  { stage: 10, key: "operacao_finalizada", label: "Operação finalizada" },
] as const;

export type PipelineStageKey = (typeof PIPELINE_STAGES)[number]["key"] | "cancelado" | "recusado_vendedor";

export interface PipelineStageResult {
  stage: number; // 0 = terminal fora da esteira (cancelado/recusado), 1-10 = etapa do pipeline
  key: PipelineStageKey;
  label: string;
  enteredAt: Date;
  daysInStage: number;
}

interface SalePaymentForPipeline {
  phase: string;
  status: string;
  updatedAt: Date;
}

export interface SaleForPipeline {
  status: string;
  createdAt: Date | null;
  /** Preenchido manualmente em todo ponto que muda `status` (ver sales.service.ts/payment.service.ts). */
  statusChangedAt: Date | null;
  downPaymentCompleted: boolean;
  paymentCompleted: boolean;
  shippedAt: Date | null;
  arrivedAt: Date | null;
  actualDeliveryDate: Date | null;
  weightDocumentId: string | null;
  Payment?: SalePaymentForPipeline[];
}

function latestCompletedPaymentAt(payments: SalePaymentForPipeline[] | undefined, phases: string[]): Date | null {
  const matches = (payments ?? []).filter((p) => phases.includes(p.phase) && p.status === "completed");
  if (matches.length === 0) return null;
  return matches.reduce((latest, p) => (p.updatedAt > latest ? p.updatedAt : latest), matches[0].updatedAt);
}

function daysBetween(from: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - from.getTime()) / 86_400_000));
}

/**
 * Calcula a etapa atual do pipeline de uma venda e há quantos dias ela está nessa etapa.
 * Usa apenas campos já existentes em SaleData (sem tabela nova): a etapa é inferida a partir
 * dos campos duráveis que permanecem verdadeiros/preenchidos uma vez atingidos (downPaymentCompleted,
 * shippedAt, arrivedAt, weightDocumentId, actualDeliveryDate, paymentCompleted). Para as etapas
 * derivadas de `status` (2 no fallback, 3, 5, 8, e os terminais), usamos `statusChangedAt` — um campo
 * preenchido manualmente em todo ponto que muda `status` — em vez de `updatedAt`: `updatedAt` é
 * @updatedAt do Prisma e muda em QUALQUER update da venda (recalculo de frete, troca de método de
 * pagamento, avaliação, reagendamento de data planejada), o que resetaria "dias na etapa" sem a
 * etapa ter mudado de fato.
 */
export function calculatePipelineStage(sale: SaleForPipeline, now: Date = new Date()): PipelineStageResult {
  const statusEnteredAt = sale.statusChangedAt ?? sale.createdAt ?? now;

  if (sale.status === "Cancelado") {
    return { stage: 0, key: "cancelado", label: "Cancelado", enteredAt: statusEnteredAt, daysInStage: daysBetween(statusEnteredAt, now) };
  }
  if (sale.status === "Recusado pelo vendedor") {
    return { stage: 0, key: "recusado_vendedor", label: "Recusado pelo vendedor", enteredAt: statusEnteredAt, daysInStage: daysBetween(statusEnteredAt, now) };
  }

  const isAccepted = sale.status === "Concluído" || sale.status === "Concluída";
  const isDelivered = !!sale.actualDeliveryDate || sale.status === "Entregue";
  const hasArrived = !!sale.arrivedAt;
  const hasWeightDoc = !!sale.weightDocumentId;
  const hasShipped = !!sale.shippedAt;

  let result: { stage: number; enteredAt: Date };

  if (sale.paymentCompleted && isAccepted) {
    const enteredAt = latestCompletedPaymentAt(sale.Payment, ["final_payment", "full"]) ?? statusEnteredAt;
    result = { stage: 10, enteredAt };
  } else if (sale.paymentCompleted) {
    const enteredAt = latestCompletedPaymentAt(sale.Payment, ["final_payment", "full"]) ?? statusEnteredAt;
    result = { stage: 9, enteredAt };
  } else if (isAccepted) {
    result = { stage: 8, enteredAt: statusEnteredAt };
  } else if (isDelivered) {
    result = { stage: 7, enteredAt: sale.actualDeliveryDate ?? statusEnteredAt };
  } else if (hasArrived) {
    result = { stage: 6, enteredAt: sale.arrivedAt as Date };
  } else if (hasWeightDoc) {
    result = { stage: 5, enteredAt: statusEnteredAt };
  } else if (hasShipped) {
    result = { stage: 4, enteredAt: sale.shippedAt as Date };
  } else if (sale.status === "Colheita autorizada") {
    result = { stage: 3, enteredAt: statusEnteredAt };
  } else if (sale.downPaymentCompleted) {
    const enteredAt = latestCompletedPaymentAt(sale.Payment, ["down_payment", "full"]) ?? statusEnteredAt;
    result = { stage: 2, enteredAt };
  } else {
    result = { stage: 1, enteredAt: sale.createdAt ?? statusEnteredAt };
  }

  const stageInfo = PIPELINE_STAGES[result.stage - 1];
  return {
    stage: result.stage,
    key: stageInfo.key,
    label: stageInfo.label,
    enteredAt: result.enteredAt,
    daysInStage: daysBetween(result.enteredAt, now),
  };
}
