if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET não está definido. Configure a variável de ambiente JWT_SECRET antes de iniciar o servidor."
  );
}

export const JWT_SECRET: string = process.env.JWT_SECRET;
