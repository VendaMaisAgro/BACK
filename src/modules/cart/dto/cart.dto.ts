// dto/cart.dto.ts

export interface AddToCartDto {
  userId: string;
  productId: string;
  sellingUnitProductId: string;
  amount: number;
  value: number;
}

export interface RemoveItemDto {
  itemId: string;
}

export interface ClearCartDto {
  userId: string;
}
