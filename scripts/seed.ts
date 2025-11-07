import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Criar usuários
  const buyer = await prisma.user.create({
    data: {
      name: 'Comprador Teste',
      email: 'buyer@test.com',
      password: '123456',
      phone_number: '999999999',
      role: 'buyer',
    },
  });

  const seller = await prisma.user.create({
    data: {
      name: 'Vendedor Teste',
      email: 'seller@test.com',
      password: '123456',
      phone_number: '888888888',
      role: 'seller',
    },
  });

  // Criar tipos de transporte
  const transportType = await prisma.transportTypes.create({
    data: {
      type: 'Normal',
      valueFreight: 20.5,
    },
  });

  // Criar métodos de pagamento
  const paymentMethod = await prisma.paymentMethod.create({
    data: {
      method: 'Pix',
    },
  });

  console.log('Seed finalizado!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
