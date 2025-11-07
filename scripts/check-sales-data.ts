import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSalesData() {
  try {
    console.log('=== DADOS DISPONÍVEIS PARA CRIAÇÃO DE VENDA ===\n');

    // Verificar usuários (buyers e sellers)
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      take: 5
    });
    console.log('Usuários disponíveis:');
    users.forEach(user => {
      console.log(`  ID: ${user.id}, Nome: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
    });

    // Verificar endereços
    const addresses = await prisma.address.findMany({
      select: { id: true, addressee: true, city: true, uf: true },
      take: 3
    });
    console.log('\nEndereços disponíveis:');
    addresses.forEach(addr => {
      console.log(`  ID: ${addr.id}, Destinatário: ${addr.addressee}, Cidade: ${addr.city}-${addr.uf}`);
    });

    // Verificar métodos de pagamento
    const paymentMethods = await prisma.paymentMethod.findMany();
    console.log('\nMétodos de pagamento disponíveis:');
    paymentMethods.forEach(pm => {
      console.log(`  ID: ${pm.id}, Método: ${pm.method}`);
    });

    // Verificar tipos de transporte
    const transportTypes = await prisma.transportTypes.findMany();
    console.log('\nTipos de transporte disponíveis:');
    transportTypes.forEach(tt => {
      console.log(`  ID: ${tt.id}, Tipo: ${tt.type}`);
    });

    // Verificar produtos
    const products = await prisma.product.findMany({
      select: { id: true, name: true, sellingUnitsProduct: true },
      take: 3
    });
    console.log('\nProdutos disponíveis:');
    products.forEach(product => {
      console.log(`  ID: ${product.id}, Nome: ${product.name}, Preço: R$ ${product.sellingUnitsProduct}`);
    });

    // Verificar unidades de venda dos produtos
    const sellingUnits = await prisma.sellingUnitProduct.findMany({
      include: {
        product: { select: { id: true, name: true } },
        unit: { select: { id: true, unit: true, title: true } }
      },
      take: 5
    });
    console.log('\nUnidades de venda disponíveis:');
    sellingUnits.forEach(su => {
      console.log(`  ID: ${su.id}, Produto: ${su.product.name}, Unidade: ${su.unit.title} (${su.unit.unit}), Preço mínimo: R$ ${su.minPrice}`);
    });

  } catch (error) {
    console.error('Erro ao verificar dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSalesData(); 