import { Payment, PrismaClient } from '@prisma/client';
import { MercadoPagoConfig, Preference, Payment as MPPayment } from 'mercadopago';
import type { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes';
import 'dotenv/config';

const client = new MercadoPagoConfig({ accessToken: process.env.ACCESS_TOKEN || 'MERCADO_PAGO_ACCESS_TOKEN' });
const preference = new Preference(client);
const mpPayment = new MPPayment(client);

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

            return {
                paymentId: payment.id,
                mp_preference_id: response.id,
                init_point: response.init_point
            };
        } catch (error: any) {
            throw new Error(error.message || 'Erro ao criar preferência do Mercado Pago');
        }
    }

    async getById(paymentId: string): Promise<Payment | null> {
        return this.prisma.payment.findUnique({
            where: { id: paymentId }
        });
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
            'charged_back': 'refunded'
        };
        return statusMap[mpStatus] || 'pending';
    }

    async processWebhook(data: any) {
        try {
            const topic = data.topic || data.type;
            const action = data.action;
            const resourceId = data.data?.id || data.id;

            if (!resourceId) {
                console.warn("⚠️ Webhook sem resource ID");
                return { error: "Webhook sem ID de recurso válido" };
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
                const updatedPayment = await this.prisma.payment.update({
                    where: { id: paymentRecord.id },
                    data: {
                        status: newStatus,
                        mp_payment_id: String(mpPaymentData.id),
                        updatedAt: new Date()
                    }
                });

                if (newStatus === 'completed') {
                    try {
                        const updatedSale = await this.prisma.saleData.update({
                            where: { id: paymentRecord.saleId },
                            data: {
                                status: 'Pagamento confirmado!',
                                paymentCompleted: true
                            }
                        });
                    } catch (saleError: any) {
                        console.error("Erro ao atualizar venda:", saleError.message);
                    }
                }
            } else {
                console.log("Status não mudou, nenhuma atualização necessária");
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

            if (paymentRecord.mp_payment_id) {
                try {
                    mpPaymentData = await mpPayment.get({ id: paymentRecord.mp_payment_id });
                } catch (err) {
                    console.log("Não encontrado pelo mp_payment_id");
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
                } catch (err) {
                    console.log("Erro ao buscar pela preference:", err);
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
                } catch (err) {
                    console.log("Erro ao buscar por external_reference:", err);
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
            const updatedPayment = await this.prisma.payment.update({
                where: { id: paymentRecord.id },
                data: {
                    status: newStatus,
                    mp_payment_id: String(mpPaymentData.id),
                    updatedAt: new Date()
                }
            });

            if (newStatus === 'completed') {
                await this.prisma.saleData.update({
                    where: { id: paymentRecord.saleId },
                    data: {
                        status: 'Pagamento confirmado!',
                        paymentCompleted: true
                    }
                });
            }

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
                } catch (err) {
                    console.log("Não encontrado por mp_payment_id");
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
                } catch (err) {
                    console.log("Não encontrado por external_reference");
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
                        { topic: 'merchant_order' }
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