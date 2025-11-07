import { PrismaClient } from '@prisma/client';
import { SaleService } from '../sales.service';

const prisma = new PrismaClient();
const service = new SaleService();

describe('SaleService', () => {
  let buyerId: string;
  let sellerId: string;
  let addressId: string;
  let paymentMethodId: string;
  let transportTypeId: string;
  let productId: string;
  let sellingUnitId: string;
  let sellingUnitProductId: string;
  let saleId: string;

  beforeAll(async () => {
    // Usuário comprador
    const buyer = await prisma.user.create({
      data: {
        name: 'Comprador Teste',
        email: `buyer${Date.now()}@teste.com`,
        password: 'SenhaForte@123',
        cpf: `${Math.floor(Math.random() * 1e11)}`,
        phone_number: '11999999999',
        role: 'BUYER',
        valid: true,
      },
    });
    buyerId = buyer.id;

    // Usuário vendedor
    const seller = await prisma.user.create({
      data: {
        name: 'Vendedor Teste',
        email: `seller${Date.now()}@teste.com`,
        password: 'SenhaForte@123',
        cpf: `${Math.floor(Math.random() * 1e11)}`,
        phone_number: '11988888888',
        role: 'SELLER',
        valid: true,
      },
    });
    sellerId = seller.id;

    // Endereço (do buyer)
    const address = await prisma.address.create({
      data: {
        userId: buyerId,
        addressee: 'Destinatário',
        phone_number_addressee: '11999999999',
        alias: 'Casa',
        street: 'Rua Teste',
        number: '123',
        complement: '',
        referencePoint: '',
        cep: '12345678',
        uf: 'SP',
        city: 'São Paulo',
        default: true,
      },
    });
    addressId = address.id;

    // Método de pagamento
    const payment = await prisma.paymentMethod.create({
      data: { method: 'PIX' },
    });
    paymentMethodId = payment.id;

    // Tipo de transporte (valueFreight tem default 0.0)
    const transport = await prisma.transportTypes.create({
      data: { type: 'Motoboy' },
    });
    transportTypeId = transport.id;

    // Produto do vendedor
    const product = await prisma.product.create({
      data: {
        name: 'Produto Venda',
        category: 'Categoria',
        variety: 'Variedade',
        stock: 50,
        description: 'Produto para teste de venda',
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

    // Unidade e relação produto-unidade
    const unit = await prisma.sellingUnit.create({
      data: { unit: 'cx', title: 'Caixa' },
    });
    sellingUnitId = unit.id;

    const sellingUnitProduct = await prisma.sellingUnitProduct.create({
      data: {
        unitId: sellingUnitId,
        productId: productId,
        minPrice: 10,
      },
    });
    sellingUnitProductId = sellingUnitProduct.id;
  });

  afterAll(async () => {
    // Limpeza em ordem de dependências
    await prisma.boughtProduct.deleteMany();
    await prisma.saleData.deleteMany();
    await prisma.sellingUnitProduct.deleteMany();
    await prisma.product.deleteMany();
    await prisma.sellingUnit.deleteMany();
    await prisma.paymentMethod.deleteMany();
    await prisma.transportTypes.deleteMany();
    await prisma.address.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('create', () => {
    it('deve criar uma venda com sucesso (com addressId)', async () => {
      const data = {
        transportTypeId,
        createdAt: new Date(),
        shippedAt: new Date(Date.now() + 3600000),
        arrivedAt: new Date(Date.now() + 7200000),
        transportValue: 15.5,

        // Peso em KG (Decimal no banco)
        cargoWeightKg: 125.5,

        productRating: 5,
        sellerRating: 5,
        addressId,
        paymentMethodId,
        buyerId,
        boughtProducts: [
          {
            productId,
            sellingUnitProductId,
            value: 20,   // será recalculado no service
            amount: 2,
          },
        ],
      };

      const sale = await service.create(data);
      expect(sale).toHaveProperty('id');
      expect(sale.buyer.id).toBe(buyerId);
      expect(sale.boughtProducts[0].product.sellerId).toBe(sellerId);
      expect(sale.boughtProducts.length).toBe(1);

      // Decimal -> comparar como string
      expect(String(sale.cargoWeightKg)).toBe('125.5');

      saleId = sale.id;
    });

    it('deve criar uma venda SEM addressId (retirada)', async () => {
      const data = {
        transportTypeId,
        createdAt: new Date(),
        transportValue: 10,
        cargoWeightKg: 10.25,
        paymentMethodId,
        buyerId,
        boughtProducts: [
          {
            productId,
            sellingUnitProductId,
            value: 10,
            amount: 1,
          },
        ],
      };

      const sale = await service.create(data as any);
      expect(sale.addressId).toBeNull();
      expect(String(sale.cargoWeightKg)).toBe('10.25');
    });

    it('deve falhar ao criar venda com comprador inexistente', async () => {
      const dataSemBuyer = {
        transportTypeId,
        createdAt: new Date(),
        transportValue: 15.5,
        productRating: 5,
        sellerRating: 5,
        addressId,
        paymentMethodId,
        boughtProducts: [
          {
            productId,
            sellingUnitProductId,
            value: 20,
            amount: 2,
          },
        ],
      };

      await expect(
        service.create({ ...dataSemBuyer, buyerId: 'non-existing-id' } as any)
      ).rejects.toThrow('Usuário comprador (buyerId=non-existing-id) não encontrado');
    });
  });

  describe('getAll', () => {
    it('deve listar todas as vendas', async () => {
      const sales = await service.getAll();
      expect(Array.isArray(sales)).toBe(true);
      expect(sales.length).toBeGreaterThan(0);
    });
  });

  describe('getById', () => {
    it('deve retornar venda pelo ID', async () => {
      const sale = await service.getById(String(saleId));
      expect(sale).not.toBeNull();
      expect(sale?.id).toBe(saleId);
    });
  });

  describe('update', () => {
    it('deve atualizar a venda (peso/cargoWeightKg)', async () => {
      const updated = await service.update(String(saleId), {
        productRating: 4,
        sellerRating: 4,
        cargoWeightKg: 140.25,
      });
      expect(updated.productRating).toBe(4);
      expect(updated.sellerRating).toBe(4);
      expect(String(updated.cargoWeightKg)).toBe('140.25');
    });
  });

  describe('delete', () => {
    it('deve deletar venda existente', async () => {
      const result = await service.delete(String(saleId));
      expect(result).toHaveProperty('id', saleId);
    });

    it('deve falhar ao deletar venda inexistente', async () => {
      await expect(service.delete('non-existing-id')).rejects.toThrow();
    });
  });
});