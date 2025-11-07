import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSalesData() {
  try {
    console.log('=== INSERINDO DADOS BÁSICOS PARA VENDAS ===\n');

    // Inserir métodos de pagamento
    console.log('Verificando métodos de pagamento...');
    const existingPaymentMethods = await prisma.paymentMethod.findMany();
    
    if (existingPaymentMethods.length === 0) {
      console.log('Inserindo métodos de pagamento básicos...');
      const paymentMethods = [
        { method: 'PIX' },
      ];

      const createdPaymentMethods = await prisma.paymentMethod.createMany({
        data: paymentMethods,
        skipDuplicates: true,
      });
      console.log('Métodos de pagamento criados:', createdPaymentMethods);
    } else {
      console.log('Métodos de pagamento já existem');
    }

    // Inserir tipos de transporte
    console.log('\nVerificando tipos de transporte...');
    const existingTransportTypes = await prisma.transportTypes.findMany();
    
    if (existingTransportTypes.length === 0) {
      console.log('Inserindo tipos de transporte básicos...');
      const transportTypes = [
        { type: 'Retirada no Local' },
      ];

      const createdTransportTypes = await prisma.transportTypes.createMany({
        data: transportTypes,
        skipDuplicates: true,
      });
      console.log('Tipos de transporte criados:', createdTransportTypes);
    } else {
      console.log('Tipos de transporte já existem');
    }

    // Listar dados disponíveis
    console.log('\n=== DADOS DISPONÍVEIS ===');
    
    const paymentMethods = await prisma.paymentMethod.findMany();
    console.log('\nMétodos de pagamento:');
    paymentMethods.forEach(pm => {
      console.log(`  ID: ${pm.id}, Método: ${pm.method}`);
    });

    const transportTypes = await prisma.transportTypes.findMany();
    console.log('\nTipos de transporte:');
    transportTypes.forEach(tt => {
      console.log(`  ID: ${tt.id}, Tipo: ${tt.type}`);
    });

  } catch (error) {
    console.error('Erro ao semear dados de vendas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSalesData(); 