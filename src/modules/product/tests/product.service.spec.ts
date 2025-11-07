import { ProductService } from '../product.service';
import { prismaMock } from '../../../lib/prismaMock'; // Se quiser usar o mock, ajuste o ProductService para aceitar o prisma como parâmetro
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const service = new ProductService();

describe('ProductService', () => {
  let sellerId: number;
  let unitId: number;
  let productId: number;

  beforeAll(async () => {
    // Criar um vendedor fake
    const seller = await prisma.user.create({
      data: {
        name: 'Vendedor Teste',
        email: `vendedor${Date.now()}@teste.com`,
        password: 'SenhaForte@123',
        cpf: '12345678901',
        phone_number: '11999999999',
        role: 'SELLER',
      },
    });
    sellerId = seller.id;

    // Criar unidade de venda fake
    const unit = await prisma.sellingUnit.create({
      data: { unit: 'kg', title: 'Caixa 10kg' },
    });
    unitId = unit.id;
  });

  afterAll(async () => {
    await prisma.product.deleteMany();
    await prisma.sellingUnit.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('create', () => {
    it('deve criar um produto com sucesso', async () => {
      const data = {
        name: 'Tomate Italiano',
        category: 'Hortifruti',
        variety: 'Italiano',
        stock: 50,
        description: 'Tomate fresco de alta qualidade',
        images_Path: ['tomate.jpg'],
        harvestAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // amanhã
        productRating: 5,
        amountSold: 0,
        isNegotiable: false,
        ratingAmount: 0,
        ratingStarAmount: [],
        status: true, // Corrigido para boolean
        sellerId,
        sellingUnitsProduct: [
          { unitId, minPrice: 15.5 }
        ],
      };

      const product = await service.create(data);
      expect(product).toHaveProperty('id');
      expect(product.name).toBe(data.name);
      productId = product.id;
    });

    it('deve falhar ao criar produto com vendedor inexistente', async () => {
      const data = {
        name: 'Produto Inválido',
        category: 'Teste',
        variety: 'Variedade',
        stock: 10,
        description: 'Desc',
        images_Path: ['imagem.jpg'],
        harvestAt: new Date(Date.now() + 86400000),
        productRating: 0,
        amountSold: 0,
        isNegotiable: false,
        ratingAmount: 0,
        ratingStarAmount: [],
        status: true,
        sellerId: 99999,
        sellingUnitsProduct: [{ unitId, minPrice: 10 }],
      };

      await expect(service.create(data)).rejects.toThrow('Vendedor com ID 99999 não encontrado');
    });
  });

  describe('getAll', () => {
    it('deve listar todos os produtos', async () => {
      const products = await service.getAll();
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
    });

    it('deve filtrar por nome', async () => {
      const products = await service.getAll('Tomate');
      expect(products.length).toBeGreaterThan(0);
      expect(products[0].name).toContain('Tomate');
    });
  });

  describe('getById', () => {
    it('deve retornar produto pelo ID', async () => {
      const product = await service.getById(productId);
      expect(product).not.toBeNull();
      expect(product?.id).toBe(productId);
    });
  });

  describe('update', () => {
    it('deve atualizar o produto', async () => {
      const updated = await service.update(productId, {
        name: 'Tomate Atualizado',
        stock: 100,
        variety: 'Italiano', // Campo obrigatório
      });
      expect(updated.name).toBe('Tomate Atualizado');
      expect(updated.stock).toBe(100);
    });
  });

  describe('getSellingUnits', () => {
    it('deve retornar unidades de venda', async () => {
      const units = await service.getSellingUnits();
      expect(units.length).toBeGreaterThan(0);
      expect(units[0]).toHaveProperty('title');
    });
  });

  describe('delete', () => {
    it('deve deletar produto existente', async () => {
      const result = await service.delete(productId);
      expect(result).toHaveProperty('id', productId);
    });

    it('deve falhar ao deletar produto inexistente', async () => {
      await expect(service.delete(99999)).rejects.toThrow('Produto com ID 99999 não encontrado');
    });
  });
});
