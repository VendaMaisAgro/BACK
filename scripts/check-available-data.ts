import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAvailableData() {
  try {
    console.log('=== DADOS DISPONÍVEIS NO BANCO ===\n');

    // Verificar usuários
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      take: 5
    });
    console.log('Usuários:');
    users.forEach(user => {
      console.log(`  ID: ${user.id}, Nome: ${user.name}, Role: ${user.role}`);
    });

    // Verificar endereços
    const addresses = await prisma.address.findMany({
      select: { id: true, addressee: true, city: true, uf: true },
      take: 3
    });
    console.log('\nEndereços:');
    addresses.forEach(addr => {
      console.log(`  ID: ${addr.id}, Destinatário: ${addr.addressee}, Cidade: ${addr.city}-${addr.uf}`);
    });

    // Verificar produtos
    const products = await prisma.product.findMany({
      select: { id: true, name: true, sellingUnitsProduct: true },
      take: 5
    });
    console.log('\nProdutos:');
    products.forEach(product => {
      console.log(`  ID: ${product.id}, Nome: ${product.name}, Preço: R$ ${product.sellingUnitsProduct}`);
    });

    // Verificar unidades de venda dos produtos
    const sellingUnits = await prisma.sellingUnitProduct.findMany({
      include: {
        product: { select: { id: true, name: true } },
        unit: { select: { id: true, unit: true, title: true } }
      },
      take: 10
    });
    console.log('\nUnidades de venda dos produtos:');
    sellingUnits.forEach(su => {
      console.log(`  ID: ${su.id}, Produto: ${su.product.name}, Unidade: ${su.unit.title} (${su.unit.unit}), Preço mínimo: R$ ${su.minPrice}`);
    });

    // Verificar métodos de pagamento
    const paymentMethods = await prisma.paymentMethod.findMany();
    console.log('\nMétodos de pagamento:');
    paymentMethods.forEach(pm => {
      console.log(`  ID: ${pm.id}, Método: ${pm.method}`);
    });

    // Verificar tipos de transporte
    const transportTypes = await prisma.transportTypes.findMany();
    console.log('\nTipos de transporte:');
    transportTypes.forEach(tt => {
      console.log(`  ID: ${tt.id}, Tipo: ${tt.type}`);
    });

  } catch (error) {
    console.error('Erro ao verificar dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAvailableData(); 