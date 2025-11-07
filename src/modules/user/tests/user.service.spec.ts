import { UserService } from '../user.service';
// import { prismaMock } from './../../../lib/prismaMock'; // Removed to avoid conflict with local declaration

// Mock do Prisma
jest.mock('@prisma/client');
jest.mock('brazilian-values', () => ({
  isCPF: jest.fn(() => true),
  isCNPJ: jest.fn(() => true),
  formatToCPF: jest.fn((v) => v),
  formatToCNPJ: jest.fn((v) => v)
}));

const prismaMock = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
} as any;

describe('UserService', () => {
  const service = new UserService(prismaMock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve criar um usuário com CPF válido', async () => {
    const dto = {
      name: 'João',
      phone_number: '11999999999',
      email: 'joao@example.com',
      password: 'Strong@123',
      role: 'buyer',
      cpf: '35464453415',
      securityQuestions: {
        answer_1: 'resposta1',
        answer_2: 'resposta2',
        answer_3: 'resposta3'
      }
    };

    prismaMock.user.create = jest.fn().mockResolvedValue({ id: 3, ...dto } as any);
    prismaMock.user.findUnique = jest.fn().mockResolvedValue(null);

    const result = await service.create(dto);

    expect(result).toHaveProperty('id');
    expect(prismaMock.user.create).toHaveBeenCalled();
  });

  it('deve lançar erro se nenhum CPF ou CNPJ for informado', async () => {
    const dto = {
      name: 'João',
      phone_number: '11999999999',
      email: 'joao@example.com',
      password: 'Strong@123',
      role: 'buyer',
    };

    await expect(service.create(dto)).rejects.toThrow('CPF ou CNPJ é obrigatório.');
  });

  it('deve lançar erro se a senha for fraca', async () => {
    const dto = {
      name: 'João',
      phone_number: '11999999999',
      email: 'joao@example.com',
      password: 'fraca',
      role: 'buyer',
      cpf: '35464453415',
    };

    await expect(service.create(dto)).rejects.toThrow('A senha deve conter pelo menos 8 caracteres');
  });

  it('deve lançar erro se CPF já existir', async () => {
    const dto = {
      name: 'João',
      phone_number: '11999999999',
      email: 'joao@example.com',
      password: 'Strong@123',
      role: 'buyer',
      cpf: '12345678909',
    };

    prismaMock.user.findUnique = jest.fn().mockResolvedValue({ id: 2 });

    await expect(service.create(dto)).rejects.toThrow('CPF já cadastrado.');
  });

  it('deve retornar todos os usuários', async () => {
    const users = [
      { id: 1, name: 'João' },
      { id: 2, name: 'Maria' }
    ];

    prismaMock.user.findMany = jest.fn().mockResolvedValue(users);

    const result = await service.getAll();

    expect(result).toEqual(users);
    expect(prismaMock.user.findMany).toHaveBeenCalled();
  });

  it('deve retornar um usuário existente pelo ID', async () => {
    const user = {
      id: 1,
      name: 'João',
      email: 'joao@example.com',
      role: 'buyer',
      cpf: '35464453415',
    };

    prismaMock.user.findUnique = jest.fn().mockResolvedValue(user);

    const result = await service.getById(1);

    expect(result).toEqual(user);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('deve lançar erro se o usuário não for encontrado pelo ID', async () => {
    prismaMock.user.findUnique = jest.fn().mockResolvedValue(null);

    await expect(service.getById(999)).rejects.toThrow('Usuário não encontrado.');
  });

  it('deve atualizar os dados de um usuário existente', async () => {
    const existingUser = {
      id: 1,
      name: 'João',
      email: 'joao@example.com',
      role: 'buyer',
      cpf: '35464453415',
    };

    const updatedDto = {
      name: 'João Atualizado',
      email: 'novoemail@example.com',
    };

    prismaMock.user.findUnique = jest.fn().mockResolvedValue(existingUser);
    prismaMock.user.update = jest.fn().mockResolvedValue({ ...existingUser, ...updatedDto });

    const result = await service.update(1, updatedDto);

    expect(result.name).toBe('João Atualizado');
    expect(result.email).toBe('novoemail@example.com');
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: updatedDto,
    });
  });

  it('deve lançar erro ao tentar atualizar usuário inexistente', async () => {
    prismaMock.user.findUnique = jest.fn().mockResolvedValue(null);

    await expect(service.update(999, { name: 'Novo Nome' })).rejects.toThrow('Usuário não encontrado.');
  });

  it('deve deletar um usuário existente', async () => {
    const user = { id: 1, name: 'João', email: 'joao@example.com' };

    prismaMock.user.findUnique = jest.fn().mockResolvedValue(user);
    prismaMock.user.delete = jest.fn().mockResolvedValue(user);

    const result = await service.delete(1);

    expect(result).toEqual(user);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('deve lançar erro ao tentar deletar usuário inexistente', async () => {
    prismaMock.user.findUnique = jest.fn().mockResolvedValue(null);

    await expect(service.delete(999)).rejects.toThrow('Usuário não encontrado.');
  });

});
