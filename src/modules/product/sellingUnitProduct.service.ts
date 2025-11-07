import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

export interface CreateSellingUnitProductDto {
  unitId: string;
  minPrice: number;
  productId: string;
}

export interface UpdateSellingUnitProductDto {
  unitId?: string;
  minPrice?: number;
}

export class SellingUnitProductService {

  async create(data: CreateSellingUnitProductDto) {
    try {
      // Validar se o produto existe
      const product = await prisma.product.findUnique({
        where: { id: data.productId },
      });

      if (!product) {
        throw new Error(`Produto com ID ${data.productId} não encontrado`);
      }

      // Validar se a unidade existe
      const unit = await prisma.sellingUnit.findUnique({
        where: { id: data.unitId },
      });

      if (!unit) {
        throw new Error(`Unidade de venda com ID ${data.unitId} não encontrada`);
      }

      // Verificar se já existe essa combinação produto-unidade
      const existing = await prisma.sellingUnitProduct.findFirst({
        where: {
          productId: data.productId,
          unitId: data.unitId,
        },
      });

      if (existing) {
        throw new Error(`Já existe uma unidade de venda com ID ${data.unitId} para o produto ${data.productId}`);
      }

      return await prisma.sellingUnitProduct.create({
        data: {
          unitId: data.unitId,
          minPrice: data.minPrice,
          productId: data.productId,
        },
        include: {
          unit: true,
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } catch (error) {
      console.error('Erro ao criar unidade de venda do produto:', error);
      throw error;
    }
  }

  async getAll() {
    return prisma.sellingUnitProduct.findMany({
      include: {
        unit: true,
        product: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
      orderBy: [
        { product: { name: 'asc' } },
        { unit: { title: 'asc' } },
      ],
    });
  }

  async getByProductId(productId: string) {
    // Validar se o produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error(`Produto com ID ${productId} não encontrado`);
    }

    return prisma.sellingUnitProduct.findMany({
      where: { productId },
      include: {
        unit: true,
        product: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
      orderBy: {
        unit: { title: 'asc' },
      },
    });
  }

  async getById(id: string) {
    return prisma.sellingUnitProduct.findUnique({
      where: { id },
      include: {
        unit: true,
        product: {
          select: {
            id: true,
            name: true,
            category: true,
            seller: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateSellingUnitProductDto) {
    try {
      // Verificar se o registro existe
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error(`Unidade de venda do produto com ID ${id} não encontrada`);
      }

      // Se está alterando a unidade, validar se existe
      if (data.unitId && data.unitId !== existing.unitId) {
        const unit = await prisma.sellingUnit.findUnique({
          where: { id: data.unitId },
        });

        if (!unit) {
          throw new Error(`Unidade de venda com ID ${data.unitId} não encontrada`);
        }

        // Verificar se já existe essa combinação produto-unidade
        const duplicate = await prisma.sellingUnitProduct.findFirst({
          where: {
            productId: existing.productId,
            unitId: data.unitId,
            id: { not: id }, // Excluir o próprio registro da verificação
          },
        });

        if (duplicate) {
          throw new Error(`Já existe uma unidade de venda com ID ${data.unitId} para este produto`);
        }
      }

      return await prisma.sellingUnitProduct.update({
        where: { id },
        data: {
          ...(data.unitId && { unitId: data.unitId }),
          ...(data.minPrice !== undefined && { minPrice: data.minPrice }),
        },
        include: {
          unit: true,
          product: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
      });
    } catch (error) {
      console.error('Erro ao atualizar unidade de venda do produto:', error);
      throw error;
    }
  }

  async delete(id: string) {
    try {
      // Verificar se o registro existe
      const existing = await prisma.sellingUnitProduct.findUnique({
        where: { id },
        include: {
          boughtProducts: true,
          CartItem: true,
        },
      });

      if (!existing) {
        throw new Error(`Unidade de venda do produto com ID ${id} não encontrada`);
      }

      // Verificar se tem produtos comprados ou itens no carrinho relacionados
      if (existing.boughtProducts.length > 0) {
        throw new Error('Não é possível deletar esta unidade de venda pois existem produtos comprados relacionados');
      }

      if (existing.CartItem.length > 0) {
        throw new Error('Não é possível deletar esta unidade de venda pois existem itens no carrinho relacionados');
      }

      return await prisma.sellingUnitProduct.delete({
        where: { id },
      });
    } catch (error) {
      console.error('Erro ao deletar unidade de venda do produto:', error);
      throw error;
    }
  }

  async deleteByProductId(productId: string) {
    try {
      // Verificar se o produto existe
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error(`Produto com ID ${productId} não encontrado`);
      }

      // Buscar todas as unidades de venda do produto
      const sellingUnits = await prisma.sellingUnitProduct.findMany({
        where: { productId },
        include: {
          boughtProducts: true,
          CartItem: true,
        },
      });

      // Verificar se alguma tem relacionamentos que impedem a exclusão
      for (const unit of sellingUnits) {
        if (unit.boughtProducts.length > 0 || unit.CartItem.length > 0) {
          throw new Error(`Não é possível deletar as unidades de venda pois existem registros relacionados`);
        }
      }

      // Deletar todas as unidades de venda do produto
      return await prisma.sellingUnitProduct.deleteMany({
        where: { productId },
      });
    } catch (error) {
      console.error('Erro ao deletar unidades de venda do produto:', error);
      throw error;
    }
  }
}