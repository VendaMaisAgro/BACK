import { Request, Response, NextFunction } from 'express';

const mockFindFirst = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    address: { findFirst: mockFindFirst },
  })),
}));

// Importação após o mock para garantir que o PrismaClient já está interceptado
import { requireAddress } from '../requireAddress.middleware';

const makeReq = (userId?: string) =>
  ({ user: userId ? { userId } : undefined } as unknown as Request);

const makeRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('requireAddress middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('deve chamar next() quando o usuário possui endereço cadastrado', async () => {
    mockFindFirst.mockResolvedValue({ id: 'addr-1', userId: 'user-1' });

    await requireAddress(makeReq('user-1'), makeRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('deve retornar 422 com code USER_ADDRESS_REQUIRED quando o usuário não tem endereço', async () => {
    mockFindFirst.mockResolvedValue(null);

    const res = makeRes();
    await requireAddress(makeReq('user-1'), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      code: 'USER_ADDRESS_REQUIRED',
      message: 'Cadastre um endereço antes de prosseguir com a compra.',
    });
  });

  it('deve retornar 401 quando não há usuário autenticado no token', async () => {
    const res = makeRes();
    await requireAddress(makeReq(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('deve consultar o banco usando o userId do token', async () => {
    mockFindFirst.mockResolvedValue({ id: 'addr-1', userId: 'user-42' });

    await requireAddress(makeReq('user-42'), makeRes(), next);

    expect(mockFindFirst).toHaveBeenCalledWith({ where: { userId: 'user-42' } });
  });
});
