/**
 * Fluxo completo de compra:
 * 1. Comprador sem endereço → middleware bloqueia (422)
 * 2. Comprador cadastra endereço
 * 3. Middleware libera a passagem
 * 4. Venda criada com sucesso
 */
import { PrismaClient } from '@prisma/client';
import { SaleService } from '../sales.service';
import { AddressService } from '../../address/address.service';

const prisma = new PrismaClient();
const saleService = new SaleService();
const addressService = new AddressService();

// Simula a lógica central do middleware usando Prisma real
async function middlewareCheck(userId: string): Promise<{ blocked: boolean; code?: string }> {
  const address = await prisma.address.findFirst({ where: { userId } });
  if (!address) return { blocked: true, code: 'USER_ADDRESS_REQUIRED' };
  return { blocked: false };
}

describe('Fluxo completo de compra', () => {
  let buyerId: string;
  let sellerId: string;
  let paymentMethodId: string;
  let transportTypeId: string;
  let productId: string;
  let sellingUnitProductId: string;

  beforeAll(async () => {
    const buyer = await prisma.user.create({
      data: {
        name: 'Comprador Ciclo',
        email: `ciclo-buyer-${Date.now()}@teste.com`,
        password: 'SenhaForte@123',
        cpf: `${Math.floor(Math.random() * 1e11)}`,
        phone_number: '11977777777',
        role: 'BUYER',
        valid: true,
      },
    });
    buyerId = buyer.id;

    const seller = await prisma.user.create({
      data: {
        name: 'Vendedor Ciclo',
        email: `ciclo-seller-${Date.now()}@teste.com`,
        password: 'SenhaForte@123',
        cpf: `${Math.floor(Math.random() * 1e11)}`,
        phone_number: '11966666666',
        role: 'SELLER',
        valid: true,
      },
    });
    sellerId = seller.id;

    const payment = await prisma.paymentMethod.create({ data: { method: 'PIX_CICLO' } });
    paymentMethodId = payment.id;

    const transport = await prisma.transportTypes.create({ data: { type: 'Caminhão Ciclo' } });
    transportTypeId = transport.id;

    const product = await prisma.product.create({
      data: {
        name: 'Produto Ciclo',
        category: 'Hortifruti',
        variety: 'Orgânico',
        stock: 100,
        description: 'Produto para teste de ciclo de compra',
        images_Path: ['img.jpg'],
        harvestAt: new Date(Date.now() + 86400000),
        productRating: 0,
        amountSold: 0,
        isNegotiable: false,
        ratingAmount: 0,
        ratingStarAmount: [],
        status: true,
        sellerId,
        createdAt: new Date(),
      },
    });
    productId = product.id;

    const unit = await prisma.sellingUnit.create({ data: { unit: 'kg', title: 'Quilograma' } });

    const sellingUnitProduct = await prisma.sellingUnitProduct.create({
      data: { unitId: unit.id, productId, minPrice: 5 },
    });
    sellingUnitProductId = sellingUnitProduct.id;
  });

  afterAll(async () => {
    await prisma.boughtProduct.deleteMany();
    await prisma.contractAcceptance.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.saleData.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.sellingUnitProduct.deleteMany();
    await prisma.product.deleteMany();
    await prisma.sellingUnit.deleteMany();
    await prisma.paymentMethod.deleteMany({ where: { method: 'PIX_CICLO' } });
    await prisma.transportTypes.deleteMany({ where: { type: 'Caminhão Ciclo' } });
    await prisma.address.deleteMany({ where: { userId: buyerId } });
    await prisma.user.deleteMany({ where: { id: { in: [buyerId, sellerId] } } });
    await prisma.$disconnect();
  });

  describe('Passo 1 – Comprador sem endereço', () => {
    it('deve bloquear a compra retornando USER_ADDRESS_REQUIRED', async () => {
      const result = await middlewareCheck(buyerId);

      expect(result.blocked).toBe(true);
      expect(result.code).toBe('USER_ADDRESS_REQUIRED');
    });

    it('não deve ter nenhum endereço vinculado ao comprador', async () => {
      const addresses = await prisma.address.findMany({ where: { userId: buyerId } });
      expect(addresses).toHaveLength(0);
    });
  });

  describe('Passo 2 – Comprador cadastra endereço', () => {
    it('deve criar o endereço e marcá-lo como padrão por ser o primeiro', async () => {
      const address = await addressService.addAddress(buyerId, {
        addressee: 'Ciclo Comprador',
        phone_number_addressee: '11977777777',
        alias: 'Fazenda',
        street: 'Estrada Rural, km 5',
        number: 'S/N',
        complement: '',
        referencePoint: 'Próximo ao silo',
        cep: '13960000',
        uf: 'SP',
        city: 'Aguaí',
        default: false,
      });

      expect(address).toHaveProperty('id');
      expect(address.default).toBe(true);
      expect(address.userId).toBe(buyerId);
    });
  });

  describe('Passo 3 – Middleware libera após cadastro de endereço', () => {
    it('não deve bloquear comprador que já possui endereço', async () => {
      const result = await middlewareCheck(buyerId);

      expect(result.blocked).toBe(false);
      expect(result.code).toBeUndefined();
    });
  });

  describe('Passo 4 – Venda criada com sucesso', () => {
    it('deve criar a venda normalmente para comprador com endereço', async () => {
      const address = await prisma.address.findFirst({ where: { userId: buyerId } });

      expect(address).not.toBeNull();

      const sale = await saleService.create({
        transportTypeId,
        createdAt: new Date(),
        transportValue: 30,
        cargoWeightKg: 20,
        paymentMethodId,
        buyerId,
        addressId: address!.id,
        boughtProducts: [
          { productId, sellingUnitProductId, value: 5, amount: 3 },
        ],
      });

      expect(sale).toHaveProperty('id');
      expect(sale.buyerId).toBe(buyerId);
      expect(sale.boughtProducts).toHaveLength(1);
      expect(sale.boughtProducts[0].value).toBe(15); // minPrice(5) * amount(3)
    }, 30000);
  });
});
