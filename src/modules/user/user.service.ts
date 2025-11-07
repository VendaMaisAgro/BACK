import { PrismaClient, User } from "@prisma/client";
import bcrypt from "bcryptjs";
import { isCPF, isCNPJ, formatToCPF, formatToCNPJ } from "brazilian-values";
import { AddressService } from "../address/address.service";
import { UploadS3Service } from "../upload-S3/uploadS3.service";

export class UserService {
  private readonly prisma: PrismaClient;
  private readonly addressService: AddressService;
  private readonly uploadService: UploadS3Service;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.addressService = new AddressService();
    this.uploadService = new UploadS3Service(this.prisma);
  }

  public async create(data: any, file?: Express.Multer.File): Promise<User> {
    const { name, phone_number, email, password, role, cpf, cnpj, ccir, securityQuestions } = data;

    // Validações básicas
    if (!name || !phone_number || !email || !password || !role) {
      throw new Error("Campos obrigatórios faltando.");
    }

    if (!cpf && !cnpj) {
      throw new Error("CPF ou CNPJ é obrigatório.");
    }

    // Validação de senha
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      throw new Error(
        "A senha deve conter pelo menos 8 caracteres, incluindo uma letra maiúscula, uma letra minúscula, um número e um caractere especial."
      );
    }

    // Validação e verificação de CPF
    if (cpf) {
      if (!isCPF(cpf)) {
        throw new Error("CPF inválido.");
      }
      const formattedCpf = formatToCPF(cpf);
      const existingCpf = await this.prisma.user.findUnique({
        where: { cpf: formattedCpf }
      });
      if (existingCpf) {
        throw new Error("CPF já cadastrado.");
      }
    }

    // Validação e verificação de CNPJ
    if (cnpj) {
      if (!isCNPJ(cnpj)) {
        throw new Error("CNPJ inválido.");
      }
      const formattedCnpj = formatToCNPJ(cnpj);
      const existingCnpj = await this.prisma.user.findUnique({
        where: { cnpj: formattedCnpj }
      });
      if (existingCnpj) {
        throw new Error("CNPJ já cadastrado.");
      }
    }

    // Verificar se email já existe
    const existingEmail = await this.prisma.user.findUnique({
      where: { email }
    });
    if (existingEmail) {
      throw new Error("Email já cadastrado.");
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Upload de imagem com URL permanente
    let imageUrl: string | null = null;
    if (file) {
      const { publicUrl } = await this.uploadService.upload(file);
      imageUrl = publicUrl;
    }

    // Preparar perguntas de segurança
    const securityQuestionsData = securityQuestions
      ? {
        create: {
          answer_1: await bcrypt.hash(securityQuestions.answer_1, 10),
          answer_2: await bcrypt.hash(securityQuestions.answer_2, 10),
          answer_3: await bcrypt.hash(securityQuestions.answer_3, 10),
        },
      }
      : undefined;

    try {
      const user = await this.prisma.user.create({
        data: {
          name,
          phone_number,
          email,
          password: hashedPassword,
          role,
          cpf: cpf ? formatToCPF(cpf) : null,
          cnpj: cnpj ? formatToCNPJ(cnpj) : null,
          img: imageUrl,
          ccir: ccir || null,
          securityQuestions: securityQuestionsData,
        },
        include: {
          securityQuestions: true,
        },
      });

      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as unknown as User;
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      throw error;
    }
  }

  public async getAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  public async getById(id: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) throw new Error("Usuário não encontrado.");

    const defaultAddress = await this.addressService.getDefaultAddress(id);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number,
      role: user.role,
      cpf: user.cpf,
      cnpj: user.cnpj,
      img: user.img,
      address: defaultAddress,
    };
  }


  public async update(
    id: string,
    data: Partial<User>,
    file?: Express.Multer.File
  ): Promise<User> {
    // Buscar usuário existente
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, cpf: true, cnpj: true, img: true }
    });

    if (!user) {
      throw new Error("Usuário não encontrado.");
    }

    // Preparar dados de atualização
    const updateData: any = { ...data };

    // Validação e hash de nova senha
    if (data.password) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
      if (!passwordRegex.test(data.password)) {
        throw new Error("A nova senha não atende aos critérios de segurança.");
      }
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    // Validação de CPF se estiver sendo atualizado
    if (data.cpf && data.cpf !== user.cpf) {
      if (!isCPF(data.cpf)) {
        throw new Error("CPF inválido.");
      }
      const formattedCpf = formatToCPF(data.cpf);
      const existingCpf = await this.prisma.user.findUnique({
        where: { cpf: formattedCpf }
      });
      if (existingCpf && existingCpf.id !== id) {
        throw new Error("CPF já cadastrado por outro usuário.");
      }
      updateData.cpf = formattedCpf;
    }

    // Validação de CNPJ se estiver sendo atualizado
    if (data.cnpj && data.cnpj !== user.cnpj) {
      if (!isCNPJ(data.cnpj)) {
        throw new Error("CNPJ inválido.");
      }
      const formattedCnpj = formatToCNPJ(data.cnpj);
      const existingCnpj = await this.prisma.user.findUnique({
        where: { cnpj: formattedCnpj }
      });
      if (existingCnpj && existingCnpj.id !== id) {
        throw new Error("CNPJ já cadastrado por outro usuário.");
      }
      updateData.cnpj = formattedCnpj;
    }

    // Validação de email se estiver sendo atualizado
    if (data.email && data.email !== user.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: data.email }
      });
      if (existingEmail && existingEmail.id !== id) {
        throw new Error("Email já cadastrado por outro usuário.");
      }
    }

    // Upload de nova imagem com URL permanente
    if (file) {
      // Deletar imagem antiga do S3 se existir
      if (user.img) {
        try {
          const oldKey = this.extractKeyFromUrl(user.img);
          if (oldKey) {
            await this.uploadService.delete(oldKey);
          }
        } catch (error) {
          console.warn("Erro ao deletar imagem antiga:", error);
          // Continua mesmo se falhar - não bloqueia a atualização
        }
      }

      // Upload da nova imagem
      const { publicUrl } = await this.uploadService.upload(file);
      updateData.img = publicUrl;
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateData,
        include: {
          securityQuestions: true,
        },
      });

      // Remover senha do retorno por segurança
      const { password: _, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword as unknown as User;
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      throw error;
    }
  }

  private extractKeyFromUrl(url: string): string | null {
    try {
      // Para URLs no formato: https://bucket.s3.region.amazonaws.com/key
      const urlObj = new URL(url);
      // Remove a barra inicial do pathname
      return decodeURIComponent(urlObj.pathname.substring(1));
    } catch (error) {
      console.warn("Erro ao extrair key da URL:", url, error);
      return null;
    }
  }

  public async updateProfileImage(
    userId: string,
    file: Express.Multer.File
  ): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { img: true },
    });

    if (!user) {
      throw new Error("Usuário não encontrado.");
    }

    // Deletar imagem antiga
    if (user.img) {
      try {
        const oldKey = this.extractKeyFromUrl(user.img);
        if (oldKey) {
          await this.uploadService.delete(oldKey);
        }
      } catch (error) {
        console.warn("Erro ao deletar imagem antiga:", error);
      }
    }

    // Upload da nova imagem
    const { publicUrl } = await this.uploadService.upload(file);

    // Atualizar no banco
    await this.prisma.user.update({
      where: { id: userId },
      data: { img: publicUrl },
    });

    return publicUrl;
  }

  public async delete(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error("Usuário não encontrado.");

    await this.prisma.user.delete({ where: { id } });
  }
}