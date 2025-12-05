import { Payment, PrismaClient } from '@prisma/client';
import { MercadoPagoConfig, Preference, Payment as MPPayment } from 'mercadopago';

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
                        success: 'https://www.vendamaisagro.com.br/payment/sucesso',
                        failure: 'https://www.vendamaisagro.com.br/payment/erro',
                        pending: 'https://www.vendamaisagro.com.br/payment/pendente'
                    },
                    auto_return: 'approved',
                    notification_url: 'https://www.vendamaisagro.com.br/api/payment/webhook',
                    // Adiciona external_reference para facilitar a busca
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

            console.log('Testando conexão simples...');
            const testUser = await this.prisma.user.create({
                data: {
                    name: 'Teste',
                    phone_number: '123456789',
                    email: 'teste@test.com',
                    password: 'hashedpassword',
                    role: 'buyer',
                },
            });
            console.log('Usuário teste criado:', testUser);

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

    /**
     * Mapeia o status do Mercado Pago para o status do seu sistema
     */
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
            console.log("=== INÍCIO PROCESSAMENTO WEBHOOK ===");
            console.log("Payload recebido:", JSON.stringify(data, null, 2));

            // O Mercado Pago envia diferentes tipos de notificações
            const notificationType = data.type || data.topic;
            const resourceId = data.data?.id || data.id;

            console.log("Tipo de notificação:", notificationType);
            console.log("Resource ID:", resourceId);

            if (!resourceId) {
                console.warn("Webhook sem ID de recurso");
                return { error: "Webhook sem ID de recurso válido" };
            }

            let mpPaymentData: any = null;
            let paymentRecord: Payment | null = null;

            // CASO 1: Notificação de payment (mais comum)
            if (notificationType === 'payment') {
                try {
                    console.log("Buscando pagamento no MP com ID:", resourceId);
                    mpPaymentData = await mpPayment.get({ id: resourceId });
                    console.log("Pagamento MP encontrado. Status:", mpPaymentData.status);
                    console.log("Dados completos MP:", JSON.stringify(mpPaymentData, null, 2));

                    // Tenta buscar pela preference_id (mais confiável)
                    const preferenceId = mpPaymentData.metadata?.preference_id ||
                        mpPaymentData.external_reference;

                    console.log("Preference/External Reference ID:", preferenceId);

                    if (preferenceId) {
                        // Busca pela preference_id
                        paymentRecord = await this.prisma.payment.findFirst({
                            where: {
                                OR: [
                                    { mp_preference_id: preferenceId },
                                    { saleId: preferenceId } // external_reference é o saleId
                                ]
                            }
                        });
                        console.log("Busca por preference/external:", paymentRecord ? "Encontrado" : "Não encontrado");
                    }

                    // Fallback: busca pelo mp_payment_id se já foi salvo antes
                    if (!paymentRecord) {
                        console.log("Tentando buscar por mp_payment_id:", resourceId);
                        paymentRecord = await this.prisma.payment.findFirst({
                            where: { mp_payment_id: String(resourceId) }
                        });
                        console.log("Busca por mp_payment_id:", paymentRecord ? "Encontrado" : "Não encontrado");
                    }

                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    console.error('Erro ao buscar pagamento no MP:', message);
                    return { error: "Erro ao buscar pagamento no Mercado Pago", details: message };
                }
            }
            // CASO 2: Notificação de merchant_order
            else if (notificationType === 'merchant_order') {
                console.log("Processando merchant_order");

                // Tenta buscar o payment record pela preference ou saleId
                paymentRecord = await this.prisma.payment.findFirst({
                    where: {
                        OR: [
                            { mp_preference_id: resourceId },
                            { saleId: resourceId }
                        ]
                    }
                });

                if (paymentRecord && paymentRecord.mp_payment_id) {
                    // Se já tem mp_payment_id salvo, busca ele
                    console.log("Buscando payment existente:", paymentRecord.mp_payment_id);
                    mpPaymentData = await mpPayment.get({ id: paymentRecord.mp_payment_id });
                } else if (paymentRecord) {
                    // Busca payments relacionados a esta venda
                    console.log("Buscando payments por external_reference:", paymentRecord.saleId);
                    const searchResponse = await mpPayment.search({
                        options: {
                            criteria: 'desc',
                            external_reference: paymentRecord.saleId
                        }
                    });

                    const results = searchResponse.results ?? [];
                    if (results.length > 0) {
                        // Prioriza pagamento aprovado ou pega o mais recente
                        mpPaymentData = results.find(p => p.status === 'approved') || results[0];
                        console.log("Payment encontrado via search. Status:", mpPaymentData.status);
                    }
                }
            }

            // Validações
            if (!paymentRecord) {
                console.error('Registro de pagamento não encontrado no banco');
                console.log("Tentou buscar com:");
                console.log("- Resource ID:", resourceId);
                console.log("- Tipo:", notificationType);
                return { error: "Pagamento não encontrado no banco de dados" };
            }

            if (!mpPaymentData) {
                console.error('Dados do pagamento não encontrados no Mercado Pago');
                return { error: "Dados do pagamento não encontrados no Mercado Pago" };
            }

            console.log("Payment record encontrado. ID:", paymentRecord.id);
            console.log("Status atual no banco:", paymentRecord.status);
            console.log("Status no MP:", mpPaymentData.status);

            const newStatus = this.mapMercadoPagoStatus(mpPaymentData.status);
            console.log("Novo status mapeado:", newStatus);

            const updatedPayment = await this.prisma.payment.update({
                where: { id: paymentRecord.id },
                data: {
                    status: newStatus,
                    mp_payment_id: String(mpPaymentData.id),
                    updatedAt: new Date()
                }
            });

            console.log("✅ Payment atualizado no banco:", {
                id: updatedPayment.id,
                status: updatedPayment.status,
                mp_payment_id: updatedPayment.mp_payment_id
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
                    console.log(`Pedido ${paymentRecord.saleId} atualizado:`, {
                        status: updatedSale.status,
                        paymentCompleted: updatedSale.paymentCompleted
                    });
                } catch (saleError) {
                    console.error(`Erro ao atualizar pedido ${paymentRecord.saleId}:`, saleError);
                }
            }

            console.log("=== FIM PROCESSAMENTO WEBHOOK ===");

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
            const message = error instanceof Error ? error.message : String(error);
            console.error('ERRO CRÍTICO ao processar webhook:', message);
            console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
            return { error: 'Erro ao processar webhook', message: message };
        }
    }

    /**
     * Busca o status atualizado de um pagamento no Mercado Pago
     * Útil quando o webhook não chegou ou você quer verificar manualmente
     */
    async syncPaymentStatus(paymentId: string) {
        try {
            console.log("=== SINCRONIZANDO STATUS DO PAGAMENTO ===");

            // Busca o payment no banco
            const paymentRecord = await this.prisma.payment.findUnique({
                where: { id: paymentId },
                include: { sale: true }
            });

            if (!paymentRecord) {
                return { error: "Payment não encontrado no banco", success: false };
            }

            console.log("Payment no banco:", {
                id: paymentRecord.id,
                status: paymentRecord.status,
                mp_preference_id: paymentRecord.mp_preference_id,
                mp_payment_id: paymentRecord.mp_payment_id
            });

            let mpPaymentData: any = null;

            // ESTRATÉGIA 1: Se já tem mp_payment_id, busca direto
            if (paymentRecord.mp_payment_id) {
                try {
                    console.log("Buscando por mp_payment_id:", paymentRecord.mp_payment_id);
                    mpPaymentData = await mpPayment.get({ id: paymentRecord.mp_payment_id });
                    console.log("Encontrado pelo mp_payment_id");
                } catch (err) {
                    console.log("Não encontrado pelo mp_payment_id");
                }
            }

            // ESTRATÉGIA 2: Busca pela preference_id
            if (!mpPaymentData && paymentRecord.mp_preference_id) {
                try {
                    console.log("🔍 Buscando pagamentos da preference:", paymentRecord.mp_preference_id);
                    const searchResponse = await mpPayment.search({
                        options: {
                            criteria: 'desc',
                            limit: 50
                        }
                    });

                    // Filtra pagamentos dessa preferência
                    const results = searchResponse.results?.filter((p: any) =>
                        p.metadata?.preference_id === paymentRecord.mp_preference_id ||
                        p.external_reference === paymentRecord.saleId
                    ) || [];

                    console.log(`Encontrados ${results.length} pagamentos relacionados`);

                    if (results.length > 0) {
                        // Prioriza: approved > pending > outros
                        mpPaymentData = results.find((p: any) => p.status === 'approved') ||
                            results.find((p: any) => p.status === 'pending') ||
                            results[0];
                        console.log("Pagamento selecionado. Status:", mpPaymentData.status);
                    }
                } catch (err) {
                    console.log("Erro ao buscar pela preference:", err);
                }
            }

            // ESTRATÉGIA 3: Busca por external_reference (saleId)
            if (!mpPaymentData) {
                try {
                    console.log("Buscando por external_reference (saleId):", paymentRecord.saleId);
                    const searchResponse = await mpPayment.search({
                        options: {
                            criteria: 'desc',
                            external_reference: paymentRecord.saleId
                        }
                    });

                    const results = searchResponse.results || [];
                    console.log(`Encontrados ${results.length} pagamentos por external_reference`);

                    if (results.length > 0) {
                        mpPaymentData = results.find((p: any) => p.status === 'approved') || results[0];
                        console.log("Pagamento encontrado. Status:", mpPaymentData.status);
                    }
                } catch (err) {
                    console.log("Erro ao buscar por external_reference:", err);
                }
            }

            // Se não encontrou nada, o pagamento ainda não foi realizado
            if (!mpPaymentData) {
                console.log("Nenhum pagamento encontrado no Mercado Pago");
                return {
                    success: false,
                    message: "Pagamento ainda não foi realizado ou processado pelo Mercado Pago",
                    current_status: paymentRecord.status,
                    mp_preference_id: paymentRecord.mp_preference_id
                };
            }

            // Mapeia o status
            const newStatus = this.mapMercadoPagoStatus(mpPaymentData.status);
            console.log("Status MP:", mpPaymentData.status, "→ Status Sistema:", newStatus);

            // Atualiza o payment
            const updatedPayment = await this.prisma.payment.update({
                where: { id: paymentRecord.id },
                data: {
                    status: newStatus,
                    mp_payment_id: String(mpPaymentData.id),
                    updatedAt: new Date()
                }
            });

            console.log("Payment atualizado:", {
                status: updatedPayment.status,
                mp_payment_id: updatedPayment.mp_payment_id
            });

            // Se aprovado, atualiza a venda
            if (newStatus === 'completed') {
                await this.prisma.saleData.update({
                    where: { id: paymentRecord.saleId },
                    data: {
                        status: 'Pagamento confirmado!',
                        paymentCompleted: true
                    }
                });
                console.log("Venda atualizada para paga");
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

    /**
     * Método auxiliar para testar/debugar um pagamento específico
     * Use isso para verificar se consegue buscar os dados do MP
     */
    async debugPayment(paymentId: string) {
        try {
            console.log("=== DEBUG PAYMENT ===");

            // Busca no banco
            const paymentRecord = await this.prisma.payment.findUnique({
                where: { id: paymentId },
                include: {
                    sale: true
                }
            });

            if (!paymentRecord) {
                return { error: "Payment não encontrado no banco" };
            }

            console.log("Payment no banco:", paymentRecord);

            // Tenta buscar no MP se tiver mp_payment_id
            let mpData = null;
            if (paymentRecord.mp_payment_id) {
                try {
                    mpData = await mpPayment.get({ id: paymentRecord.mp_payment_id });
                    console.log("Payment no MP:", mpData);
                } catch (err) {
                    console.log("Não encontrado por mp_payment_id");
                }
            }

            // Tenta buscar por external_reference (saleId)
            if (!mpData) {
                try {
                    const searchResponse = await mpPayment.search({
                        options: {
                            criteria: 'desc',
                            external_reference: paymentRecord.saleId
                        }
                    });
                    mpData = searchResponse.results?.[0];
                    console.log("Payment encontrado por external_reference:", mpData);
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
}