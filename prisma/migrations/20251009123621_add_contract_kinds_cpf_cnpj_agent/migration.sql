-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContractKind" ADD VALUE 'sale_intermediation_cpf';
ALTER TYPE "ContractKind" ADD VALUE 'sale_intermediation_cnpj';
ALTER TYPE "ContractKind" ADD VALUE 'quality_agent_ps';
