import { Request, Response } from 'express';
import { AcceptanceRole } from '@prisma/client';
import { ContractService, type ContractKind } from './contract.service';

const service = new ContractService();

function parseKind(input: unknown): ContractKind | undefined {
  const key = String(input ?? '').trim();
  if (
    key === 'sale_tos' ||
    key === 'terms_of_use' ||
    key === 'privacy_policy' ||
    key === 'sale_intermediation_cpf' ||
    key === 'sale_intermediation_cnpj' ||
    key === 'quality_agent_ps'
  ) return key as ContractKind;
  return undefined;
}
const parseId = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export class ContractController {
  async generate(req: Request, res: Response) {
    const kind = parseKind(req.query.kind);
    const doc = await service.generateContract(kind);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="contract.pdf"');
    doc.pipe(res);
    doc.end();
  }

  async latest(req: Request, res: Response) {
    const kind = parseKind(req.query.kind);
    const c = await service.getLatestContract(kind);
    if (!c) return res.status(404).json({ message: 'Nenhum contrato encontrado' });
    res.json(c);
  }

  async createVersion(req: Request, res: Response) {
    const { content, version, kind: kindRaw } = req.body ?? {};
    if (!content || !version) {
      return res.status(400).json({ message: 'content e version são obrigatórios' });
    }
    const kind = parseKind(kindRaw) ?? 'sale_tos';
    const created = await service.createVersion(content, version, kind);
    res.status(201).json(created);
  }

  /** Aceite genérico (com ou sem venda) — userId vem do token */
  async accept(req: Request, res: Response) {
    try {
      const authUserId = req.user?.userId as string | undefined;
      if (!authUserId) return res.status(401).json({ message: 'Token inválido ou ausente' });

      const contractId = req.body.contractId;
      const accepted = req.body.accepted;
      const saleId = req.body.saleId ? String(req.body.saleId) : undefined;

      const roleStr = String(req.body.role || '').toUpperCase();
      if (!['BUYER', 'SELLER'].includes(roleStr)) {
        return res.status(400).json({ message: 'role deve ser BUYER ou SELLER' });
      }
      const role = roleStr === 'SELLER' ? AcceptanceRole.SELLER : AcceptanceRole.BUYER;

      if (!Number.isFinite(contractId) || contractId <= 0 || typeof accepted !== 'boolean') {
        return res.status(400).json({ message: 'Parâmetros inválidos' });
      }

      // validação de vínculo com a venda quando saleId vier preenchido
      if (saleId) {
        if (role === AcceptanceRole.BUYER) {
          const buyerId = await service.getBuyerIdForSale(saleId);
          if (!buyerId) return res.status(404).json({ message: 'Venda não encontrada' });
          if (buyerId !== authUserId) {
            return res.status(403).json({ message: 'Usuário não é o comprador desta venda' });
          }
        } else if (role === AcceptanceRole.SELLER) {
          const sellers = await service.getSellersForSale(saleId);
          if (!sellers.includes(authUserId)) {
            return res.status(403).json({ message: 'Usuário não é vendedor desta venda' });
          }
        }
      }

      const clientIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
        req.socket.remoteAddress ??
        '';
      const userAgent = req.get('user-agent') ?? '';

      const created = await service.acceptContract({
        userId: authUserId,
        contractId,
        accepted,
        clientIp,
        userAgent,
        saleId,
        role,
      });

      return res.status(201).json({ message: 'Aceite registrado', id: created.id });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return res
          .status(409)
          .json({ message: 'Já existe um aceite para este usuário/contrato/venda/papel' });
      }
      if (err?.code === 'P2003') {
        return res.status(400).json({ message: 'IDs inválidos (chave estrangeira)' });
      }
      if (err?.message === 'CONTRACT_NOT_FOUND') {
        return res.status(404).json({ message: 'Contrato inexistente' });
      }
      console.error(err);
      return res.status(500).json({ message: 'Erro ao registrar aceite' });
    }
  }

  async statusBySale(req: Request, res: Response) {
    const saleId = String(req.params.saleId);
    if (!saleId) return res.status(400).json({ message: 'saleId inválido' });

    const s = await service.getAcceptanceStatusBySale(saleId);
    if (!s) return res.status(404).json({ message: 'Nenhum aceite para esta venda' });

    res.json(s);
  }

  /** BUYER — userId vem do token */
  async buyerAccept(req: Request, res: Response) {
    try {
      const saleId = String(req.params.saleId);
      if (!saleId) return res.status(400).json({ message: 'saleId inválido' });

      const authUserId = req.user?.userId as string | undefined;
      if (!authUserId) return res.status(401).json({ message: 'Token inválido ou ausente' });

      const accepted = req.body.accepted;
      const contractIdBody = req.body.contractId ? String(req.body.contractId) : undefined;
      if (typeof accepted !== 'boolean') {
        return res.status(400).json({ message: 'Parâmetros inválidos' });
      }

      // garantir que o token seja do comprador dessa venda
      const buyerId = await service.getBuyerIdForSale(saleId);
      if (!buyerId) return res.status(404).json({ message: 'Venda não encontrada' });
      if (buyerId !== authUserId) {
        return res.status(403).json({ message: 'Usuário não é o comprador desta venda' });
      }

      let contractId = contractIdBody;
      if (!contractId) {
        const autoKind = await service.pickDefaultSaleContractKind(saleId);
        const latest = await service.getLatestContract(autoKind);
        if (!latest) return res.status(404).json({ message: 'Contrato inexistente' });
        contractId = latest.id;
      }

      const clientIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
        req.socket.remoteAddress ??
        '';
      const userAgent = req.get('user-agent') ?? '';

      const created = await service.acceptContract({
        userId: authUserId,
        contractId,
        accepted,
        clientIp,
        userAgent,
        saleId,
        role: AcceptanceRole.BUYER,
      });

      return res.status(201).json({ message: 'Aceite do comprador registrado', id: created.id });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return res
          .status(409)
          .json({ message: 'Já existe aceite do comprador para este usuário/contrato/venda' });
      }
      if (err?.code === 'P2003') {
        return res.status(400).json({ message: 'IDs inválidos (chave estrangeira)' });
      }
      if (err?.message === 'CONTRACT_NOT_FOUND') {
        return res.status(404).json({ message: 'Contrato inexistente' });
      }
      if (err?.message === 'SALE_NOT_FOUND') {
        return res.status(404).json({ message: 'Venda não encontrada' });
      }
      console.error(err);
      return res.status(500).json({ message: 'Erro ao registrar aceite do comprador' });
    }
  }

  /** SELLER — userId vem do token */
  async sellerAccept(req: Request, res: Response) {
    try {
      const saleId = String(req.params.saleId);
      if (!saleId) return res.status(400).json({ message: 'saleId inválido' });

      const authUserId = req.user?.userId as string | undefined;
      if (!authUserId) return res.status(401).json({ message: 'Token inválido ou ausente' });

      const accepted = req.body.accepted;
      const contractIdBody = req.body.contractId ? String(req.body.contractId) : undefined;
      if (typeof accepted !== 'boolean') {
        return res.status(400).json({ message: 'Parâmetros inválidos' });
      }

      // valida se o usuário (do token) é um seller participante da venda
      const sellers = await service.getSellersForSale(saleId);
      if (!sellers.includes(authUserId)) {
        return res.status(403).json({ message: 'Usuário não é vendedor desta venda' });
      }

      let contractId = contractIdBody;
      if (!contractId) {
        const autoKind = await service.pickDefaultSaleContractKind(saleId);
        const latest = await service.getLatestContract(autoKind);
        if (!latest) return res.status(404).json({ message: 'Contrato inexistente' });
        contractId = latest.id;
      }

      const clientIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
        req.socket.remoteAddress ??
        '';
      const userAgent = req.get('user-agent') ?? '';

      const created = await service.acceptContract({
        userId: authUserId,
        contractId,
        accepted,
        clientIp,
        userAgent,
        saleId,
        role: AcceptanceRole.SELLER,
      });

      return res.status(201).json({ message: 'Aceite do vendedor registrado', id: created.id });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return res
          .status(409)
          .json({ message: 'Já existe aceite do vendedor para este usuário/contrato/venda' });
      }
      if (err?.code === 'P2003') {
        return res.status(400).json({ message: 'IDs inválidos (chave estrangeira)' });
      }
      if (err?.message === 'CONTRACT_NOT_FOUND') {
        return res.status(404).json({ message: 'Contrato inexistente' });
      }
      if (err?.message === 'SALE_NOT_FOUND') {
        return res.status(404).json({ message: 'Venda não encontrada' });
      }

      console.error(err);
      return res.status(500).json({ message: 'Erro ao registrar aceite do vendedor' });
    }
  }

  // ===== NOVOS ENDPOINTS (multi-seller) =====

  /** GET /sales/:saleId/contract?sellerId=... */
  async contractBySale(req: Request, res: Response) {
    try {
      const saleId = String(req.params.saleId);
      if (!saleId) return res.status(400).json({ message: 'saleId inválido' });

      const kind = parseKind(req.query.kind); // undefined → serviço decide por CPF/CNPJ
      const sellerId = parseId(req.query.sellerId);

      const resolved = await service.getResolvedContractForSale(saleId, kind, sellerId?.toString());
      return res.json(resolved);
    } catch (err: any) {
      if (err?.message === 'SALE_NOT_FOUND') {
        return res.status(404).json({ message: 'Venda não encontrada' });
      }
      if (err?.message === 'CONTRACT_NOT_FOUND') {
        return res.status(404).json({ message: 'Contrato inexistente' });
      }
      if (err?.message === 'MULTIPLE_SELLERS_REQUIRE_ID') {
        return res.status(400).json({ message: 'sellerId é obrigatório para vendas com múltiplos vendedores' });
      }
      console.error(err);
      return res.status(500).json({ message: 'Erro ao gerar contrato da venda' });
    }
  }

  /** GET /sales/:saleId/contract/pdf?sellerId=... */
  async contractPdfBySale(req: Request, res: Response) {
    try {
      const saleId = String(req.params.saleId);
      if (!saleId) return res.status(400).json({ message: 'saleId inválido' });

      const kind = parseKind(req.query.kind); // undefined → serviço decide por CPF/CNPJ
      const sellerId = parseId(req.query.sellerId);

      const doc = await service.generateContractForSalePDF(saleId, kind, sellerId?.toString());
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="contract-sale-${saleId}.pdf"`);
      doc.pipe(res);
      doc.end();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erro ao gerar PDF do contrato da venda' });
    }
  }
}