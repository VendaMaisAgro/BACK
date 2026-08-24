import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { isCPF, formatToCPF } from "brazilian-values";

const prisma = new PrismaClient();

/** CPF de teste com dígitos verificadores válidos (não pertence a ninguém — padrão comum em ambientes de dev). */
const TEST_ADMIN_CPF = "52998224725";
const TEST_ADMIN_PASSWORD = "Admin@123";

async function main() {
  if (!isCPF(TEST_ADMIN_CPF)) {
    throw new Error("CPF de teste inválido — ajuste TEST_ADMIN_CPF.");
  }

  const cpf = formatToCPF(TEST_ADMIN_CPF);
  const hashedPassword = await bcrypt.hash(TEST_ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { cpf },
    update: { role: "admin", valid: true },
    create: {
      name: "Admin Teste",
      phone_number: "11999999999",
      email: "admin.teste@vendamais.local",
      password: hashedPassword,
      cpf,
      role: "admin",
      valid: true,
    },
  });

  console.log("✅ Usuário admin de teste pronto:");
  console.log(`   id:    ${admin.id}`);
  console.log(`   cpf:   ${cpf}`);
  console.log(`   senha: ${TEST_ADMIN_PASSWORD}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Erro ao criar admin de teste:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
