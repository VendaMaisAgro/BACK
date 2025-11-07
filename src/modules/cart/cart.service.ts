import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class CartService {
  async getUserCart(userId: string) {
    return prisma.cart.findFirst({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                images_Path: true,
                seller: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            sellingUnitProduct: {
              include: {
                unit: true,
              },
            },
          },
        },
      },
    });
  }

  async addToCart(
    userId: string,
    productId: string,
    sellingUnitProductId: string,
    amount: number,
    value: number
  ) {
    let cart = await prisma.cart.findFirst({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        sellingUnitProductId,
      },
    });

    const includeRelations = {
      product: {
        select: {
          id: true,
          name: true,
          description: true,
          seller: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      sellingUnitProduct: {
        include: {
          unit: true,
        },
      },
    };

    if (existingItem) {
      return prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          amount: existingItem.amount + amount,
          value,
        },
        include: includeRelations,
      });
    }

    const productExists = await prisma.product.findUnique({
      where: { id: productId },
      select: { stock: true },
    });

    if (!productExists) {
      throw new Error("Produto não encontrado.");
    }

    const sellingUnitProductExists = await prisma.sellingUnitProduct.findUnique({
      where: { id: sellingUnitProductId },
      select: { productId: true },
    });

    if (!sellingUnitProductExists) {
      throw new Error("Unidade de venda não encontrada.");
    }

    if (sellingUnitProductExists.productId !== productId) {
      throw new Error("Essa unidade de venda não pertence ao produto informado.");
    }

    if (amount > productExists.stock) {
      throw new Error("Quantidade insuficiente no estoque.");
    }

    return prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        sellingUnitProductId,
        amount,
        value,
      },
      include: includeRelations,
    });
  }



  async updateItem(cartItemId: string, amount: number, value: number) {

    const item = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        product: true,
      },
    });

    if (!item) {
      throw new Error(`Item com ID ${cartItemId} não encontrado.`);
    }


    const productStock = item.product?.stock;
    if (productStock === undefined) {
      throw new Error("Produto não encontrado ou sem estoque definido.");
    }


    if (amount > productStock) {
      throw new Error("A quantidade deve ser menor ou igual ao estoque disponível.");
    }


    return prisma.cartItem.update({
      where: { id: cartItemId },
      data: { amount, value },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        sellingUnitProduct: {
          include: {
            unit: true,
          },
        },
      },
    });
  }


  async removeItem(cartItemId: string) {

    const item = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!item) {
      throw new Error(`Item com ID ${cartItemId} não encontrado.`);
    }

    const cartId = item.cartId;


    await prisma.cartItem.delete({
      where: { id: cartItemId },
    });


    return prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        user: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                seller: { select: { id: true, name: true } },
              },
            },
            sellingUnitProduct: {
              include: { unit: true },
            },
          },
        },
      },
    });
  }


  async clearCart(userId: string) {
    const cart = await prisma.cart.findFirst({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  }
}