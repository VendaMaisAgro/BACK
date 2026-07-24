import { Request, Response, RequestHandler } from "express";
import { DashboardService } from "./dashboard.service";

const service = new DashboardService();

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
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined;

      const [summary, list] = await Promise.all([
        service.getPipelineSummary(),
        service.getPipelineList({ page, pageSize }),
      ]);

      res.status(200).json({ ...summary, list });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to load pipeline overview" });
    }
  };
}
