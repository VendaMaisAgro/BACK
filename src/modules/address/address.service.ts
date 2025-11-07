import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export class AddressService {

  async addAddress(userId: string, data: any) {
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) throw new Error("Usuário não encontrado.");

    const addressCount = await prisma.address.count({ where: { userId } });
    if (addressCount === 0) data.default = true;

    if (data.default) {
      await prisma.address.updateMany({ where: { userId }, data: { default: false } });
    }

    return prisma.address.create({
      data: {
        userId,
        addressee: data.addressee,
        phone_number_addressee: data.phone_number_addressee,
        alias: data.alias,
        street: data.street,
        number: data.number,
        complement: data.complement,
        referencePoint: data.referencePoint,
        cep: data.cep,
        uf: data.uf,
        city: data.city,
        default: !!data.default,
      },
    });
  }

  async updateAddress(addressId: string, data: any) {
    // garantir que o endereço existe SEMPRE
    const existing = await prisma.address.findUnique({ where: { id: addressId } });
    if (!existing) throw new Error("Endereço não encontrado.");

    if (data.default) {
      await prisma.address.updateMany({
        where: { userId: existing.userId },
        data: { default: false },
      });
    }

    return prisma.address.update({ where: { id: addressId }, data });
  }

  async deleteAddress(addressId: string) {
    const address = await prisma.address.findUnique({ where: { id: addressId } });
    if (!address) throw new Error("Endereço não encontrado.");
    if (address.default) {
      throw new Error("Não é possível deletar o endereço padrão. Por favor, defina outro endereço como padrão antes de excluir.");
    }
    return prisma.address.delete({ where: { id: addressId } });
  }

  async listUserAddresses(userId: string) {
    return prisma.address.findMany({ where: { userId }, orderBy: { id: "asc" } });
  }

  async getDefaultAddress(userId: string) {
    return prisma.address.findFirst({ where: { userId, default: true } });
  }

  async setDefaultAddress(userId: string, addressId: string) {
    const address = await prisma.address.findUnique({ where: { id: addressId } });
    if (!address || address.userId !== userId) {
      throw new Error("Endereço não encontrado para este usuário.");
    }
    await prisma.address.updateMany({ where: { userId }, data: { default: false } });
    return prisma.address.update({ where: { id: addressId }, data: { default: true } });
  }
}
