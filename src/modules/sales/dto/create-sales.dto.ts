export interface CreateSaleDataDto {
  transportTypeId: string;
  createdAt?: Date;
  shippedAt?: Date;
  arrivedAt?: Date;
  transportValue: number;
  cargoWeightKg?: number;
  productRating?: number;
  sellerApproved?: boolean | null; // true=aceito, false=recusado, null=pendente
  sellerRating?: number;
  status?: string;
  addressId: string | null; // aceita null (retirada)
  paymentMethodId: string;
  buyerId: string;
  paymentCompleted?: boolean;
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
  sellerApproved?: boolean | null; // true/false/null
  status?: string;
  addressId?: string | null;
  paymentMethodId?: string;
  buyerId?: string;
  paymentCompleted?: boolean;
  boughtProducts?: {
    productId: string;
    sellingUnitProductId: string;
    value: number;
    amount: number;
  }[];
}