/**
 * Seed de demonstração — Termo Dinâmico
 * 
 * Cria: 2 usuários (comprador + vendedor), unidades de venda,
 * 1 produto, métodos de pagamento, transporte, 1 venda completa
 * e um template de contrato COM PLACEHOLDERS dinâmicos.
 *
 * Uso:  npx ts-node scripts/seed-demo-contract.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

if (process.env.NODE_ENV === 'production') {
  console.error('❌ Seed de demo não pode ser executado em produção.');
  process.exit(1);
}

const prisma = new PrismaClient();

function sha256(input: string) {
    return crypto.createHash('sha256').update(input).digest('hex');
}

async function main() {
    console.log('🌱  Seed de demonstração — Termo Dinâmico\n');

    // ── 1. Usuários ──────────────────────────────────────────
    const hashedPassword = await bcrypt.hash('123456', 10);

    const buyer = await prisma.user.upsert({
        where: { email: 'comprador@demo.com' },
        update: {},
        create: {
            name: 'João Silva',
            email: 'comprador@demo.com',
            password: hashedPassword,
            phone_number: '(11) 99999-0001',
            cpf: '123.456.789-00',
            role: 'buyer',
        },
    });
    console.log('✅ Comprador criado:', buyer.id);

    const seller = await prisma.user.upsert({
        where: { email: 'vendedor@demo.com' },
        update: {},
        create: {
            name: 'Maria Souza',
            email: 'vendedor@demo.com',
            password: hashedPassword,
            phone_number: '(11) 99999-0002',
            cpf: '987.654.321-00',
            role: 'seller',
        },
    });
    console.log('✅ Vendedor criado:', seller.id);

    // ── 2. Unidade de venda ──────────────────────────────────
    let unitKg = await prisma.sellingUnit.findFirst({ where: { unit: 'kg' } });
    if (!unitKg) {
        unitKg = await prisma.sellingUnit.create({ data: { unit: 'kg', title: 'Quilograma' } });
    }
    console.log('✅ Unidade kg:', unitKg.id);

    // ── 3. Produto ───────────────────────────────────────────
    const product = await prisma.product.create({
        data: {
            sellerId: seller.id,
            name: 'Café Arábica Especial',
            category: 'Grãos',
            variety: 'Arábica',
            stock: 500,
            description: 'Café arábica de alta qualidade, colheita 2026.',
            images_Path: [],
            harvestAt: new Date('2026-01-15'),
            productRating: 4.8,
            amountSold: 0,
            isNegotiable: true,
            ratingAmount: 0,
            ratingStarAmount: [0, 0, 0, 0, 0],
            createdAt: new Date(),
        },
    });
    console.log('✅ Produto criado:', product.id);

    // ── 4. SellingUnitProduct ────────────────────────────────
    const sup = await prisma.sellingUnitProduct.create({
        data: {
            unitId: unitKg.id,
            productId: product.id,
            minPrice: 45.0,
        },
    });
    console.log('✅ SellingUnitProduct:', sup.id);

    // ── 5. Método de pagamento ───────────────────────────────
    let pix = await prisma.paymentMethod.findFirst({ where: { method: 'PIX' } });
    if (!pix) {
        pix = await prisma.paymentMethod.create({ data: { method: 'PIX' } });
    }
    console.log('✅ PaymentMethod PIX:', pix.id);

    // ── 6. Tipo de transporte ────────────────────────────────
    let transport = await prisma.transportTypes.findFirst({ where: { type: 'Retirada no Local' } });
    if (!transport) {
        transport = await prisma.transportTypes.create({ data: { type: 'Retirada no Local', valueFreight: 0 } });
    }
    console.log('✅ TransportType:', transport.id);

    // ── 7. Venda (SaleData) ──────────────────────────────────
    const sale = await prisma.saleData.create({
        data: {
            buyerId: buyer.id,
            transportTypeId: transport.id,
            paymentMethodId: pix.id,
            transportValue: 0,
            status: 'Pedido realizado!',
        },
    });
    console.log('✅ Venda criada:', sale.id);

    // ── 8. Produto comprado (BoughtProduct) ──────────────────
    await prisma.boughtProduct.create({
        data: {
            productId: product.id,
            sellingUnitProductId: sup.id,
            saleDataId: sale.id,
            amount: 10,
            value: 45.0,
        },
    });
    console.log('✅ BoughtProduct vinculado à venda');

    // ── 9. Contrato com PLACEHOLDERS dinâmicos ───────────────
    const contractContent = [
        'CONTRATO DE INTERMEDIAÇÃO DE COMPRA E VENDA DE PRODUTOS AGRÍCOLAS',
        '',
        '1) PARTES ENVOLVIDAS',
        '1.1. COMPRADOR: {{buyer.name}}, inscrito no CPF sob o nº {{buyer.cpf}}, e-mail: {{buyer.email}}.',
        '1.2. VENDEDOR: {{seller.name}}, inscrito no CPF sob o nº {{seller.cpf}}, e-mail: {{seller.email}}.',
        '',
        '2) OBJETO',
        '2.1. O presente contrato tem por objeto a intermediação da compra e venda dos seguintes produtos agrícolas:',
        '{{items.list}}',
        '',
        '3) VALORES',
        '3.1. Valor total dos produtos: R$ {{totals.items}}',
        '3.2. Valor do frete: R$ {{totals.freight}}',
        '3.3. Valor total da transação: R$ {{totals.grand}}',
        '',
        '4) CONDIÇÕES GERAIS',
        '4.1. Ambas as partes concordam com os termos aqui estabelecidos.',
        '4.2. A VendaPlus Agromarket atua exclusivamente como intermediadora, não se responsabilizando pela qualidade dos produtos.',
        '',
        '5) FORO',
        '5.1. Fica eleito o foro da comarca do comprador para dirimir quaisquer dúvidas oriundas do presente contrato.',
        '',
        'CONTATO',
        'suporte@vendaplusagromarket.com',
    ].join('\n');

    await prisma.contract.upsert({
        where: { kind_version: { kind: 'sale_intermediation_cpf', version: '1.0.0' } },
        update: { content: contractContent, sha256Hash: sha256(contractContent) },
        create: {
            kind: 'sale_intermediation_cpf',
            version: '1.0.0',
            content: contractContent,
            sha256Hash: sha256(contractContent),
        },
    });
    console.log('✅ Contrato template (sale_intermediation_cpf) criado');

    // ── Resumo ───────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════');
    console.log('🎬  DADOS PRONTOS PARA A DEMONSTRAÇÃO');
    console.log('══════════════════════════════════════════');
    console.log(`Comprador:  ${buyer.name} (${buyer.email})`);
    console.log(`Vendedor:   ${seller.name} (${seller.email})`);
    console.log(`Produto:    ${product.name}`);
    console.log(`Venda ID:   ${sale.id}`);
    console.log(`Senha:      123456 (ambos usuários)`);
    console.log('══════════════════════════════════════════\n');
    console.log('👉  Agora use a rota GET /sales/' + sale.id + '/contract');
    console.log('   para ver o contrato resolvido com os dados reais!\n');
}

main()
    .then(async () => { await prisma.$disconnect(); })
    .catch(async (e) => {
        console.error('❌ Erro no seed:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
