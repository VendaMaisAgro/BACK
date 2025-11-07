import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSellingUnits() {
  try {
    console.log('Verificando unidades de venda existentes...');
    
    const existingUnits = await prisma.sellingUnit.findMany();
    console.log('Unidades existentes:', existingUnits);

    if (existingUnits.length === 0) {
      console.log('Inserindo unidades básicas de venda...');
      
      const units = [
        { unit: 'kg', title: 'Quilograma' },
        { unit: 'un', title: 'Unidade' },
        { unit: 'cx', title: 'Caixa' },
        { unit: 'sc', title: 'Saco' },
        { unit: 'pct', title: 'Pacote' },
        { unit: 'dz', title: 'Dúzia' },
        { unit: 'ton', title: 'Tonelada' },
      ];

      const createdUnits = await prisma.sellingUnit.createMany({
        data: units,
        skipDuplicates: true,
      });

      console.log('Unidades criadas:', createdUnits);
    } else {
      console.log('Unidades já existem no banco de dados');
    }

    // Listar todas as unidades para verificação
    const allUnits = await prisma.sellingUnit.findMany();
    console.log('Todas as unidades disponíveis:');
    allUnits.forEach(unit => {
      console.log(`ID: ${unit.id}, Unit: ${unit.unit}, Title: ${unit.title}`);
    });

  } catch (error) {
    console.error('Erro ao semear unidades de venda:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSellingUnits(); 