export interface CreateSaleDataDto {
  transportTypeId: string;
  createdAt?: Date;
  shippedAt?: Date;
  arrivedAt?: Date;
  transportValue: number;
  cargoWeightKg?: number;
  productRating?: number;
  sellerApproved?: boolean | null;
  sellerRating?: number;
  status?: string;
  addressId: string | null;
  paymentMethodId: string;
  buyerId: string;
  paymentCompleted?: boolean;
  // Campos do contrato de intermediação (preenchidos pelo comprador no pedido)
  sellerProfile?: string;       // "PRODUTOR" | "COOPERATIVA/ASSOCIAÇÃO/DISTRIBUIDOR"
  packagingType?: string;
  paymentType?: string;         // "À Vista" | "A Prazo"
  paymentTermDays?: number;
  downPaymentPercent?: number;
  technicalSpec?: string;
  certifierRequired?: boolean;
  // Datas planejadas (preenchidas pelo vendedor ao confirmar – via setSellerDecision)
  plannedHarvestDate?: Date;
  plannedPickupDate?: Date;
  plannedDeliveryDate?: Date;
  boughtProducts: {
    productId: string;
    sellingUnitProductId: string;
    value: number;
    amount: number;
  }[];
}

export interface UpdateSaleDataDto {
  transportTypeId?: string;
  createdAt?: Date;
  shippedAt?: Date;
  arrivedAt?: Date;
  transportValue?: number;
  cargoWeightKg?: number;
  productRating?: number;
  sellerRating?: number;
  sellerApproved?: boolean | null;
  status?: string;
  addressId?: string | null;
  paymentMethodId?: string;
  buyerId?: string;
  paymentCompleted?: boolean;
  // Campos do contrato de intermediação
  sellerProfile?: string;
  packagingType?: string;
  paymentType?: string;
  paymentTermDays?: number;
  downPaymentPercent?: number;
  // Datas de reagendamento – sujeitas à trava de 24h e limite de 3 dias úteis
  plannedHarvestDate?: Date;
  plannedPickupDate?: Date;
  plannedDeliveryDate?: Date;
  // Preenchido automaticamente pelo sistema (upload do canhoto ou aceite tácito)
  actualDeliveryDate?: Date;
  technicalSpec?: string;
  certifierRequired?: boolean;
  boughtProducts?: {
    productId: string;
    sellingUnitProductId: string;
    value: number;
    amount: number;
  }[];
}

export interface SellerDecisionDto {
  approved: boolean;
  /** Obrigatório quando approved = true */
  plannedHarvestDate?: Date;
  plannedPickupDate?: Date;
  /** Obrigatório quando o transporte não for retirada no local */
  plannedDeliveryDate?: Date;
}
