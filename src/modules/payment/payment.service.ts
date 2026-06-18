import { Payment, PrismaClient } from '@prisma/client';
import { MercadoPagoConfig, Preference, Payment as MPPayment, PaymentMethod, Order } from 'mercadopago';
import type { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const client = new MercadoPagoConfig({ accessToken: process.env.ACCESS_TOKEN || 'MERCADO_PAGO_ACCESS_TOKEN' });
const preference = new Preference(client);
const mpPayment = new MPPayment(client);
const paymentMethod = new PaymentMethod(client);
const orderClient = new Order(client);

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
    }) {
        try {
            console.info(`[createPreference] Criando preferência de pagamento para venda ${params.saleId}`);

            const response = await preference.create({
                body: {
                    items: [
                        {
                            id: params.saleId,
                            title: params.title,
                            quantity: params.quantity,
                            unit_price: params.unit_price
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
                    amount: params.amount,
                    status: 'pending',
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

    async getById(paymentId: string): Promise<Payment | null> {
        return this.prisma.payment.findUnique({
            where: { id: paymentId }
        });
    }

    /**
     * Lista todos os meios de pagamento disponíveis
     */
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

    /**
     * Cria um pagamento PIX usando a Orders API (Checkout Transparente)
     * @param params.saleId - ID da venda
     * @param params.paymentMethodId - ID do método de pagamento no banco local
     * @param params.amount - Valor do pagamento
     * @param params.email - Email do pagador
     * @param params.expirationMinutes - Tempo de expiração em minutos (opcional, padrão: 30 minutos)
     */
    async createPixPayment(params: {
        saleId: string;
        paymentMethodId: string;
        amount: number;
        email: string;
        expirationMinutes?: number;
    }) {
        try {
            console.info(`[createPixPayment] Criando pagamento PIX para venda ${params.saleId}`);

            const expirationMinutes = params.expirationMinutes || 30;
            const expirationTime = `PT${expirationMinutes}M`;
            const idempotencyKey = randomUUID();

            const orderResponse = await orderClient.create({
                body: {
                    type: 'online',
                    total_amount: params.amount.toFixed(2),
                    external_reference: params.saleId,
                    processing_mode: 'automatic',
                    transactions: {
                        payments: [
                            {
                                amount: params.amount.toFixed(2),
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
                },
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
                    amount: params.amount,
                    status: 'pending',
                    mp_order_id: orderResponse.id,
                    mp_payment_id: paymentData.id,
                }
            });

            console.info(`[createPixPayment] Pagamento PIX criado com sucesso - PaymentId: ${payment.id}, OrderId: ${orderResponse.id}`);

            return {
                paymentId: payment.id,
                orderId: orderResponse.id,
                orderStatus: orderResponse.status,
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
    }) {
        try {
            console.info(`[createBoletoPayment] Criando pagamento com boleto para venda ${params.saleId}`);

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
                    total_amount: params.amount.toFixed(2),
                    external_reference: String(sale.orderNumber),
                    processing_mode: 'automatic',
                    transactions: {
                        payments: [
                            {
                                amount: params.amount.toFixed(2),
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
                    amount: params.amount,
                    status: 'pending',
                    mp_order_id: orderResponse.id,
                    mp_payment_id: paymentData.id,
                }
            });

            console.info(`[createBoletoPayment] Boleto criado com sucesso - PaymentId: ${payment.id}, OrderId: ${orderResponse.id}`);

            return {
                paymentId: payment.id,
                orderId: orderResponse.id,
                orderStatus: orderResponse.status,
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

    async updatePayment(paymentId: string, data: Partial<Payment>) {
        return this.prisma.payment.update({
            where: { id: paymentId },
            data
        });
    }

    private mapMercadoPagoStatus(mpStatus: string): string {
        const statusMap: Record<string, string> = {
            // Status da Payment API (antiga)
            'approved': 'completed',
            'pending': 'pending',
            'in_process': 'pending',
            'rejected': 'failed',
            'cancelled': 'cancelled',
            'refunded': 'refunded',
            'charged_back': 'refunded',

            // Status da Orders API (nova)
            'action_required': 'pending',  // Aguardando ação do usuário (ex: pagar PIX)
            'processed': 'completed',       // Order processada com sucesso
            'expired': 'failed',            // Order expirada
            'cancelled_by_payer': 'cancelled',
            'cancelled_by_seller': 'cancelled'
        };
        return statusMap[mpStatus] || 'pending';
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

            // Se for webhook de Order (começa com "ORD"), processa diferente
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

            }

            else {
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

                // Usa transação para garantir atomicidade entre atualização do pagamento e da venda
                await this.prisma.$transaction(async (tx) => {
                    // Atualiza o status do pagamento
                    await tx.payment.update({
                        where: { id: paymentRecord.id },
                        data: {
                            status: newStatus,
                            mp_payment_id: String(mpPaymentData.id),
                            updatedAt: new Date()
                        }
                    });

                    // Se o pagamento foi completado, atualiza a venda
                    if (newStatus === 'completed') {
                        console.info(`[Webhook] Pagamento completado! Atualizando venda ${paymentRecord.saleId}`);
                        await tx.saleData.update({
                            where: { id: paymentRecord.saleId },
                            data: {
                                status: 'Pagamento confirmado!',
                                paymentCompleted: true
                            }
                        });
                    }
                });

                console.info(`[Webhook] Pagamento ${paymentRecord.id} atualizado com sucesso`);
            } else {
                console.info(`[Webhook] Status do pagamento ${paymentRecord.id} não mudou (${paymentRecord.status}), nenhuma atualização necessária`);
            }

            return {
                success: true,
                paymentId: paymentRecord.id,
                saleId: paymentRecord.saleId,
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

    /**
     * Processa webhooks da Orders API (PIX e outros pagamentos do Checkout Transparente)
     */
    private async processOrderWebhook(orderId: string, webhookData: any) {
        try {
            console.info(`[processOrderWebhook] Processando webhook para Order ${orderId}`);

            await new Promise(resolve => setTimeout(resolve, 1500));

            // Busca a order no Mercado Pago
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

            // Busca o pagamento no banco pelo external_reference (saleId ou orderNumber) ou mp_order_id
            let paymentRecord = await this.prisma.payment.findFirst({
                where: {
                    OR: [
                        { saleId: externalReference },
                        { mp_order_id: orderId },
                        // external_reference pode ser orderNumber (número inteiro como string)
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

            // Extrai dados do pagamento da order
            const paymentData = orderData.transactions?.payments?.[0];
            if (!paymentData) {
                console.warn('[processOrderWebhook] Order sem dados de pagamento');
                return {
                    success: true,
                    message: 'Order recebida mas sem dados de pagamento ainda'
                };
            }

            // Mapeia o status do pagamento
            const newStatus = this.mapMercadoPagoStatus(paymentData.status);

            if (paymentRecord.status !== newStatus) {
                console.info(`[processOrderWebhook] Atualizando pagamento ${paymentRecord.id}: ${paymentRecord.status} -> ${newStatus}`);

                await this.prisma.$transaction(async (tx) => {
                    await tx.payment.update({
                        where: { id: paymentRecord.id },
                        data: {
                            status: newStatus,
                            mp_order_id: orderId,
                            mp_payment_id: paymentData.id,
                            updatedAt: new Date()
                        }
                    });

                    // Se o pagamento foi completado, atualiza a venda
                    if (newStatus === 'completed') {
                        console.info(`[processOrderWebhook] Pagamento completado! Atualizando venda ${paymentRecord.saleId}`);
                        await tx.saleData.update({
                            where: { id: paymentRecord.saleId },
                            data: {
                                status: 'Pagamento confirmado!',
                                paymentCompleted: true
                            }
                        });
                    }
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

            // Se tiver mp_order_id, é um pagamento da Orders API (PIX via Checkout Transparente)
            // Comentado temporariamente até gerar o cliente Prisma com o novo campo
            // if (paymentRecord.mp_order_id) {
            //     try {
            //         const orderData = await orderClient.get({ id: paymentRecord.mp_order_id });
            //         mpPaymentData = orderData.transactions?.payments?.[0];
            //         if (mpPaymentData) {
            //             mpPaymentData.mp_order_id = paymentRecord.mp_order_id;
            //         }
            //     } catch (err: any) {
            //         console.warn(`[syncPaymentStatus] Order não encontrada no MP pelo mp_order_id: ${paymentRecord.mp_order_id}`);
            //     }
            // }

            // Tenta buscar pelo mp_payment_id (API antiga e nova)
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
                        options: {
                            criteria: 'desc',
                            limit: 50
                        }
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
                        options: {
                            criteria: 'desc',
                            external_reference: paymentRecord.saleId
                        }
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

            // Usa transação para garantir atomicidade entre atualização do pagamento e da venda
            const updatedPayment = await this.prisma.$transaction(async (tx) => {
                const payment = await tx.payment.update({
                    where: { id: paymentRecord.id },
                    data: {
                        status: newStatus,
                        mp_payment_id: String(mpPaymentData.id),
                        updatedAt: new Date()
                    }
                });

                // Se o pagamento foi completado, atualiza a venda
                if (newStatus === 'completed') {
                    console.info(`[syncPaymentStatus] Pagamento completado! Atualizando venda ${paymentRecord.saleId}`);
                    await tx.saleData.update({
                        where: { id: paymentRecord.saleId },
                        data: {
                            status: 'Pagamento confirmado!',
                            paymentCompleted: true
                        }
                    });
                }

                return payment;
            });

            console.info(`[syncPaymentStatus] Pagamento ${paymentRecord.id} sincronizado com sucesso`);

            return {
                success: true,
                updated: true,
                payment: {
                    id: updatedPayment.id,
                    status: updatedPayment.status,
                    mp_payment_id: updatedPayment.mp_payment_id,
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
            return {
                success: false,
                error: message
            };
        }
    }

    async debugPayment(paymentId: string) {
        try {
            const paymentRecord = await this.prisma.payment.findUnique({
                where: { id: paymentId },
                include: {
                    sale: true
                }
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
                        options: {
                            criteria: 'desc',
                            external_reference: paymentRecord.saleId
                        }
                    });
                    mpData = searchResponse.results?.[0] || null;
                } catch (err: any) {
                    console.warn(`[debugPayment] Pagamento não encontrado no MP por external_reference: ${paymentRecord.saleId}`);
                }
            }

            return {
                paymentRecord,
                mpData,
                canSync: !!mpData
            };

        } catch (error: any) {
            console.error("Erro no debug:", error);
            return { error: error.message };
        }
    }

    /**
     * Cancela um pagamento PIX pendente ou em processamento
     * Segundo a documentação, só pode cancelar pagamentos com status=action_required
     */
    async cancelPixPayment(paymentId: string) {
        try {
            const paymentRecord = await this.prisma.payment.findUnique({
                where: { id: paymentId }
            });

            if (!paymentRecord) {
                return { error: "Payment não encontrado no banco", success: false };
            }

            // Comentado temporariamente até gerar o cliente Prisma com o novo campo
            // if (!paymentRecord.mp_order_id) {
            //     return { error: "Payment não possui mp_order_id (não é um pagamento PIX)", success: false };
            // }

            // Verifica se o pagamento está em status que permite cancelamento
            if (paymentRecord.status !== 'pending') {
                return {
                    error: `Pagamento não pode ser cancelado. Status atual: ${paymentRecord.status}`,
                    success: false
                };
            }

            console.info(`[cancelPixPayment] Cancelando pagamento PIX ${paymentId}`);

            // Cancela a order via API do Mercado Pago
            // Comentado temporariamente até gerar o cliente Prisma
            // try {
            //     await orderClient.cancel({ id: paymentRecord.mp_order_id });
            // } catch (error: any) {
            //     console.error(`[cancelPixPayment] Erro ao cancelar order no MP:`, error.message);
            //     return { error: 'Erro ao cancelar order no Mercado Pago', message: error.message, success: false };
            // }

            // Atualiza o status no banco de dados
            const updatedPayment = await this.prisma.payment.update({
                where: { id: paymentId },
                data: {
                    status: 'cancelled',
                    updatedAt: new Date()
                }
            });

            console.info(`[cancelPixPayment] Pagamento ${paymentId} cancelado com sucesso`);

            return {
                success: true,
                paymentId: updatedPayment.id,
                status: updatedPayment.status
            };

        } catch (error: any) {
            console.error('[cancelPixPayment] Erro ao cancelar pagamento:', error.message);
            return {
                success: false,
                error: error.message
            };
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
                        { topic: 'order' }  // Adiciona suporte para webhooks de Orders
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