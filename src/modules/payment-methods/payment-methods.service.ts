import { PrismaClient } from '@prisma/client';

export class PaymentMethodsService {
  private readonly prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  async createPaymentMethod(data: { method: string; description?: string }) {
    return this.prisma.paymentMethod.create({
      data: {
        method: data.method
      },
    });
  }

  async getAllPaymentMethods() {
    return this.prisma.paymentMethod.findMany();
  }

  async getPaymentMethodById(id: string) {
    return this.prisma.paymentMethod.findUnique({
      where: { id },
    });
  }

  async updatePaymentMethod(id: string, data: { method: Partial<string> }) {
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id },
    });
    if (!paymentMethod) {
      throw new Error('Método de pagamento não encontrado.');
    }

    return this.prisma.paymentMethod.update({
      where: { id }, data
    });
  }

  async deletePaymentMethod(id: string) {
    return this.prisma.paymentMethod.delete({
      where: { id },
    });
  }
}