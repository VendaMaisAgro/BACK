import { PaymentService } from '../payment.service';

// Mock do Prisma
jest.mock('@prisma/client');
jest.mock('mercadopago');

const prismaMock = {
  payment: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
} as any;

describe('PaymentService - cancelPixPayment', () => {
  const service = new PaymentService(prismaMock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar erro quando o pagamento não for encontrado', async () => {
      const paymentId = 'non-existent-id';
      prismaMock.payment.findUnique = jest.fn().mockResolvedValue(null);

      const result = await service.cancelPixPayment(paymentId);

      expect(result).toEqual({
        error: 'Payment não encontrado no banco',
        success: false
      });
      expect(prismaMock.payment.findUnique).toHaveBeenCalledWith({
        where: { id: paymentId }
      });
      expect(prismaMock.payment.update).not.toHaveBeenCalled();
    });

    it('deve retornar erro quando o pagamento já estiver completado', async () => {
      const paymentId = 'completed-payment-id';
      const completedPayment = {
        id: paymentId,
        status: 'completed',
        saleId: 'sale-123',
        paymentMethodId: 'method-1',
        amount: 100,
      };

      prismaMock.payment.findUnique = jest.fn().mockResolvedValue(completedPayment);

      const result = await service.cancelPixPayment(paymentId);

      expect(result).toEqual({
        error: 'Pagamento não pode ser cancelado. Status atual: completed',
        success: false
      });
      expect(prismaMock.payment.findUnique).toHaveBeenCalledWith({
        where: { id: paymentId }
      });
      expect(prismaMock.payment.update).not.toHaveBeenCalled();
    });

    it('deve retornar erro quando o pagamento já estiver cancelado', async () => {
      const paymentId = 'cancelled-payment-id';
      const cancelledPayment = {
        id: paymentId,
        status: 'cancelled',
        saleId: 'sale-123',
        paymentMethodId: 'method-1',
        amount: 100,
      };

      prismaMock.payment.findUnique = jest.fn().mockResolvedValue(cancelledPayment);

      const result = await service.cancelPixPayment(paymentId);

      expect(result).toEqual({
        error: 'Pagamento não pode ser cancelado. Status atual: cancelled',
        success: false
      });
      expect(prismaMock.payment.findUnique).toHaveBeenCalledWith({
        where: { id: paymentId }
      });
      expect(prismaMock.payment.update).not.toHaveBeenCalled();
    });

    it('deve cancelar com sucesso um pagamento pendente', async () => {
      const paymentId = 'pending-payment-id';
      const pendingPayment = {
        id: paymentId,
        status: 'pending',
        saleId: 'sale-123',
        paymentMethodId: 'method-1',
        amount: 100,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const updatedPayment = {
        ...pendingPayment,
        status: 'cancelled',
        updatedAt: new Date('2024-01-02'),
      };

      prismaMock.payment.findUnique = jest.fn().mockResolvedValue(pendingPayment);
      prismaMock.payment.update = jest.fn().mockResolvedValue(updatedPayment);

      const result = await service.cancelPixPayment(paymentId);

      expect(result).toEqual({
        success: true,
        paymentId: updatedPayment.id,
        status: 'cancelled'
      });
      expect(prismaMock.payment.findUnique).toHaveBeenCalledWith({
        where: { id: paymentId }
      });
      expect(prismaMock.payment.update).toHaveBeenCalledWith({
        where: { id: paymentId },
        data: {
          status: 'cancelled',
          updatedAt: expect.any(Date)
        }
      });
    });

    it('deve tratar erros do banco de dados corretamente', async () => {
      const paymentId = 'error-payment-id';
      const errorMessage = 'Database connection error';

      prismaMock.payment.findUnique = jest.fn().mockRejectedValue(new Error(errorMessage));

      const result = await service.cancelPixPayment(paymentId);

      expect(result).toEqual({
        success: false,
        error: errorMessage
      });
      expect(prismaMock.payment.findUnique).toHaveBeenCalledWith({
        where: { id: paymentId }
      });
      expect(prismaMock.payment.update).not.toHaveBeenCalled();
    });

    it('deve tratar erros durante a atualização do pagamento', async () => {
      const paymentId = 'update-error-payment-id';
      const pendingPayment = {
        id: paymentId,
        status: 'pending',
        saleId: 'sale-123',
        paymentMethodId: 'method-1',
        amount: 100,
      };
      const updateErrorMessage = 'Update failed';

      prismaMock.payment.findUnique = jest.fn().mockResolvedValue(pendingPayment);
      prismaMock.payment.update = jest.fn().mockRejectedValue(new Error(updateErrorMessage));

      const result = await service.cancelPixPayment(paymentId);

      expect(result).toEqual({
        success: false,
        error: updateErrorMessage
      });
      expect(prismaMock.payment.findUnique).toHaveBeenCalledWith({
        where: { id: paymentId }
      });
      expect(prismaMock.payment.update).toHaveBeenCalledWith({
        where: { id: paymentId },
        data: {
          status: 'cancelled',
          updatedAt: expect.any(Date)
        }
      });
    });
});
