import PDFDocument from 'pdfkit';
import crypto from 'crypto';
import { PrismaClient, AcceptanceRole } from '@prisma/client';

export type ContractKind =
  | 'sale_tos'
  | 'terms_of_use'
  | 'privacy_policy'
  | 'sale_intermediation_cpf'
  | 'sale_intermediation_cnpj'
  | 'quality_agent_ps';

const prisma = new PrismaClient();

type Block =
  | { type: 'heading'; text: string }
  | { type: 'item'; text: string }
  | { type: 'subitem'; text: string }
  | { type: 'para'; text: string };

export class ContractService {
  private sha256(input: string) {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  private toBlocks(raw: string): Block[] {
    let t = (raw ?? '').replace(/\r\n/g, '\n').trim();

    t = t
      .replace(/\s*CONTATO\b\s*/gi, '\nCONTATO\n')
      .replace(/\s*(\d+\)\s+)/g, '\n$1')
      .replace(/\s+((?:\d+\.){2,}\s+)/g, '\n$1')
      .replace(/\s+(\d+\.\s+)/g, '\n$1');

    t = t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');

    const lines = t.split('\n').map(s => s.trim()).filter(Boolean);
    const blocks: Block[] = [];
    let buf: string[] = [];
    let afterContato = false;

    const flushPara = () => {
      if (buf.length) {
        blocks.push({ type: 'para', text: buf.join(' ') });
        buf = [];
      }
    };

    for (const s of lines) {
      if (/^CONTATO$/i.test(s)) {
        flushPara();
        blocks.push({ type: 'heading', text: 'CONTATO' });
        afterContato = true;
        continue;
      }
      if (afterContato) {
        flushPara();
        blocks.push({ type: 'para', text: s });
        afterContato = false;
        continue;
      }

      if (/^\d+\)\s+/.test(s)) {
        flushPara();
        const m = s.match(/^(\d+\))\s+(.+)$/);
        if (m) {
          const num = m[1];
          const rest = m[2];
          const idx = rest.search(/\s[\p{Lu}][\p{Ll}]/u);
          if (idx > -1) {
            const heading = rest.slice(0, idx).trim().replace(/\s+/g, ' ');
            const body = rest.slice(idx + 1).trim();
            blocks.push({ type: 'heading', text: `${num} ${heading}` });
            if (body) blocks.push({ type: 'para', text: body });
          } else {
            blocks.push({ type: 'heading', text: s });
          }
        } else {
          blocks.push({ type: 'heading', text: s });
        }
        continue;
      }

      if (/^(?:\d+\.){2,}\s+/.test(s)) {
        flushPara();
        blocks.push({ type: 'subitem', text: s });
        continue;
      }

      if (/^\d+\.\s+/.test(s)) {
        flushPara();
        blocks.push({ type: 'item', text: s });
        continue;
      }

      buf.push(s);
    }
    flushPara();
    return blocks;
  }

  /** Último contrato por tipo */
  getLatestContract(kind?: ContractKind) {
    return prisma.contract.findFirst({
      where: kind ? { kind: kind as any } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Cria versão de contrato */
  async createVersion(content: string, version: string, kind: ContractKind = 'sale_tos') {
    const sha256Hash = this.sha256(content);
    return prisma.contract.create({ data: { content, version, kind: kind as any, sha256Hash } });
  }

  /** Escolha automática (CPF/CNPJ) para contratos de venda */
  async pickDefaultSaleContractKind(saleId: string): Promise<ContractKind> {
    const sale = await prisma.saleData.findUnique({
      where: { id: saleId },
      include: { buyer: true },
    });
    if (!sale) throw new Error('SALE_NOT_FOUND');
    const isPJ = Boolean(sale.buyer?.cnpj && sale.buyer.cnpj.trim() !== '');
    return isPJ ? 'sale_intermediation_cnpj' : 'sale_intermediation_cpf';
  }

  /** Registra aceite */
  async acceptContract(params: {
    userId: string;
    contractId: string;
    accepted: boolean;
    clientIp: string;
    userAgent: string;
    saleId?: string;
    role: AcceptanceRole;
  }) {
    const { userId, contractId, accepted, clientIp, userAgent, saleId, role } = params;

    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new Error('CONTRACT_NOT_FOUND');

    const acceptedAt = new Date();
    const signatureHash = this.sha256(
      [
        userId,
        contractId,
        role,
        saleId ?? 'null',
        accepted ? '1' : '0',
        acceptedAt.toISOString(),
        clientIp,
        userAgent,
        contract.sha256Hash,
      ].join('|')
    );

    return prisma.contractAcceptance.create({
      data: {
        userId,
        contractId,
        role,
        saleId,
        accepted,
        acceptedAt,
        clientIp,
        userAgent,
        signatureHash,
      },
    });
  }

  /** BuyerId da venda (ou null) */
  async getBuyerIdForSale(saleId: string): Promise<string | null> {
    const sale = await prisma.saleData.findUnique({
      where: { id: saleId },
      select: { buyerId: true },
    });
    return sale?.buyerId ?? null;
  }


  /** Sellers (ids) participantes da venda, derivados dos itens */
  async getSellersForSale(saleId: string): Promise<string[]> {
    const sale = await prisma.saleData.findUnique({
      where: { id: saleId },
      include: { boughtProducts: { include: { product: true } } },
    });
    if (!sale) return [];
    const ids = new Set<string>();
    for (const bp of sale.boughtProducts) {
      const sid = bp.product?.sellerId;
      if (typeof sid === 'string') ids.add(sid);
    }
    // compat: se existir sale.sellerId (modelo leg antigo), inclui também
    const legacySellerId = (sale as any).sellerId;
    if (typeof legacySellerId === 'string') ids.add(legacySellerId);
    return [...ids];
  }

  /** Monta contexto da venda para um seller específico (ou único seller) */
  private async getSaleContext(saleId: string, preferSellerId?: string) {
    const sale = await prisma.saleData.findUnique({
      where: { id: saleId },
      include: {
        buyer: true,
        boughtProducts: {
          include: {
            product: true,
            sellingUnitProduct: { include: { unit: true } },
          },
        },
      },
    });

    if (!sale) return null;

    // descobre os sellers a partir dos itens
    const sellers = await this.getSellersForSale(saleId);
    let sellerId = preferSellerId ?? (sale as any).sellerId; // compat
    if (!sellerId) {
      if (sellers.length === 1) sellerId = sellers[0];
      else if (sellers.length > 1) throw new Error('MULTIPLE_SELLERS_REQUIRE_ID');
    }

    // filtra itens do seller (se houver sellerId definido)
    const itemsAll = sale.boughtProducts;
    const itemsFiltered = sellerId
      ? itemsAll.filter(bp => bp.product?.sellerId === sellerId)
      : itemsAll;

    const items = itemsFiltered.map(bp => {
      const unitTitle = bp.sellingUnitProduct?.unit?.title ?? '';
      const unit = bp.sellingUnitProduct?.unit?.unit ?? '';
      const unitPrice = bp.value;
      const amount = bp.amount;
      const total = unitPrice * amount;
      return {
        productName: bp.product?.name ?? '',
        unitTitle,
        unit,
        amount,
        unitPrice,
        total,
      };
    });

    const totals = {
      items: items.reduce((acc, it) => acc + (it.total || 0), 0),
      freight: Number(sale.transportValue || 0),
    };
    const grand = totals.items + totals.freight;

    const sellerUser =
      sellerId ? await prisma.user.findUnique({ where: { id: sellerId } }) : undefined;

    return {
      sale: {
        id: sale.id,
        createdAt: sale.createdAt,
        status: sale.status,
      },
      buyer: {
        id: sale.buyerId,
        name: sale.buyer?.name ?? '',
        email: sale.buyer?.email ?? '',
        cpf: sale.buyer?.cpf ?? '',
        cnpj: sale.buyer?.cnpj ?? '',
      },
      seller: sellerUser
        ? {
          id: sellerUser.id,
          name: sellerUser.name ?? '',
          email: sellerUser.email ?? '',
          cpf: sellerUser.cpf ?? '',
          cnpj: sellerUser.cnpj ?? '',
        }
        : undefined,
      items,
      totals: { ...totals, grand },
      'items.list': items
        .map(it => `- ${it.productName} x ${it.amount} ${it.unitTitle || it.unit || ''} = ${it.total.toFixed(2)}`)
        .join('\n'),
      meta: { sellers }, // lista completa para decisões no controller
    };
  }

  private getByPath(obj: any, path: string) {
    return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
  }
  private resolveContent(content: string, ctx: Record<string, any>) {
    return content.replace(/{{\s*([^}]+?)\s*}}/g, (_m, g1) => {
      const key = String(g1).trim();
      const val = this.getByPath(ctx, key);
      if (val === undefined || val === null) return '';
      if (Array.isArray(val)) return val.join(', ');
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    });
  }

  /** Contrato resolvido (JSON) — pode exigir sellerId em vendas com múltiplos sellers */
  async getResolvedContractForSale(saleId: string, kind?: ContractKind, sellerId?: string) {
    const [ctx, kindToUse] = await Promise.all([
      this.getSaleContext(saleId, sellerId),
      kind ? Promise.resolve(kind) : this.pickDefaultSaleContractKind(saleId),
    ]);

    if (!ctx) throw new Error('SALE_NOT_FOUND');

    const latest = await this.getLatestContract(kindToUse);
    if (!latest) throw new Error('CONTRACT_NOT_FOUND');

    const contentResolved = this.resolveContent(latest.content, ctx);

    return {
      saleId,
      contractId: latest.id,
      kind: latest.kind,
      version: latest.version,
      sha256Hash: latest.sha256Hash,
      createdAt: latest.createdAt,
      contentResolved,
      contextPreview: {
        buyer: (ctx as any).buyer,
        seller: (ctx as any).seller,
        totals: (ctx as any).totals,
        sellersInSale: (ctx as any).meta?.sellers ?? [],
      },
      sellersInSale: (ctx as any).meta?.sellers ?? [], // também no topo para bater com o Swagger
    };
  }

  /** PDF do contrato resolvido por venda (pode exigir sellerId) */
  async generateContractForSalePDF(saleId: string, kind?: ContractKind, sellerId?: string): Promise<PDFKit.PDFDocument> {
    const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });

    try {
      const resolved = await this.getResolvedContractForSale(saleId, kind, sellerId);

      doc.info.Title = `Contrato (${resolved.kind}) v${resolved.version} - venda #${saleId}`;
      doc.info.Author = 'Agromarket';
      doc.info.Subject = 'Contrato / Termos de Uso';

      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const contentWidth = right - left;

      doc.font('Helvetica-Bold').fontSize(18)
        .text(`Contrato (${resolved.kind}) v${resolved.version}`, { align: 'center' });
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(10).fillColor('#666')
        .text(`Venda #${saleId} • Última atualização: ${new Date(resolved.createdAt).toLocaleDateString('pt-BR')}`, { align: 'center' })
        .fillColor('black');
      doc.moveDown(0.5);
      doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor('#ddd').stroke();
      doc.moveDown();

      const blocks = this.toBlocks(resolved.contentResolved);
      for (const b of blocks) {
        if (b.type === 'heading') {
          doc.moveDown(0.2);
          doc.font('Helvetica-Bold').fontSize(13)
            .text(b.text, { width: contentWidth, align: 'left', lineGap: 2, paragraphGap: 8 });
          doc.font('Helvetica').fontSize(12);
          continue;
        }
        if (b.type === 'item') {
          doc.font('Helvetica').fontSize(12)
            .text(b.text, { width: contentWidth, align: 'justify', lineGap: 2, paragraphGap: 6, indent: 12 });
          continue;
        }
        if (b.type === 'subitem') {
          doc.font('Helvetica').fontSize(12)
            .text(b.text, { width: contentWidth, align: 'justify', lineGap: 2, paragraphGap: 6, indent: 24 });
          continue;
        }
        doc.font('Helvetica').fontSize(12)
          .text(b.text, { width: contentWidth, align: 'justify', lineGap: 2, paragraphGap: 6 });
      }

      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        doc.font('Helvetica').fontSize(9).fillColor('#666')
          .text(`Página ${i + 1} de ${range.count}`, 0, doc.page.height - doc.page.margins.bottom - 10, {
            width: doc.page.width, align: 'center'
          })
          .fillColor('black');
      }

      return doc;
    } catch (e: any) {
      doc.font('Helvetica-Bold').fontSize(16).text('Não foi possível gerar o contrato', { align: 'center' });
      doc.moveDown().font('Helvetica').fontSize(12)
        .text(`Motivo: ${e?.message ?? 'erro desconhecido'}`, { align: 'center' });
      return doc;
    }
  }

  /** PDF genérico do contrato (sem venda) — inalterado */
  async generateContract(kind?: ContractKind): Promise<PDFKit.PDFDocument> {
    const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });
    const latest = await this.getLatestContract(kind);

    doc.info.Title = `Termos v${latest?.version ?? 'N/A'}`;
    doc.info.Author = 'Agromarket';
    doc.info.Subject = 'Contrato / Termos de Uso';

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const contentWidth = right - left;

    if (!latest) {
      doc.font('Helvetica-Bold').fontSize(16).text('Nenhum contrato encontrado', { align: 'center' });
      doc.moveDown().font('Helvetica').fontSize(12)
        .text('Cadastre uma versão via POST /contract/version para visualizar o PDF.', { align: 'center' });
      return doc;
    }

    const blocks = this.toBlocks(latest.content);
    doc.font('Helvetica-Bold').fontSize(18).text(`Contrato v${latest.version}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).fillColor('#666')
      .text(`Última atualização: ${new Date(latest.createdAt).toLocaleDateString('pt-BR')}`, { align: 'center' })
      .fillColor('black');
    doc.moveDown(0.5);
    doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown();

    for (const b of blocks) {
      if (b.type === 'heading') {
        doc.moveDown(0.2);
        doc.font('Helvetica-Bold').fontSize(13)
          .text(b.text, { width: contentWidth, align: 'left', lineGap: 2, paragraphGap: 8 });
        doc.font('Helvetica').fontSize(12);
        continue;
      }
      if (b.type === 'item') {
        doc.font('Helvetica').fontSize(12)
          .text(b.text, { width: contentWidth, align: 'justify', lineGap: 2, paragraphGap: 6, indent: 12 });
        continue;
      }
      if (b.type === 'subitem') {
        doc.font('Helvetica').fontSize(12)
          .text(b.text, { width: contentWidth, align: 'justify', lineGap: 2, paragraphGap: 6, indent: 24 });
        continue;
      }
      doc.font('Helvetica').fontSize(12)
        .text(b.text, { width: contentWidth, align: 'justify', lineGap: 2, paragraphGap: 6 });
    }

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.font('Helvetica').fontSize(9).fillColor('#666')
        .text(`Página ${i + 1} de ${range.count}`, 0, doc.page.height - doc.page.margins.bottom - 10, {
          width: doc.page.width, align: 'center'
        })
        .fillColor('black');
    }

    return doc;
  }

  /** Status de aceites por venda (multi-seller) */
  async getAcceptanceStatusBySale(saleId: string) {
    const sellers = await this.getSellersForSale(saleId);
    if (!sellers.length) {
      // pode ser venda inexistente ou sem itens
      const sale = await prisma.saleData.findUnique({ where: { id: saleId } });
      if (!sale) return null;
    }

    const [buyerAcc, sellerAccs] = await Promise.all([
      prisma.contractAcceptance.findFirst({
        where: { saleId, role: AcceptanceRole.BUYER },
        orderBy: { acceptedAt: 'desc' },
      }),
      prisma.contractAcceptance.findMany({
        where: { saleId, role: AcceptanceRole.SELLER },
        orderBy: { acceptedAt: 'desc' },
      }),
    ]);

    const sellersStatus = sellers.map(sellerId => {
      const found = sellerAccs.find(a => a.userId === sellerId);
      return found
        ? { sellerId, accepted: found.accepted, at: found.acceptedAt, userId: found.userId, contractId: found.contractId }
        : { sellerId, accepted: false };
    });

    const allSellersAccepted = sellersStatus.length ? sellersStatus.every(s => s.accepted) : false;

    return {
      saleId,
      buyer: buyerAcc
        ? { accepted: buyerAcc.accepted, at: buyerAcc.acceptedAt, userId: buyerAcc.userId, contractId: buyerAcc.contractId }
        : null,
      sellers: sellersStatus,
      allSellersAccepted,
      bothAccepted: Boolean(buyerAcc?.accepted && allSellersAccepted),
    };
  }
}