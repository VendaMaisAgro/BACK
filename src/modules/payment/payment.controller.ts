import { RequestHandler, Request, Response } from 'express';
import { PaymentService } from './payment.service';

const service = new PaymentService();

export class PaymentController {
    public createPreference: RequestHandler = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const { saleId, paymentMethodId, productId, title, unit_price, quantity, amount } = req.body;
            if (!saleId || !paymentMethodId || !productId || !title || !unit_price || !quantity || !amount) {
                res.status(400).json({ error: 'Dados obrigatórios não fornecidos.' });
                return;
            }
            const result = await service.createPreference({
                saleId,
                paymentMethodId,
                title,
                unit_price,
                quantity,
                amount,
            });
            res.status(201).json(result);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({
                error: 'Erro ao criar preferência de pagamento.',
                message: error.message,
            });
        }
    };

    public getById: RequestHandler = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const paymentId = req.params.id;
            if (!paymentId) {
                res.status(400).json({ error: 'ID inválido.' });
                return;
            }
            const payment = await service.getById(paymentId);
            if (!payment) {
                res.status(404).json({ error: 'Pagamento não encontrado.' });
                return;
            }
            res.json(payment);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({
                error: 'Erro ao buscar pagamento.',
                message: error.message,
            });
        }
    };

    public updatePayment: RequestHandler = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const paymentId = req.params.id;
            if (!paymentId) {
                res.status(400).json({ error: 'ID inválido.' });
                return;
            }
            const data = req.body;
            const updated = await service.updatePayment(paymentId, data);
            res.json(updated);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({
                error: 'Erro ao atualizar pagamento.',
                message: error.message,
            });
        }
    };
}