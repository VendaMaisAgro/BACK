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
  // Campos do contrato de intermediação
  sellerProfile?: string;       // "PRODUTOR" | "COOPERATIVA_ASSOCIACAO_DISTRIBUIDOR"
  packagingType?: string;
  paymentType?: string;         // "A_VISTA" | "A_PRAZO"
  paymentTermDays?: number;
  downPaymentPercent?: number;
  plannedHarvestDate?: Date;
  plannedPickupDate?: Date;
  plannedDeliveryDate?: Date;
  technicalSpec?: string;
  certifierRequired?: boolean;
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
  plannedHarvestDate?: Date;
  plannedPickupDate?: Date;
  plannedDeliveryDate?: Date;
  technicalSpec?: string;
  certifierRequired?: boolean;
  boughtProducts?: {
    productId: string;
    sellingUnitProductId: string;
    value: number;
    amount: number;
  }[];
}