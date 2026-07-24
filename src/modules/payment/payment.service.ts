import { Payment, PrismaClient } from '@prisma/client';
import { MercadoPagoConfig, Preference, Payment as MPPayment, PaymentMethod, Order } from 'mercadopago';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const client = new MercadoPagoConfig({ accessToken: process.env.ACCESS_TOKEN || 'MERCADO_PAGO_ACCESS_TOKEN' });
const preference = new Preference(client);
const mpPayment = new MPPayment(client);
const paymentMethod = new PaymentMethod(client);
const orderClient = new Order(client);

type PaymentPhase = 'down_payment' | 'final_payment' | 'full';

export class PaymentService {
    private readonly prisma: PrismaClient;
    constructor(prisma?: PrismaClient) {
        this.prisma = prisma || new PrismaClient();
    }

    async createPreference(params: {
        saleId: string;
        paymentMethodId: string;
        title: string;
        unit_price: number;
        quantity: number;
        amount: number;
        phase?: PaymentPhase;
    }) {
        try {
            const phase = params.phase ?? 'full';
            console.info(`[createPreference] Criando preferência de pagamento para venda ${params.saleId} (fase: ${phase})`);

            // Quando é entrada, recalcula o unit_price e amount server-side
            let unit_price = params.unit_price;
            let amount = params.amount;
            if (phase === 'down_payment') {
                const calc = await this.calculateDownPaymentAmount(params.saleId);
                amount = calc.amount;
                // unit_price para o MP = valor total da entrada (quantity mantida em 1)
                unit_price = calc.amount;
                console.info(`[createPreference] Valor da entrada calculado: ${calc.percent}% de R$${calc.contractTotal} = R$${amount}`);
            }

            const response = await preference.create({
                body: {
                    items: [
                        {
                            id: params.saleId,
                            title: params.title,
                            quantity: 1,
                            unit_price: amount // quantity é sempre 1; usar amount garante que MP cobra o mesmo valor armazenado no banco
                        }
                    ],
                    back_urls: {
                        success: `${process.env.URL_BACKEND}/payment/sucesso`,
                        failure: `${process.env.URL_BACKEND}/payment/erro`,
                        pending: `${process.env.URL_BACKEND}/payment/pendente`
                    },
                    notification_url: `${process.env.URL_BACKEND}/payment/webhook`,
                    external_reference: params.saleId
                }
            });

            const payment = await this.prisma.payment.create({
                data: {
                    saleId: params.saleId,
                    paymentMethodId: params.paymentMethodId,
                    amount,
                    status: 'pending',
                    phase,
                    mp_preference_id: response.id,
                }
            });

            console.info(`[createPreference] Preferência criada com sucesso - PaymentId: ${payment.id}, MP PreferenceId: ${response.id}`);

            return {
                paymentId: payment.id,
                mp_preference_id: response.id,
                init_point: response.init_point
            };
        } catch (error: any) {
            console.error(`[createPreference] Erro ao criar preferência para venda ${params.saleId}:`, error.message);
            throw new Error(error.message || 'Erro ao criar preferência do Mercado Pago');
        }
    }

    /**
     * Calcula o valor da entrada (down_payment) a partir do total da venda e do percentual configurado.
     * Usa downPaymentPercent da venda ou 30% como padrão.
     */
    private async calculateDownPaymentAmount(saleId: string): Promise<{ amount: number; contractTotal: number; percent: number }> {
        const sale = await this.prisma.saleData.findUnique({
            where: { id: saleId },
            include: { boughtProducts: true },
        });
        if (!sale) throw new Error(`Venda (id=${saleId}) não encontrada`);

        const contractTotal = sale.boughtProducts.reduce((sum, bp) => sum + bp.value, 0) + Number(sale.transportValue);
        const percent = sale.downPaymentPercent ?? 30;
        const amount = parseFloat((contractTotal * percent / 100).toFixed(2));

        return { amount, contractTotal, percent };
    }

    async getById(paymentId: string): Promise<Payment | null> {
        return this.prisma.payment.findUnique({
            where: { id: paymentId }
        });
    }

    async getSaleIdForPayment(paymentId: string): Promise<string | null> {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            select: { saleId: true },
        });
        return payment?.saleId ?? null;
    }

    async getPaymentMethods() {
        try {
            console.info('[getPaymentMethods] Buscando meios de pagamento disponíveis');
            const methods = await paymentMethod.get();
            return methods;
        } catch (error: any) {
            console.error('[getPaymentMethods] Erro ao buscar meios de pagamento:', error.message);
            throw new Error(error.message || 'Erro ao buscar meios de pagamento');
        }
    }

    async createPixPayment(params: {
        saleId: string;
        paymentMethodId: string;
        amount: number;
        email: string;
        expirationMinutes?: number;
        phase?: PaymentPhase;
    }) {
        try {
            const phase = params.phase ?? 'full';
            console.info(`[createPixPayment] Criando pagamento PIX para venda ${params.saleId} (fase: ${phase})`);

            // Quando é entrada, ignora o amount do cliente e calcula server-side
            let amount = params.amount;
            if (phase === 'down_payment') {
                const calc = await this.calculateDownPaymentAmount(params.saleId);
                amount = calc.amount;
                console.info(`[createPixPayment] Valor da entrada calculado: ${calc.percent}% de R$${calc.contractTotal} = R$${amount}`);
            }

            const expirationMinutes = params.expirationMinutes || 30;
            const expirationTime = `PT${expirationMinutes}M`;
            const idempotencyKey = randomUUID();

            const orderResponse = await orderClient.create({
                body: {
                    type: 'online',
                    total_amount: amount.toFixed(2),
                    external_reference: params.saleId,
                    processing_mode: 'automatic',
                    transactions: {
                        payments: [
                            {
                                amount: amount.toFixed(2),
                                payment_method: {
                                    id: 'pix',
                                    type: 'bank_transfer'
                                },
                                expiration_time: expirationTime
                            }
                        ]
                    },
                    payer: {
                        email: params.email
                    }
                } as any,
                requestOptions: { idempotencyKey }
            });

            const paymentData = orderResponse.transactions?.payments?.[0];
            if (!paymentData) {
                throw new Error('Resposta da API não contém dados de pagamento');
            }

            const payment = await this.prisma.payment.create({
                data: {
                    saleId: params.saleId,
                    paymentMethodId: params.paymentMethodId,
                    amount,
                    status: 'pending',
                    phase,
                    mp_order_id: orderResponse.id,
                    mp_payment_id: paymentData.id,
                }
            });

            console.info(`[createPixPayment] Pagamento PIX criado com sucesso - PaymentId: ${payment.id}, OrderId: ${orderResponse.id}`);

            return {
                paymentId: payment.id,
                orderId: orderResponse.id,
                orderStatus: orderResponse.status,
                phase,
                payment: {
                    id: paymentData.id,
                    status: paymentData.status,
                    status_detail: paymentData.status_detail,
                    qr_code: (paymentData as any).payment_method?.qr_code,
                    qr_code_base64: (paymentData as any).payment_method?.qr_code_base64,
                    ticket_url: (paymentData as any).payment_method?.ticket_url
                }
            };
        } catch (error: any) {
            const message = error?.message || JSON.stringify(error);
            console.error(`[createPixPayment] Erro ao criar pagamento PIX para venda ${params.saleId}:`, message);
            throw new Error(message || 'Erro ao criar pagamento PIX');
        }
    }

    async createBoletoPayment(params: {
        saleId: string;
        paymentMethodId: string;
        amount: number;
        expirationDays?: number;
        phase?: PaymentPhase;
    }) {
        try {
            const phase = params.phase ?? 'full';
            console.info(`[createBoletoPayment] Criando pagamento com boleto para venda ${params.saleId} (fase: ${phase})`);

            // Quando é entrada, ignora o amount do cliente e calcula server-side
            let amount = params.amount;
            if (phase === 'down_payment') {
                const calc = await this.calculateDownPaymentAmount(params.saleId);
                amount = calc.amount;
                console.info(`[createBoletoPayment] Valor da entrada calculado: ${calc.percent}% de R$${calc.contractTotal} = R$${amount}`);
            }

            const sale = await this.prisma.saleData.findUnique({
                where: { id: params.saleId },
                include: {
                    buyer: true,
                    shippingAddress: true
                }
            });

            if (!sale) throw new Error(`Venda não encontrada: ${params.saleId}`);
            if (!sale.buyer) throw new Error('Dados do comprador não encontrados para esta venda');

            let address = sale.shippingAddress;
            if (!address) {
                address = await this.prisma.address.findFirst({
                    where: { userId: sale.buyerId, default: true }
                });
            }

            if (!address) {
                throw new Error('Endereço não encontrado. A venda precisa ter um endereço de entrega ou o comprador precisa ter um endereço padrão cadastrado.');
            }

            const nameParts = sale.buyer.name.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];

            let identificationType: string;
            let identificationNumber: string;

            if (sale.buyer.cpf) {
                identificationType = 'CPF';
                identificationNumber = sale.buyer.cpf.replace(/[.\-]/g, '');
            } else if (sale.buyer.cnpj) {
                identificationType = 'CNPJ';
                identificationNumber = sale.buyer.cnpj.replace(/[.\-/]/g, '');
            } else {
                throw new Error('Comprador não possui CPF ou CNPJ cadastrado');
            }

            const expirationDays = params.expirationDays || 3;
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + expirationDays);
            const expirationDateStr = expirationDate.toISOString().split('T')[0];

            const idempotencyKey = randomUUID();

            console.info(`[createBoletoPayment] Dados do pagador: ${firstName} ${lastName}, ${identificationType}: ${identificationNumber}`);

            const orderResponse = await orderClient.create({
                body: {
                    type: 'online',
                    total_amount: amount.toFixed(2),
                    external_reference: params.saleId,
                    processing_mode: 'automatic',
                                    transactions: {
                        payments: [
                            {
                                amount: amount.toFixed(2),
                                payment_method: {
                                    id: 'boleto',
                                    type: 'ticket'
                                }
                            }
                        ]
                    },
                    payer: {
                        email: sale.buyer.email,
                        first_name: firstName,
                        last_name: lastName,
                        identification: {
                            type: identificationType,
                            number: identificationNumber
                        },
                        address: {
                            zip_code: address.cep,
                            street_name: address.street,
                            street_number: address.number,
                            neighborhood: address.alias || 'Centro',
                            city: address.city,
                            state: address.uf
                        }
                    }
                },
                requestOptions: { idempotencyKey }
            } as any);

            const paymentData = orderResponse.transactions?.payments?.[0];

            if (!paymentData) {
                throw new Error('Resposta da API não contém dados de pagamento');
            }

            const payment = await this.prisma.payment.create({
                data: {
                    saleId: params.saleId,
                    paymentMethodId: params.paymentMethodId,
                    amount,
                    status: 'pending',
                    phase,
                    mp_order_id: orderResponse.id,
                    mp_payment_id: paymentData.id,
                }
            });

            console.info(`[createBoletoPayment] Boleto criado com sucesso - PaymentId: ${payment.id}, OrderId: ${orderResponse.id}`);

            return {
                paymentId: payment.id,
                orderId: orderResponse.id,
                orderStatus: orderResponse.status,
                phase,
                payment: {
                    id: paymentData.id,
                    status: paymentData.status,
                    status_detail: paymentData.status_detail,
                    ticket_url: paymentData.payment_method?.ticket_url,
                    barcode_content: paymentData.payment_method?.barcode_content,
                    digitable_line: paymentData.payment_method?.digitable_line,
                    financial_institution: paymentData.payment_method?.financial_institution,
                    expiration_date: expirationDateStr
                }
            };
        } catch (error: any) {
            console.error(`[createBoletoPayment] Erro ao criar boleto para venda ${params.saleId}:`, JSON.stringify(error, null, 2));
            const message = error?.message || error?.cause?.message || JSON.stringify(error) || 'Erro ao criar pagamento com boleto';
            throw new Error(message);
        }
    }

    /**
     * Calcula o valor da segunda parcela com base no total contratado menos o que já foi pago como entrada.
     * O operador pode usar esse valor para decidir se ajusta manualmente antes de emitir o boleto final.
     */
    async getFinalInstallmentAmount(saleId: string) {
        const sale = await this.prisma.saleData.findUnique({
            where: { id: saleId },
            include: {
                boughtProducts: true,
                Payment: true,
            },
        });

        if (!sale) throw new Error(`Venda (id=${saleId}) não encontrada`);

        if (!sale.downPaymentCompleted) {
            throw new Error('FINAL_INSTALLMENT_NOT_AVAILABLE:A entrada de 30% ainda não foi confirmada');
        }

        // Usa o total ajustado pela pesagem se disponível; caso contrário usa o total original do contrato
        const originalTotal = sale.boughtProducts.reduce((sum, bp) => sum + bp.value, 0) + Number(sale.transportValue);
        const adjustedContractTotal = sale.adjustedContractTotal !== null
            ? Number(sale.adjustedContractTotal)
            : null;
        const contractTotal = adjustedContractTotal ?? originalTotal;

        const totalDownPaid = sale.Payment
            .filter(p => p.phase === 'down_payment' && p.status === 'completed')
            .reduce((sum, p) => sum + p.amount, 0);

        const finalAmount = Math.max(0, contractTotal - totalDownPaid);

        return {
            saleId,
            originalTotal,
            contractTotal,
            adjustedByWeight: adjustedContractTotal !== null,
            totalDownPaid,
            finalAmount,
            cargoWeightKg: sale.cargoWeightKg ? Number(sale.cargoWeightKg) : null,
            weightRegistered: !!sale.cargoWeightKg,
        };
    }

    /**
     * Cria o boleto da segunda parcela (70%).
     * A segunda parcela é SEMPRE boleto por definição de negócio.
     * Se amount for informado explicitamente (ajuste por peso real), esse valor é usado.
     * Caso contrário, calcula automaticamente como contractTotal - downPaymentPaid.
     */
    async createFinalBoleto(params: {
        saleId: string;
        paymentMethodId: string;
        amount?: number;
        expirationDays?: number;
    }) {
        const sale = await this.prisma.saleData.findUnique({
            where: { id: params.saleId },
            include: { boughtProducts: true, Payment: true },
        });

        if (!sale) throw new Error(`Venda (id=${params.saleId}) não encontrada`);
        if (!sale.downPaymentCompleted) throw new Error('FINAL_BOLETO_BLOCKED:A entrada de 30% ainda não foi confirmada');
        if (sale.paymentCompleted) throw new Error('FINAL_BOLETO_BLOCKED:O pagamento final já foi concluído');

        const alreadyHasPendingFinal = sale.Payment.some(
            p => p.phase === 'final_payment' && p.status === 'pending'
        );
        if (alreadyHasPendingFinal) {
            throw new Error('FINAL_BOLETO_BLOCKED:Já existe um boleto final pendente para esta venda');
        }

        let amount = params.amount;
        if (amount === undefined) {
            // Prefere o total ajustado pela pesagem; caso contrário usa o total original
            const originalTotal = sale.boughtProducts.reduce((sum, bp) => sum + bp.value, 0) + Number(sale.transportValue);
            const adjustedContractTotal = sale.adjustedContractTotal !== null
                ? Number(sale.adjustedContractTotal)
                : null;
            const contractTotal = adjustedContractTotal ?? originalTotal;
            const totalDownPaid = sale.Payment
                .filter(p => p.phase === 'down_payment' && p.status === 'completed')
                .reduce((sum, p) => sum + p.amount, 0);
            amount = Math.max(0, contractTotal - totalDownPaid);
        }

        if (amount <= 0) throw new Error('FINAL_BOLETO_BLOCKED:Valor calculado para o boleto final é zero ou negativo');

        return this.createBoletoPayment({
            saleId: params.saleId,
            paymentMethodId: params.paymentMethodId,
            amount,
            expirationDays: params.expirationDays,
            phase: 'final_payment',
        });
    }

    /**
     * Cancela todos os pagamentos pendentes de uma venda no banco de dados.
     * Usado ao trocar a forma de pagamento antes da entrada ser confirmada.
     */
    async cancelPendingPaymentsBySale(saleId: string): Promise<number> {
        const result = await this.prisma.payment.updateMany({
            where: { saleId, status: 'pending' },
            data: { status: 'cancelled', updatedAt: new Date() },
        });
        console.info(`[cancelPendingPaymentsBySale] ${result.count} pagamento(s) pendente(s) cancelado(s) para venda ${saleId}`);
        return result.count;
    }

    async updatePayment(paymentId: string, data: Partial<Payment>) {
        return this.prisma.payment.update({
            where: { id: paymentId },
            data
        });
    }

    private mapMercadoPagoStatus(mpStatus: string): string {
        const statusMap: Record<string, string> = {
            'approved': 'completed',
            'pending': 'pending',
            'in_process': 'pending',
            'rejected': 'failed',
            'cancelled': 'cancelled',
            'refunded': 'refunded',
            'charged_back': 'refunded',
            'action_required': 'pending',
            'processed': 'completed',
            'expired': 'failed',
            'cancelled_by_payer': 'cancelled',
            'cancelled_by_seller': 'cancelled'
        };
        return statusMap[mpStatus] || 'pending';
    }

    /**
     * Aplica as atualizações atomicamente no Payment e SaleData após confirmação.
     * Respeita a fase: down_payment → downPaymentCompleted; final_payment/full → paymentCompleted.
     */
    private async applyPaymentCompletion(
        tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
        paymentRecord: Payment,
        newStatus: string,
        mpPaymentId?: string
    ) {
        await tx.payment.update({
            where: { id: paymentRecord.id },
            data: {
                status: newStatus,
                ...(mpPaymentId && { mp_payment_id: mpPaymentId }),
                updatedAt: new Date()
            }
        });

        if (newStatus === 'completed') {
            const statusChangedAt = new Date();
            if (paymentRecord.phase === 'down_payment') {
                console.info(`[applyPaymentCompletion] Entrada confirmada para venda ${paymentRecord.saleId}`);
                await tx.saleData.update({
                    where: { id: paymentRecord.saleId },
                    data: { downPaymentCompleted: true, status: 'Entrada confirmada', statusChangedAt },
                });
            } else if (paymentRecord.phase === 'full') {
                // Pagamento único: quita entrada e total ao mesmo tempo
                console.info(`[applyPaymentCompletion] Pagamento único (full) confirmado para venda ${paymentRecord.saleId}`);
                await tx.saleData.update({
                    where: { id: paymentRecord.saleId },
                    data: { downPaymentCompleted: true, paymentCompleted: true, status: 'Concluído', statusChangedAt },
                });
            } else {
                // final_payment
                console.info(`[applyPaymentCompletion] Pagamento final confirmado para venda ${paymentRecord.saleId}`);
                await tx.saleData.update({
                    where: { id: paymentRecord.saleId },
                    data: { paymentCompleted: true, status: 'Concluído', statusChangedAt },
                });
            }
        }
    }

    async processWebhook(data: any) {
        try {
            const topic = data.topic || data.type;
            const action = data.action;
            const resourceId = data.data?.id || data.id;

            console.info(`[Webhook] Recebido webhook - Topic: ${topic}, Action: ${action}, ResourceId: ${resourceId}`);

            if (!resourceId) {
                console.warn("[Webhook] ⚠️ Webhook sem resource ID válido");
                return { error: "Webhook sem ID de recurso válido" };
            }

            if (topic === 'order' || resourceId.startsWith('ORD')) {
                return this.processOrderWebhook(resourceId, data);
            }

            await new Promise(resolve => setTimeout(resolve, 1500));

            let paymentRecord: Payment | null = null;
            let mpPaymentData: any = null;

            const isPreferenceId = /^\d+-/.test(resourceId);

            if (isPreferenceId || topic === 'merchant_order') {
                paymentRecord = await this.prisma.payment.findFirst({
                    where: { mp_preference_id: resourceId },
                    orderBy: { createdAt: 'desc' }
                });

                if (!paymentRecord) {
                    console.error("Payment não encontrado para preferência:", resourceId);
                    return { error: "Payment não encontrado no banco" };
                }

                try {
                    const searchResponse = await mpPayment.search({
                        options: {
                            criteria: 'desc',
                            external_reference: paymentRecord.saleId,
                            sort: 'date_created',
                            limit: 10
                        }
                    });

                    const results = searchResponse.results || [];
                    if (results.length > 0) {
                        mpPaymentData = results.find((p: any) => p.status === 'approved') ||
                            results.find((p: any) => ['pending', 'in_process'].includes(p.status)) ||
                            results[0];
                    } else {
                        return {
                            success: true,
                            message: "Webhook recebido mas pagamento ainda não processado pelo MP"
                        };
                    }
                } catch (searchError: any) {
                    console.error("Erro ao buscar pagamentos:", searchError.message);
                    return { error: "Erro ao buscar pagamentos no Mercado Pago" };
                }
            } else {
                try {
                    mpPaymentData = await mpPayment.get({ id: resourceId });
                    const saleId = mpPaymentData.external_reference;

                    paymentRecord = await this.prisma.payment.findFirst({
                        where: { saleId: saleId },
                        orderBy: { createdAt: 'desc' }
                    });

                    if (!paymentRecord) {
                        paymentRecord = await this.prisma.payment.findFirst({
                            where: { mp_payment_id: String(resourceId) }
                        });
                    }
                } catch (mpError: any) {
                    console.error("Erro ao buscar pagamento:", mpError.message);
                    return { error: "Erro ao buscar pagamento no Mercado Pago" };
                }
            }

            if (!paymentRecord) {
                console.error("Payment não encontrado no banco");
                return { error: "Pagamento não encontrado no banco de dados" };
            }

            if (!mpPaymentData) {
                console.error("Dados do pagamento não encontrados no MP");
                return { error: "Dados do pagamento não encontrados no Mercado Pago" };
            }

            const newStatus = this.mapMercadoPagoStatus(mpPaymentData.status);

            if (paymentRecord.status !== newStatus) {
                console.info(`[Webhook] Atualizando pagamento ${paymentRecord.id}: ${paymentRecord.status} -> ${newStatus}`);
                await this.prisma.$transaction(async (tx) => {
                    await this.applyPaymentCompletion(tx, paymentRecord!, newStatus, String(mpPaymentData.id));
                });
                console.info(`[Webhook] Pagamento ${paymentRecord.id} atualizado com sucesso`);
            } else {
                console.info(`[Webhook] Status do pagamento ${paymentRecord.id} não mudou (${paymentRecord.status}), nenhuma atualização necessária`);
            }

            return {
                success: true,
                paymentId: paymentRecord.id,
                saleId: paymentRecord.saleId,
                phase: paymentRecord.phase,
                status: newStatus,
                mp_payment_id: mpPaymentData.id,
                mp_status: mpPaymentData.status,
                mp_status_detail: mpPaymentData.status_detail
            };
        } catch (error: any) {
            console.error("Erro crítico no webhook:", error.message);
            console.error("Stack:", error.stack);
            return { error: 'Erro ao processar webhook', message: error.message };
        }
    }

    private async processOrderWebhook(orderId: string, _webhookData: any) {
        try {
            console.info(`[processOrderWebhook] Processando webhook para Order ${orderId}`);

            await new Promise(resolve => setTimeout(resolve, 1500));

            let orderData: any;
            try {
                orderData = await orderClient.get({ id: orderId });
            } catch (error: any) {
                console.error(`[processOrderWebhook] Erro ao buscar order ${orderId}:`, error.message);
                return { error: 'Erro ao buscar order no Mercado Pago', message: error.message };
            }

            const externalReference = orderData.external_reference;
            if (!externalReference) {
                console.error('[processOrderWebhook] Order sem external_reference');
                return { error: 'Order sem external_reference' };
            }

            let paymentRecord = await this.prisma.payment.findFirst({
                where: {
                    OR: [
                        { saleId: externalReference },
                        { mp_order_id: orderId },
                        ...(!isNaN(Number(externalReference)) ? [{
                            sale: { orderNumber: parseInt(externalReference) }
                        }] : [])
                    ]
                },
                orderBy: { createdAt: 'desc' }
            });

            if (!paymentRecord) {
                console.error(`[processOrderWebhook] Payment não encontrado para order ${orderId}`);
                return { error: 'Payment não encontrado no banco' };
            }

            const paymentData = orderData.transactions?.payments?.[0];
            if (!paymentData) {
                console.warn('[processOrderWebhook] Order sem dados de pagamento');
                return {
                    success: true,
                    message: 'Order recebida mas sem dados de pagamento ainda'
                };
            }

            const newStatus = this.mapMercadoPagoStatus(paymentData.status);

            if (paymentRecord.status !== newStatus) {
                console.info(`[processOrderWebhook] Atualizando pagamento ${paymentRecord.id}: ${paymentRecord.status} -> ${newStatus}`);

                await this.prisma.$transaction(async (tx) => {
                    await tx.payment.update({
                        where: { id: paymentRecord!.id },
                        data: { mp_order_id: orderId, mp_payment_id: paymentData.id }
                    });
                    await this.applyPaymentCompletion(tx, paymentRecord!, newStatus);
                });

                console.info(`[processOrderWebhook] Pagamento ${paymentRecord.id} atualizado com sucesso`);
            } else {
                console.info(`[processOrderWebhook] Status do pagamento ${paymentRecord.id} não mudou (${paymentRecord.status})`);
            }

            return {
                success: true,
                paymentId: paymentRecord.id,
                saleId: paymentRecord.saleId,
                orderId: orderId,
                phase: paymentRecord.phase,
                status: newStatus,
                mp_payment_id: paymentData.id,
                mp_status: paymentData.status,
                mp_status_detail: paymentData.status_detail
            };
        } catch (error: any) {
            console.error('[processOrderWebhook] Erro crítico:', error.message);
            console.error('Stack:', error.stack);
            return { error: 'Erro ao processar webhook de order', message: error.message };
        }
    }

    async syncPaymentStatus(paymentId: string) {
        try {
            const paymentRecord = await this.prisma.payment.findUnique({
                where: { id: paymentId },
                include: { sale: true }
            });

            if (!paymentRecord) {
                return { error: "Payment não encontrado no banco", success: false };
            }

            let mpPaymentData: any = null;

            if (!mpPaymentData && paymentRecord.mp_payment_id) {
                try {
                    mpPaymentData = await mpPayment.get({ id: paymentRecord.mp_payment_id });
                } catch (err) {
                    console.warn(`[syncPaymentStatus] Pagamento não encontrado no MP pelo mp_payment_id: ${paymentRecord.mp_payment_id}`);
                }
            }

            if (!mpPaymentData && paymentRecord.mp_preference_id) {
                try {
                    const searchResponse = await mpPayment.search({
                        options: { criteria: 'desc', limit: 50 }
                    });

                    const results = searchResponse.results?.filter((p: any) =>
                        p.metadata?.preference_id === paymentRecord.mp_preference_id ||
                        p.external_reference === paymentRecord.saleId
                    ) || [];

                    if (results.length > 0) {
                        mpPaymentData = results.find((p: any) => p.status === 'approved') ||
                            results.find((p: any) => p.status === 'pending') ||
                            results[0];
                    }
                } catch (err: any) {
                    console.warn(`[syncPaymentStatus] Erro ao buscar pagamento pela preference ${paymentRecord.mp_preference_id}: ${err.message || err}`);
                }
            }

            if (!mpPaymentData) {
                try {
                    const searchResponse = await mpPayment.search({
                        options: { criteria: 'desc', external_reference: paymentRecord.saleId }
                    });

                    const results = searchResponse.results || [];
                    if (results.length > 0) {
                        mpPaymentData = results.find((p: any) => p.status === 'approved') || results[0];
                    }
                } catch (err: any) {
                    console.warn(`[syncPaymentStatus] Erro ao buscar pagamento por external_reference ${paymentRecord.saleId}: ${err.message || err}`);
                }
            }

            if (!mpPaymentData) {
                return {
                    success: false,
                    message: "Pagamento ainda não foi realizado ou processado pelo Mercado Pago",
                    current_status: paymentRecord.status,
                    mp_preference_id: paymentRecord.mp_preference_id
                };
            }

            const newStatus = this.mapMercadoPagoStatus(mpPaymentData.status);
            console.info(`[syncPaymentStatus] Sincronizando pagamento ${paymentRecord.id}: ${paymentRecord.status} -> ${newStatus}`);

            const updatedPayment = await this.prisma.$transaction(async (tx) => {
                await this.applyPaymentCompletion(tx, paymentRecord, newStatus, String(mpPaymentData.id));
                return tx.payment.findUnique({ where: { id: paymentRecord.id } });
            });

            console.info(`[syncPaymentStatus] Pagamento ${paymentRecord.id} sincronizado com sucesso`);

            return {
                success: true,
                updated: true,
                payment: {
                    id: updatedPayment?.id,
                    status: updatedPayment?.status,
                    phase: updatedPayment?.phase,
                    mp_payment_id: updatedPayment?.mp_payment_id,
                    mp_status: mpPaymentData.status,
                    mp_status_detail: mpPaymentData.status_detail
                },
                mercadopago: {
                    id: mpPaymentData.id,
                    status: mpPaymentData.status,
                    status_detail: mpPaymentData.status_detail,
                    transaction_amount: mpPaymentData.transaction_amount,
                    date_approved: mpPaymentData.date_approved,
                    date_created: mpPaymentData.date_created
                }
            };
        } catch (error: any) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Erro ao sincronizar status:", message);
            return { success: false, error: message };
        }
    }

    /**
     * Verifica todos os pagamentos pendentes via Orders API e confirma os que foram pagos.
     * Chamado periodicamente pelo scheduler para tratar boletos (compensação não imediata).
     */
    async syncPendingOrderPayments(): Promise<{ checked: number; confirmed: number; errors: number }> {
        const pending = await this.prisma.payment.findMany({
            where: {
                status: 'pending',
                mp_order_id: { not: null },
            },
        });

        let confirmed = 0;
        let errors = 0;

        for (const paymentRecord of pending) {
            try {
                const orderData = await orderClient.get({ id: paymentRecord.mp_order_id! });
                const paymentData = orderData.transactions?.payments?.[0];
                if (!paymentData?.status) continue;

                const newStatus = this.mapMercadoPagoStatus(paymentData.status as string);
                if (newStatus !== 'completed') continue;

                await this.prisma.$transaction(async (tx) => {
                    await tx.payment.update({
                        where: { id: paymentRecord.id },
                        data: { mp_payment_id: paymentData.id },
                    });
                    await this.applyPaymentCompletion(tx, paymentRecord, newStatus, String(paymentData.id));
                });

                console.info(`[syncPendingOrderPayments] Pagamento ${paymentRecord.id} confirmado (order: ${paymentRecord.mp_order_id})`);
                confirmed++;
            } catch (err: any) {
                console.warn(`[syncPendingOrderPayments] Erro ao verificar pagamento ${paymentRecord.id}: ${err.message}`);
                errors++;
            }
        }

        console.info(`[syncPendingOrderPayments] Verificados: ${pending.length} | Confirmados: ${confirmed} | Erros: ${errors}`);
        return { checked: pending.length, confirmed, errors };
    }

    async debugPayment(paymentId: string) {
        try {
            const paymentRecord = await this.prisma.payment.findUnique({
                where: { id: paymentId },
                include: { sale: true }
            });

            if (!paymentRecord) {
                return { error: "Payment não encontrado no banco" };
            }

            let mpData: any = null;
            if (paymentRecord.mp_payment_id) {
                try {
                    mpData = await mpPayment.get({ id: paymentRecord.mp_payment_id });
                } catch (err: any) {
                    console.warn(`[debugPayment] Pagamento não encontrado no MP pelo mp_payment_id: ${paymentRecord.mp_payment_id}`);
                }
            }

            if (!mpData) {
                try {
                    const searchResponse = await mpPayment.search({
                        options: { criteria: 'desc', external_reference: paymentRecord.saleId }
                    });
                    mpData = searchResponse.results?.[0] || null;
                } catch (err: any) {
                    console.warn(`[debugPayment] Pagamento não encontrado no MP por external_reference: ${paymentRecord.saleId}`);
                }
            }

            return { paymentRecord, mpData, canSync: !!mpData };
        } catch (error: any) {
            console.error("Erro no debug:", error);
            return { error: error.message };
        }
    }

    async cancelPixPayment(paymentId: string) {
        try {
            const paymentRecord = await this.prisma.payment.findUnique({
                where: { id: paymentId }
            });

            if (!paymentRecord) {
                return { error: "Payment não encontrado no banco", success: false };
            }

            if (paymentRecord.status !== 'pending') {
                return {
                    error: `Pagamento não pode ser cancelado. Status atual: ${paymentRecord.status}`,
                    success: false
                };
            }

            console.info(`[cancelPixPayment] Cancelando pagamento PIX ${paymentId}`);

            const updatedPayment = await this.prisma.payment.update({
                where: { id: paymentId },
                data: { status: 'cancelled', updatedAt: new Date() }
            });

            console.info(`[cancelPixPayment] Pagamento ${paymentId} cancelado com sucesso`);

            return { success: true, paymentId: updatedPayment.id, status: updatedPayment.status };
        } catch (error: any) {
            console.error('[cancelPixPayment] Erro ao cancelar pagamento:', error.message);
            return { success: false, error: error.message };
        }
    }

    async configureWebhook() {
        try {
            const webhookUrl = `${process.env.URL_BACKEND}/payment-methods/webhook`;

            const response = await fetch('https://api.mercadopago.com/v1/webhooks', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: webhookUrl,
                    events: [
                        { topic: 'payment' },
                        { topic: 'merchant_order' },
                        { topic: 'order' }
                    ]
                })
            });

            const data = await response.json();
            return data;
        } catch (error: any) {
            console.error('Erro ao configurar webhook:', error);
            throw error;
        }
    }
}
