// Uso único para o bootstrap do primeiro admin, quando ainda não existe nenhum
// admin capaz de chamar POST /user/admin. A partir do segundo admin em diante,
// use o endpoint protegido POST /user/admin autenticado com um token de admin.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { isCPF, isCNPJ, formatToCPF, formatToCNPJ } from 'brazilian-values';

const prisma = new PrismaClient();

function readArgs() {
  const [name, email, phone_number, password, cpf, cnpj] = process.argv.slice(2);

  return {
    name: name || process.env.ADMIN_NAME,
    email: email || process.env.ADMIN_EMAIL,
    phone_number: phone_number || process.env.ADMIN_PHONE,
    password: password || process.env.ADMIN_PASSWORD,
    cpf: cpf || process.env.ADMIN_CPF,
    cnpj: cnpj || process.env.ADMIN_CNPJ,
  };
}

async function main() {
  const { name, email, phone_number, password, cpf, cnpj } = readArgs();

  if (!name || !email || !phone_number || !password) {
    console.error(
      'Uso: npm run create-admin -- "<nome>" "<email>" "<telefone>" "<senha>" "<cpf>" "<cnpj>"\n' +
      'Informe cpf OU cnpj (o login é sempre feito por um desses dois).\n' +
      '(ou defina ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD, ADMIN_CPF, ADMIN_CNPJ no ambiente)'
    );
    process.exit(1);
  }

  if (!cpf && !cnpj) {
    console.error('Informe um CPF ou CNPJ — o login é sempre feito por CPF/CNPJ, nunca por e-mail.');
    process.exit(1);
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!passwordRegex.test(password)) {
    console.error(
      'A senha deve ter pelo menos 8 caracteres, com maiúscula, minúscula, número e caractere especial.'
    );
    process.exit(1);
  }

  let formattedCpf: string | null = null;
  if (cpf) {
    if (!isCPF(cpf)) {
      console.error('CPF inválido.');
      process.exit(1);
    }
    formattedCpf = formatToCPF(cpf);
    const existingCpf = await prisma.user.findUnique({ where: { cpf: formattedCpf } });
    if (existingCpf) {
      console.error(`Já existe um usuário cadastrado com o CPF ${formattedCpf}.`);
      process.exit(1);
    }
  }

  let formattedCnpj: string | null = null;
  if (cnpj) {
    if (!isCNPJ(cnpj)) {
      console.error('CNPJ inválido.');
      process.exit(1);
    }
    formattedCnpj = formatToCNPJ(cnpj);
    const existingCnpj = await prisma.user.findUnique({ where: { cnpj: formattedCnpj } });
    if (existingCnpj) {
      console.error(`Já existe um usuário cadastrado com o CNPJ ${formattedCnpj}.`);
      process.exit(1);
    }
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    console.error(`Já existe um usuário cadastrado com o e-mail ${email}.`);
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      name,
      email,
      phone_number,
      password: hashedPassword,
      cpf: formattedCpf,
      cnpj: formattedCnpj,
      role: 'admin',
    },
  });

  console.log(`Usuário admin criado com sucesso: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
