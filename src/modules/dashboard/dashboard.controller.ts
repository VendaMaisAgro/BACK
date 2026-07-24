import { Request, Response, RequestHandler } from "express";
import { DashboardService } from "./dashboard.service";

const service = new DashboardService();

/** Retorna undefined se ausente, o inteiro positivo se válido, ou "invalid" se presente e malformado. */
function parsePositiveIntParam(raw: unknown): number | undefined | "invalid" {
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : "invalid";
}

export class DashboardController {
  public getExecutiveOverview: RequestHandler = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await service.getExecutiveOverview();
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
      if (page === "invalid" || pageSize === "invalid") {
        res.status(400).json({ error: "page e pageSize devem ser números inteiros positivos" });
        return;
      }

      const now = new Date();
      const [summary, list] = await Promise.all([
        service.getPipelineSummary(now),
        service.getPipelineList({ page, pageSize }, now),
      ]);

      res.status(200).json({ ...summary, list });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to load pipeline overview" });
    }
  };
}
