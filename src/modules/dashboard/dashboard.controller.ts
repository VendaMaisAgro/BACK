import { Request, Response, RequestHandler } from "express";
import { DashboardService } from "./dashboard.service";

const service = new DashboardService();

/** Retorna undefined se ausente, o inteiro positivo se válido, ou "invalid" se presente e malformado. */
function parsePositiveIntParam(raw: unknown): number | undefined | "invalid" {
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : "invalid";
}

/** Retorna undefined se ausente, a Date se válida, ou "invalid" se presente e não parseável. */
function parseDateParam(raw: unknown): Date | undefined | "invalid" {
  if (raw === undefined) return undefined;
  const date = new Date(raw as string);
  return Number.isNaN(date.getTime()) ? "invalid" : date;
}

/** Lista separada por vírgula de inteiros 0-10 (0 = terminal Cancelado/Recusado, 1-10 = etapas do pipeline). */
function parseStageListParam(raw: unknown): number[] | undefined | "invalid" {
  if (raw === undefined) return undefined;
  const parts = String(raw).split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return undefined;
  const stages = parts.map(Number);
  const allValid = stages.every((s) => Number.isInteger(s) && s >= 0 && s <= 10);
  return allValid ? stages : "invalid";
}

/** Retorna undefined se ausente/vazio, ou a string se presente (query params de filtro são sempre IDs). */
function parseOptionalStringParam(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  return raw;
}

export class DashboardController {
  public getExecutiveOverview: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = {
        produtoId: parseOptionalStringParam(req.query.produto),
        compradorId: parseOptionalStringParam(req.query.comprador),
        vendedorId: parseOptionalStringParam(req.query.vendedor),
        tipoOperacao: parseOptionalStringParam(req.query.tipoOperacao),
      };
      const result = await service.getExecutiveOverview(filters);
      res.status(200).json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to load executive overview" });
    }
  };

  public getPipelineOverview: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parsePositiveIntParam(req.query.page);
      const pageSize = parsePositiveIntParam(req.query.pageSize);
      const startDate = parseDateParam(req.query.startDate);
      const endDate = parseDateParam(req.query.endDate);
      const stage = parseStageListParam(req.query.stage);

      if (page === "invalid" || pageSize === "invalid") {
        res.status(400).json({ error: "page e pageSize devem ser números inteiros positivos" });
        return;
      }
      if (startDate === "invalid" || endDate === "invalid") {
        res.status(400).json({ error: "startDate e endDate devem ser datas válidas (ISO 8601)" });
        return;
      }
      if (stage === "invalid") {
        res.status(400).json({ error: "stage deve ser uma lista de inteiros entre 0 e 10 separados por vírgula" });
        return;
      }

      const now = new Date();
      const dateFilter = { startDate, endDate };
      const [summary, list] = await Promise.all([
        service.getPipelineSummary(dateFilter, now),
        service.getPipelineList({ page, pageSize, stage, ...dateFilter }, now),
      ]);

      res.status(200).json({ ...summary, list });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to load pipeline overview" });
    }
  };

  public getOperationalAlerts: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parsePositiveIntParam(req.query.limit);
      if (limit === "invalid") {
        res.status(400).json({ error: "limit deve ser um número inteiro positivo" });
        return;
      }

      const result = await service.getOperationalAlerts({ limit });
      res.status(200).json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to load operational alerts" });
    }
  };

  public getLogisticsOverview: RequestHandler = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await service.getLogisticsOverview();
      res.status(200).json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to load logistics overview" });
    }
  };
}
