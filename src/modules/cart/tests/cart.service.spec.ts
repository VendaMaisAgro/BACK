import { PrismaClient } from '@prisma/client';
import { CartService } from '../cart.service';

const prisma = new PrismaClient();
const service = new CartService();

describe('CartService', () => {
  let userId: number;
  let productId: number;
  let sellingUnitId: number;
  let sellingUnitProductId: number;
  let cartItemId: number;

  beforeAll(async () => {
    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name: 'Usuário Carrinho',
        email: `cart${Date.now()}@teste.com`,
        password: 'SenhaForte@123',
        cpf: `${Math.floor(Math.random() * 1e11)}`, // CPF fake
        phone_number: '11999999999',
        role: 'BUYER',
      },
    });
    userId = user.id;

    // Criar unidade de venda
    const unit = await prisma.sellingUnit.create({
      data: { unit: 'cx', title: 'Unidade Teste' },
    });
    sellingUnitId = unit.id;

    // Criar produto
    const product = await prisma.product.create({
      data: {
        name: 'Produto Carrinho',
        category: 'Categoria Teste',
        variety: 'Variedade',
        stock: 100,
        description: 'Produto para testes de carrinho',
        images_Path: ['img.jpg'],
        harvestAt: new Date(Date.now() + 86400000),
        productRating: 0,
        amountSold: 0,
        isNegotiable: false,
        ratingAmount: 0,
        ratingStarAmount: [],
        status: true,
        sellerId: userId,
        createdAt: new Date(),
      },
    });
    productId = product.id;

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
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.sellingUnitProduct.deleteMany();
    await prisma.product.deleteMany();
    await prisma.sellingUnit.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('addToCart', () => {
    it('deve adicionar item ao carrinho (novo item)', async () => {
      const item = await service.addToCart(userId, productId, sellingUnitProductId, 2, 20);
      expect(item).toHaveProperty('id');
      expect(item.amount).toBe(2);
      cartItemId = item.id;
    });

    it('deve aumentar a quantidade de um item já existente no carrinho', async () => {
      const updatedItem = await service.addToCart(userId, productId, sellingUnitProductId, 3, 30);
      expect(updatedItem.amount).toBe(5); // 2 + 3
      expect(updatedItem.value).toBe(30);
    });
  });

  describe('getUserCart', () => {
    it('deve retornar o carrinho do usuário com os itens', async () => {
      const cart = await service.getUserCart(userId);
      expect(cart).not.toBeNull();
      expect(cart?.items.length).toBeGreaterThan(0);
      expect(cart?.items[0]).toHaveProperty('product');
    });
  });

  describe('removeItem', () => {
    it('deve remover item específico do carrinho', async () => {
      const removed = await service.removeItem(cartItemId);
      expect(removed.id).toBe(cartItemId);

      const cart = await service.getUserCart(userId);
      expect(cart?.items.length).toBe(0);
    });
  });

  describe('clearCart', () => {
    it('deve limpar todos os itens do carrinho', async () => {
      // Adicionar dois itens antes de limpar
      await service.addToCart(userId, productId, sellingUnitProductId, 1, 10);
      await service.addToCart(userId, productId, sellingUnitProductId, 2, 20);

      await service.clearCart(userId);

      const cart = await service.getUserCart(userId);
      expect(cart?.items.length).toBe(0);
    });
  });
});
