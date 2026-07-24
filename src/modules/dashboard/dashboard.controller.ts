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

  public getPipelineOverview: RequestHandler = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await service.getPipelineOverview();
      res.status(200).json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to load pipeline overview" });
    }
  };
}
