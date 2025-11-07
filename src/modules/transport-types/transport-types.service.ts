import { PrismaClient } from '@prisma/client';

export class TransportTypesService {
	private readonly prisma: PrismaClient;

	constructor(prisma?: PrismaClient) {
		this.prisma = prisma || new PrismaClient();
	}

	async create(data: any) {
		return this.prisma.transportTypes.create({ data });
	}

	async getAll() {
		return this.prisma.transportTypes.findMany();
	}

	async getById(id: string) {
		return this.prisma.transportTypes.findUnique({ where: { id } });
	}

	async update(id: string, data: any) {
		return this.prisma.transportTypes.update({
			where: { id },
			data,
		});
	}

	async delete(id: string) {
		return this.prisma.transportTypes.delete({ where: { id } });
	}
}
