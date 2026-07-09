import { RequestHandler, Request, Response } from 'express';
import { PaymentService } from './payment.service';

const service = new PaymentService();

export class PaymentController {
    public createPreference: RequestHandler = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const { saleId, paymentMethodId, productId, title, unit_price, quantity, amount, phase } = req.body;
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
                phase,
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

    public processWebhook: RequestHandler = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const result = await service.processWebhook(req.body);
            res.status(200).send(result);
        } catch (error: any) {
            res.status(400).send(error);
        }
    };

    public syncPaymentStatus: RequestHandler = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const paymentId = req.params.id;
            if (!paymentId) {
                res.status(400).json({ error: 'ID do pagamento é obrigatório.' });
                return;
            }

            const result = await service.syncPaymentStatus(paymentId);

            if (!result.success) {
                res.status(404).json(result);
                return;
            }

            res.json(result);
        } catch (error: any) {
            console.error('Erro ao sincronizar status do pagamento:', error);
            res.status(500).json({
                error: 'Erro ao sincronizar status do pagamento.',
                message: error.message,
            });
        }
    };

    public syncPendingOrderPayments: RequestHandler = async (
        _req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const result = await service.syncPendingOrderPayments();
            res.json({ success: true, ...result });
        } catch (error: any) {
            console.error('Erro ao sincronizar pagamentos pendentes:', error);
            res.status(500).json({ error: 'Erro ao sincronizar pagamentos pendentes.', message: error.message });
        }
    };

    /**
     * Debug de um pagamento - retorna informações detalhadas
     */
    public debugPayment: RequestHandler = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const paymentId = req.params.id;
            if (!paymentId) {
                res.status(400).json({ error: 'ID do pagamento é obrigatório.' });
                return;
            }

            const result = await service.debugPayment(paymentId);
            res.json(result);
        } catch (error: any) {
            console.error('Erro ao debugar pagamento:', error);
            res.status(500).json({
                error: 'Erro ao debugar pagamento.',
                message: error.message,
            });
        }
    };

    /**
     * Lista todos os meios de pagamento disponíveis
     */
    public getPaymentMethods: RequestHandler = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const methods = await service.getPaymentMethods();
            res.json(methods);
        } catch (error: any) {
            console.error('Erro ao buscar meios de pagamento:', error);
            res.status(500).json({
                error: 'Erro ao buscar meios de pagamento.',
                message: error.message,
            });
        }
    };

    /**
     * Cria um pagamento PIX usando a Orders API (Checkout Transparente)
     */
    public createPixPayment: RequestHandler = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const { saleId, paymentMethodId, amount, email, expirationMinutes, phase } = req.body;

            if (!saleId || !paymentMethodId || !amount || !email) {
                res.status(400).json({
                    error: 'Dados obrigatórios não fornecidos.',
                    required: ['saleId', 'paymentMethodId', 'amount', 'email']
                });
                return;
            }

            // Validação do amount
            if (typeof amount !== 'number' || amount <= 0) {
                res.status(400).json({
                    error: 'O valor do pagamento deve ser um número maior que zero.'
                });
                return;
            }

            // Validação do email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                res.status(400).json({
                    error: 'Email inválido.'
                });
                return;
            }

            // Validação do expirationMinutes (se fornecido)
            if (expirationMinutes !== undefined) {
                if (typeof expirationMinutes !== 'number' || expirationMinutes < 30 || expirationMinutes > 43200) {
                    res.status(400).json({
                        error: 'O tempo de expiração deve estar entre 30 minutos e 30 dias (43200 minutos).'
                    });
                    return;
                }
            }

            const result = await service.createPixPayment({
                saleId,
                paymentMethodId,
                amount,
                email,
                expirationMinutes,
                phase,
            });

            res.status(201).json(result);
        } catch (error: any) {
            console.error('Erro ao criar pagamento PIX:', error);
            res.status(500).json({
                error: 'Erro ao criar pagamento PIX.',
                message: error.message,
            });
        }
    };

    public createBoletoPayment: RequestHandler = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const { saleId, paymentMethodId, amount, expirationDays, phase } = req.body;

            if (!saleId || !paymentMethodId || !amount) {
                res.status(400).json({
                    error: 'Dados obrigatórios não fornecidos.',
                    required: ['saleId', 'paymentMethodId', 'amount']
                });
                return;
            }

            if (typeof amount !== 'number' || amount <= 0) {
                res.status(400).json({ error: 'O valor do pagamento deve ser um número maior que zero.' });
                return;
            }

            const result = await service.createBoletoPayment({ saleId, paymentMethodId, amount, expirationDays, phase });

            res.status(201).json(result);
        } catch (error: any) {
            console.error('Erro ao criar boleto:', error);
            res.status(500).json({
                error: 'Erro ao criar boleto.',
                message: error.message,
            });
        }
    };

    /**
     * Cancela um pagamento PIX pendente
     */
    public cancelPixPayment: RequestHandler = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const paymentId = req.params.id;

            if (!paymentId) {
                res.status(400).json({ error: 'ID do pagamento é obrigatório.' });
                return;
            }

            const result = await service.cancelPixPayment(paymentId);

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.json(result);
        } catch (error: any) {
            console.error('Erro ao cancelar pagamento PIX:', error);
            res.status(500).json({
                error: 'Erro ao cancelar pagamento PIX.',
                message: error.message,
            });
        }
    };

    public getFinalInstallmentAmount: RequestHandler = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const saleId = req.params.saleId;
            if (!saleId) {
                res.status(400).json({ error: 'saleId é obrigatório.' });
                return;
            }
            const result = await service.getFinalInstallmentAmount(saleId);
            res.json(result);
        } catch (error: any) {
            if (error.message?.startsWith('FINAL_INSTALLMENT_NOT_AVAILABLE:')) {
                res.status(409).json({ error: error.message.split(':')[1], code: 'FINAL_INSTALLMENT_NOT_AVAILABLE' });
                return;
            }
            if (error.message?.includes('não encontrada')) {
                res.status(404).json({ error: error.message });
                return;
            }
            console.error('Erro ao calcular parcela final:', error);
            res.status(500).json({ error: 'Erro ao calcular parcela final.', message: error.message });
        }
    };

    public createFinalBoleto: RequestHandler = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const { saleId, paymentMethodId, amount, expirationDays } = req.body;

            if (!saleId || !paymentMethodId) {
                res.status(400).json({
                    error: 'Dados obrigatórios não fornecidos.',
                    required: ['saleId', 'paymentMethodId']
                });
                return;
            }

            if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
                res.status(400).json({ error: 'O valor do pagamento deve ser um número maior que zero.' });
                return;
            }

            const result = await service.createFinalBoleto({ saleId, paymentMethodId, amount, expirationDays });
            res.status(201).json(result);
        } catch (error: any) {
            if (error.message?.startsWith('FINAL_BOLETO_BLOCKED:')) {
                res.status(409).json({ error: error.message.split(':').slice(1).join(':'), code: 'FINAL_BOLETO_BLOCKED' });
                return;
            }
            if (error.message?.includes('não encontrada')) {
                res.status(404).json({ error: error.message });
                return;
            }
            console.error('Erro ao criar boleto final:', error);
            res.status(500).json({ error: 'Erro ao criar boleto final.', message: error.message });
        }
    };

    /**
     * Configura webhook do Mercado Pago
     */
    public configureWebhook: RequestHandler = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const result = await service.configureWebhook();
            res.json(result);
        } catch (error: any) {
            console.error('Erro ao configurar webhook:', error);
            res.status(500).json({
                error: 'Erro ao configurar webhook.',
                message: error.message,
            });
        }
    };
}