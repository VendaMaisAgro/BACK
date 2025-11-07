import { Payment, PrismaClient } from '@prisma/client';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({ accessToken: process.env.ACCESS_TOKEN || 'MERCADO_PAGO_ACCESS_TOKEN' });
const preference = new Preference(client);

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
                        success: 'https://www.vendamaisagro.com.br/sucesso',
                        failure: 'https://www.vendamaisagro.com.br/erro',
                        pending: 'https://www.vendamaisagro.com.br/pendente'
                    },
                    auto_return: 'approved'
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

}