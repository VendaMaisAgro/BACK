import { RequestHandler } from 'express';
import { PriceRecommendationService } from './priceRecommendation.service';

const service = new PriceRecommendationService();

export class PriceController {
  public listToday: RequestHandler = async (_req, res, next) => {
    try {
      const data = await service.listToday();
      res.json({ data });           
    } catch (err) {
      next(err);
    }
  };

  public getByName: RequestHandler = async (req, res, next) => {
    try {
      const { productName } = req.params;
      const data = await service.getByName(productName);

      if (!data) {
        res.status(404).json({
          error:   'NotFound',
          message: 'Produto não encontrado',
        });
        return;                  
      }

      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  public extractPdfData: RequestHandler = async (req, res, next) => {
    const { url } = req.query as { url?: string };
    if (!url) {
      res.status(400).json({ error: 'Invalid URL parameter' });
      return;
    }

    try {
      const data = await service.extractData(url);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };
}
