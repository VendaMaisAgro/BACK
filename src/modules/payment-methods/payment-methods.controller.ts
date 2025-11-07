import { RequestHandler, Request, Response } from 'express';
import { PaymentMethodsService } from './payment-methods.service';

const service = new PaymentMethodsService();

export class PaymentMethodsController {

  public create: RequestHandler = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { method } = req.body;
      if (!method) {
        res.status(400).json({ error: 'Método de pagamento é obrigatório.' });
        return;
      }
      const result = await service.createPaymentMethod({ method });
      res.status(201).json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        error: 'Falha ao criar o método de pagamento, por favor tente novamente.',
      });
    }
  }
  public getAll: RequestHandler = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const result = await service.getAllPaymentMethods();
      res.json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        error: 'Falha ao buscar os tipos de pagamento, por favor tente novamente.',
      });
    }
  };

  public getPaymentMethodById: RequestHandler = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await service.getPaymentMethodById(id);
      if (!result) {
        res.status(404).json({ error: 'Método de pagamento não encontrado.' });
        return;
      }
      res.json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        error: 'Falha ao buscar o método de pagamento, por favor tente novamente.',
      });
    }
  };

  public update: RequestHandler = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { method } = req.body;

      if (!method) {
        res.status(400).json({ error: 'Método de pagamento é obrigatório.' });
        return;
      }

      const existingPaymentMethod = await service.getPaymentMethodById(id);
      if (!existingPaymentMethod) {
        res.status(404).json({ error: 'Método de pagamento não encontrado.' });
        return;
      }

      const result = await service.updatePaymentMethod(id, { method });
      res.json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        error: 'Falha ao atualizar o método de pagamento, por favor tente novamente.',
      });
    }
  };

  public delete: RequestHandler = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      await service.deletePaymentMethod(id);
      res.status(204).send();
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        error: 'Falha ao deletar o método de pagamento, por favor tente novamente.',
      });
    }
  }

}