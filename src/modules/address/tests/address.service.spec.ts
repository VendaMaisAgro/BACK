import { AddressService } from '../address.service';
import { prismaMock } from '../../../lib/prismaMock';

describe('AddressService', () => {
  let service: AddressService;

  beforeEach(() => {
    service = new AddressService();
    jest.clearAllMocks();
  });

  const mockAddress = {
    id: 'addr-uuid-1',
    userId: 'user-uuid-1',
    addressee: 'João da Silva',
    phone_number_addressee: '11999999999',
    alias: 'Casa',
    street: 'Rua A',
    number: '123',
    complement: 'Apto 12',
    referencePoint: 'Perto da padaria',
    cep: '12345678',
    uf: 'SP',
    city: 'São Paulo',
    default: false,
  };

  const mockUser = {
    id: 'user-uuid-1',
    name: 'João',
    phone_number: '11999999999',
    email: 'joao@example.com',
    password: 'Strong@123',
    cnpj: null as string | null,
    cpf: '35464453415' as string | null,
    ccir: null as string | null,
    role: 'buyer',
    img: null as string | null, // <- faltava esse campo
    valid: true,
  };

  describe('addAddress', () => {
    it('deve criar um endereço para usuário existente', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      // primeiro endereço do usuário vira default = true
      prismaMock.address.count.mockResolvedValue(0);
      prismaMock.address.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.address.create.mockResolvedValue({ ...mockAddress, default: true });

      const result = await service.addAddress('user-uuid-1', {
        addressee: 'João da Silva',
        phone_number_addressee: '11999999999',
        alias: 'Casa',
        street: 'Rua A',
        number: '123',
        complement: 'Apto 12',
        referencePoint: 'Perto da padaria',
        cep: '12345678',
        uf: 'SP',
        city: 'São Paulo',
      });

      expect(result.default).toBe(true);
      expect(result.addressee).toBe('João da Silva');
    });

    it('deve lançar erro se o usuário não existir', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addAddress('user-not-found', {
          addressee: 'Teste',
          phone_number_addressee: '11999999999',
          alias: 'Casa',
          street: 'Rua A',
          number: '123',
          cep: '12345678',
          uf: 'SP',
          city: 'São Paulo',
        })
      ).rejects.toThrow('Usuário não encontrado.');
    });
  });

  describe('updateAddress', () => {
    it('deve atualizar endereço existente', async () => {
      prismaMock.address.findUnique.mockResolvedValue(mockAddress);
      prismaMock.address.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.address.update.mockResolvedValue({ ...mockAddress, city: 'Campinas' });

      const result = await service.updateAddress('addr-uuid-1', { city: 'Campinas' });
      expect(result.city).toBe('Campinas');
    });

    it('deve lançar erro se o endereço não existir', async () => {
      prismaMock.address.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAddress('addr-not-found', { city: 'Campinas' })
      ).rejects.toThrow('Endereço não encontrado.');
    });
  });

  describe('deleteAddress', () => {
    it('deve deletar endereço existente', async () => {
      prismaMock.address.findUnique.mockResolvedValue({ ...mockAddress, default: false });
      prismaMock.address.delete.mockResolvedValue(mockAddress);

      const result = await service.deleteAddress('addr-uuid-1');
      expect(result).toEqual(mockAddress);
    });

    it('não deve permitir deletar endereço padrão', async () => {
      prismaMock.address.findUnique.mockResolvedValue({ ...mockAddress, default: true });

      await expect(service.deleteAddress('addr-uuid-1'))
        .rejects.toThrow('Não é possível deletar o endereço padrão. Por favor, defina outro endereço como padrão antes de excluir.');
    });

    it('deve lançar erro se o endereço não existir', async () => {
      prismaMock.address.findUnique.mockResolvedValue(null);

      await expect(service.deleteAddress('addr-not-found'))
        .rejects.toThrow('Endereço não encontrado.');
    });
  });

  describe('listUserAddresses', () => {
    it('deve listar todos os endereços de um usuário', async () => {
      prismaMock.address.findMany.mockResolvedValue([mockAddress]);

      const result = await service.listUserAddresses('user-uuid-1');
      expect(result).toEqual([mockAddress]);
    });

    it('deve retornar lista vazia se o usuário não tiver endereços', async () => {
      prismaMock.address.findMany.mockResolvedValue([]);

      const result = await service.listUserAddresses('user-uuid-1');
      expect(result).toEqual([]);
    });
  });

  describe('getDefaultAddress', () => {
    it('deve retornar o endereço padrão do usuário', async () => {
      prismaMock.address.findFirst.mockResolvedValue({ ...mockAddress, default: true });

      const result = await service.getDefaultAddress('user-uuid-1');
      expect(result?.default).toBe(true);
    });
  });

  describe('setDefaultAddress', () => {
    it('deve definir um endereço como padrão', async () => {
      prismaMock.address.findUnique.mockResolvedValue({ ...mockAddress, userId: 'user-uuid-1' });
      prismaMock.address.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.address.update.mockResolvedValue({ ...mockAddress, default: true });

      const result = await service.setDefaultAddress('user-uuid-1', 'addr-uuid-1');
      expect(result.default).toBe(true);
    });

    it('deve falhar se endereço não pertencer ao usuário', async () => {
      prismaMock.address.findUnique.mockResolvedValue({ ...mockAddress, userId: 'other-user' });

      await expect(service.setDefaultAddress('user-uuid-1', 'addr-uuid-1'))
        .rejects.toThrow('Endereço não encontrado para este usuário.');
    });
  });
});
