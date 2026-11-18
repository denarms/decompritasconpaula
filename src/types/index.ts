export type ProductCategory =
  | 'Ropa'
  | 'Cosméticos'
  | 'Bolsos y Carteras'
  | 'Calzados'
  | 'Joyas y Accesorios'
  | 'Cuidado de la piel'
  | 'Fragancias'
  | 'Otros';

export const CATEGORIES: ProductCategory[] = [
  'Ropa',
  'Cosméticos',
  'Bolsos y Carteras',
  'Calzados',
  'Joyas y Accesorios',
  'Cuidado de la piel',
  'Fragancias',
  'Otros',
];

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  notes?: string;
  totalPurchasesCount: number;
  totalSpent: number;
  lastPurchaseAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory | string;
  brand?: string;
  size?: string;
  colorOrShade?: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStockAlert: number;
  imageUrl?: string;
  description?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedPrice?: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  size?: string;
  colorOrShade?: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
}

export type PaymentMethod = 'cash' | 'qr_transfer' | 'card' | 'tigo_money' | 'other';

export interface Sale {
  id: string;
  receiptNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: SaleItem[];
  totalItemsCount: number;
  subtotal: number;
  discount: number;
  totalAmount: number;
  totalCost: number;
  paymentMethod: PaymentMethod;
  amountReceived?: number;
  changeDue?: number;
  notes?: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  sellerRole?: UserRole;
  createdAt: string;
}

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  changeType: 'sale' | 'restock' | 'adjustment' | 'initial';
  quantityDelta: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  performedBy?: string;
  createdAt: string;
}

export type UserRole = 'admin' | 'cashier';

export interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  authType?: 'google' | 'password';
  createdAt?: string;
}
