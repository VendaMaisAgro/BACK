import { PrismaClient, ContractKind } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function defaultContent(kind: ContractKind) {
  // Conteúdo placeholder para DEV (substituam depois pelo contrato real)
  return [
    `CONTRATO (${kind}) - AMBIENTE DE DESENVOLVIMENTO`,
    '',
    'Este é um conteúdo placeholder para permitir a geração de PDF e o fluxo de checkout em ambiente local.',
    'Substitua por um texto real via POST /contract/version quando tiver o contrato oficial.',
    '',
    'CONTATO',
    'suporte@agromarket.local',
  ].join('\n');
}

async function upsertContract(kind: ContractKind, version = '1.0.0') {
  const content = defaultContent(kind);
  const sha256Hash = sha256(content);

  // OBS: isso depende do @@unique([kind, version]) que você tem no schema
  await prisma.contract.upsert({
    where: { kind_version: { kind, version } },
    update: {
      content,
      sha256Hash,
    },
    create: {
      kind,
      version,
      content,
      sha256Hash,
    },
  });

  console.log(`✅ Contract seed OK -> ${kind} v${version}`);
}

async function main() {
  const kinds: ContractKind[] = [
    'sale_tos',
    'terms_of_use',
    'privacy_policy',
    'sale_intermediation_cpf',
    'sale_intermediation_cnpj',
    'quality_agent_ps',
  ];

  for (const kind of kinds) {
    await upsertContract(kind, '1.0.0');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
