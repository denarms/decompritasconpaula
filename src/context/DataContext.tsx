import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { useAuth } from './AuthContext';
import { Product, CartItem, Sale, SaleItem, InventoryLog, PaymentMethod, Customer } from '../types';
import { SAMPLE_PRODUCTS } from '../utils/sampleData';

interface DataContextType {
  products: Product[];
  lowStockProducts: Product[];
  outOfStockProducts: Product[];
  alertCount: number;
  sales: Sale[];
  inventoryLogs: InventoryLog[];
  customers: Customer[];
  loadingData: boolean;
  hasDuplicates: boolean;

  // Cart actions
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => boolean;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartTotalCount: number;

  // Business transactions
  processSale: (params: {
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    discount?: number;
    paymentMethod: PaymentMethod;
    amountReceived?: number;
    changeDue?: number;
    notes?: string;
  }) => Promise<Sale>;

  // Product management
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateProduct: (id: string, productData: Partial<Product>) => Promise<void>;
  adjustStock: (productId: string, delta: number, reason: string) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  deleteSale: (saleId: string) => Promise<void>;
  seedDemoProducts: () => Promise<number>;
  removeDuplicateProducts: () => Promise<number>;

  // Customer management
  addCustomer: (data: Omit<Customer, 'id' | 'createdAt' | 'totalPurchasesCount' | 'totalSpent'>) => Promise<string>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const isSeedingRef = useRef(false);

  // Check if any products share the same SKU or Name (duplicates)
  const hasDuplicates = useMemo(() => {
    const seen = new Set<string>();
    for (const p of products) {
      const key = (p.sku || p.name).toLowerCase().trim();
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  }, [products]);

  // Real-time Firestore subscriptions attached ONLY when user is authenticated
  useEffect(() => {
    if (!user) {
      setProducts([]);
      setSales([]);
      setInventoryLogs([]);
      setCustomers([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);

    // 1. Subscribe to Products
    const productsPath = 'products';
    const unsubProducts = onSnapshot(
      collection(db, productsPath),
      (snapshot) => {
        const prods: Product[] = [];
        snapshot.forEach((docSnap) => {
          prods.push({ id: docSnap.id, ...docSnap.data() } as Product);
        });
        prods.sort((a, b) => a.name.localeCompare(b.name));
        setProducts(prods);
        setLoadingData(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, productsPath);
      }
    );

    // 2. Subscribe to Sales (latest 100 transactions)
    const salesPath = 'sales';
    const salesQuery = query(collection(db, salesPath), orderBy('createdAt', 'desc'), limit(100));
    const unsubSales = onSnapshot(
      salesQuery,
      (snapshot) => {
        const salesList: Sale[] = [];
        snapshot.forEach((docSnap) => {
          salesList.push({ id: docSnap.id, ...docSnap.data() } as Sale);
        });
        setSales(salesList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, salesPath);
      }
    );

    // 3. Subscribe to Customers
    const customersPath = 'customers';
    const customersQuery = query(collection(db, customersPath), orderBy('name', 'asc'));
    const unsubCustomers = onSnapshot(
      customersQuery,
      (snapshot) => {
        const custList: Customer[] = [];
        snapshot.forEach((docSnap) => {
          custList.push({ id: docSnap.id, ...docSnap.data() } as Customer);
        });
        setCustomers(custList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, customersPath);
      }
    );

    // 4. Subscribe to Inventory Logs (latest 60 movements)
    const logsPath = 'inventory_logs';
    const logsQuery = query(collection(db, logsPath), orderBy('createdAt', 'desc'), limit(60));
    const unsubLogs = onSnapshot(
      logsQuery,
      (snapshot) => {
        const logs: InventoryLog[] = [];
        snapshot.forEach((docSnap) => {
          logs.push({ id: docSnap.id, ...docSnap.data() } as InventoryLog);
        });
        setInventoryLogs(logs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, logsPath);
      }
    );

    return () => {
      unsubProducts();
      unsubSales();
      unsubCustomers();
      unsubLogs();
    };
  }, [user]);

  // Derived low stock & out of stock computations
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.status !== 'archived' && p.stock > 0 && p.stock <= p.minStockAlert);
  }, [products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter((p) => p.status !== 'archived' && p.stock <= 0);
  }, [products]);

  const alertCount = lowStockProducts.length + outOfStockProducts.length;

  // Cart operations
  const addToCart = (product: Product, quantity = 1): boolean => {
    if (product.stock <= 0) return false;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        if (newQty > product.stock) {
          return prevCart.map((item) =>
            item.product.id === product.id ? { ...item, quantity: product.stock } : item
          );
        }
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      } else {
        const initialQty = Math.min(quantity, product.stock);
        return [...prevCart, { product, quantity: initialQty }];
      }
    });
    return true;
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) => {
      return prev.map((item) => {
        if (item.product.id === productId) {
          const maxAllowed = item.product.stock;
          return { ...item, quantity: Math.min(quantity, maxAllowed) };
        }
        return item;
      });
    });
  };

  const clearCart = () => setCart([]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.selectedPrice ?? item.product.salePrice) * item.quantity, 0);
  }, [cart]);

  const cartTotalCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Customer Actions
  const addCustomer = async (
    data: Omit<Customer, 'id' | 'createdAt' | 'totalPurchasesCount' | 'totalSpent'>
  ): Promise<string> => {
    if (!user) throw new Error('Usuario no autenticado');
    const customerId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newCustomer: Customer = {
      ...data,
      id: customerId,
      totalPurchasesCount: 0,
      totalSpent: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      const custRef = doc(db, 'customers', customerId);
      await setDoc(custRef, newCustomer);
      return customerId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `customers/${customerId}`);
    }
  };

  const updateCustomer = async (id: string, data: Partial<Customer>): Promise<void> => {
    if (!user) throw new Error('Usuario no autenticado');
    const custRef = doc(db, 'customers', id);
    const nowIso = new Date().toISOString();

    try {
      await updateDoc(custRef, {
        ...data,
        updatedAt: nowIso,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `customers/${id}`);
    }
  };

  const deleteCustomer = async (id: string): Promise<void> => {
    if (!user) throw new Error('Usuario no autenticado');
    const custRef = doc(db, 'customers', id);
    try {
      await deleteDoc(custRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customers/${id}`);
    }
  };

  // Process a multi-item sale atomically
  const processSale = async ({
    customerId,
    customerName,
    customerPhone,
    discount = 0,
    paymentMethod,
    amountReceived,
    changeDue,
    notes,
  }: {
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    discount?: number;
    paymentMethod: PaymentMethod;
    amountReceived?: number;
    changeDue?: number;
    notes?: string;
  }): Promise<Sale> => {
    if (!user) throw new Error('Debes iniciar sesión para registrar una venta.');
    if (cart.length === 0) throw new Error('El carrito de venta está vacío.');

    // Pre-validate stock with current active products
    for (const item of cart) {
      const currentProd = products.find((p) => p.id === item.product.id);
      if (!currentProd) throw new Error(`Producto no encontrado: ${item.product.name}`);
      if (currentProd.stock < item.quantity) {
        throw new Error(
          `Stock insuficiente para "${currentProd.name}". Disponible: ${currentProd.stock}, Solicitado: ${item.quantity}`
        );
      }
    }

    const saleId = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const dateFormatted = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `DCP-${dateFormatted}-${randomSuffix}`;

    const saleItems: SaleItem[] = cart.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      sku: item.product.sku,
      category: item.product.category,
      size: item.product.size || '',
      colorOrShade: item.product.colorOrShade || '',
      quantity: item.quantity,
      unitPrice: item.selectedPrice ?? item.product.salePrice,
      unitCost: item.product.costPrice || 0,
      subtotal: (item.selectedPrice ?? item.product.salePrice) * item.quantity,
    }));

    const subtotal = saleItems.reduce((acc, it) => acc + it.subtotal, 0);
    const totalCost = saleItems.reduce((acc, it) => acc + it.unitCost * it.quantity, 0);
    const finalAmount = Math.max(0, subtotal - discount);

    const saleRecord: Sale = {
      id: saleId,
      receiptNumber,
      customerId: customerId || '',
      customerName: customerName?.trim() || 'Cliente Mostrador',
      customerPhone: customerPhone?.trim() || '',
      items: saleItems,
      totalItemsCount: cartTotalCount,
      subtotal,
      discount,
      totalAmount: finalAmount,
      totalCost,
      paymentMethod,
      ...(amountReceived !== undefined && amountReceived > 0
        ? { amountReceived, changeDue: changeDue !== undefined ? changeDue : Math.max(0, amountReceived - finalAmount) }
        : {}),
      sellerId: user.uid,
      sellerName: profile?.displayName || profile?.username || user.displayName || 'Cajero / Atención',
      sellerEmail: profile?.email || user.email || '',
      sellerRole: profile?.role || 'cashier',
      createdAt: nowIso,
    };

    // Execute atomic batch
    const batch = writeBatch(db);
    const saleDocRef = doc(db, 'sales', saleId);
    batch.set(saleDocRef, saleRecord);

    // If registered customer was linked, update their lifetime statistics
    if (customerId) {
      const targetCustomer = customers.find((c) => c.id === customerId);
      if (targetCustomer) {
        const custRef = doc(db, 'customers', customerId);
        batch.update(custRef, {
          totalPurchasesCount: (targetCustomer.totalPurchasesCount || 0) + 1,
          totalSpent: (targetCustomer.totalSpent || 0) + finalAmount,
          lastPurchaseAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }

    // Update each product stock and log inventory change
    for (const item of cart) {
      const prodRef = doc(db, 'products', item.product.id);
      const prevStock = item.product.stock;
      const newStock = Math.max(0, prevStock - item.quantity);

      batch.update(prodRef, {
        stock: newStock,
        updatedAt: nowIso,
      });

      const logId = `log_${Date.now()}_${item.product.id.substring(0, 5)}_${Math.random().toString(36).substring(2, 6)}`;
      const logRef = doc(db, 'inventory_logs', logId);
      const inventoryLog: InventoryLog = {
        id: logId,
        productId: item.product.id,
        productName: item.product.name,
        changeType: 'sale',
        quantityDelta: -item.quantity,
        previousStock: prevStock,
        newStock,
        reason: `Venta Ticket #${receiptNumber}`,
        performedBy: profile?.displayName || user.displayName || user.email || 'Venta POS',
        createdAt: nowIso,
      };
      batch.set(logRef, inventoryLog);
    }

    try {
      await batch.commit();
      clearCart();
      return saleRecord;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'sales');
    }
  };

  // Add new product
  const addProduct = async (
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    if (!user) throw new Error('Usuario no autenticado');
    const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newProduct: Product = {
      ...productData,
      id: productId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      const batch = writeBatch(db);
      const prodRef = doc(db, 'products', productId);
      batch.set(prodRef, newProduct);

      const logId = `log_${Date.now()}_init`;
      const logRef = doc(db, 'inventory_logs', logId);
      const initLog: InventoryLog = {
        id: logId,
        productId,
        productName: newProduct.name,
        changeType: 'initial',
        quantityDelta: newProduct.stock,
        previousStock: 0,
        newStock: newProduct.stock,
        reason: 'Ingreso inicial de producto',
        performedBy: profile?.displayName || user.displayName || 'Admin',
        createdAt: nowIso,
      };
      batch.set(logRef, initLog);

      await batch.commit();
      return productId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `products/${productId}`);
    }
  };

  const updateProduct = async (id: string, productData: Partial<Product>): Promise<void> => {
    if (!user) throw new Error('Usuario no autenticado');
    const nowIso = new Date().toISOString();
    const prodRef = doc(db, 'products', id);

    try {
      await updateDoc(prodRef, {
        ...productData,
        updatedAt: nowIso,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
    }
  };

  const adjustStock = async (productId: string, delta: number, reason: string): Promise<void> => {
    if (!user) throw new Error('Usuario no autenticado');
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error('Producto no encontrado');

    const prevStock = product.stock;
    const newStock = Math.max(0, prevStock + delta);
    const nowIso = new Date().toISOString();

    try {
      const batch = writeBatch(db);
      const prodRef = doc(db, 'products', productId);
      batch.update(prodRef, {
        stock: newStock,
        updatedAt: nowIso,
      });

      const logId = `log_${Date.now()}_adj_${Math.random().toString(36).substring(2, 6)}`;
      const logRef = doc(db, 'inventory_logs', logId);
      const adjLog: InventoryLog = {
        id: logId,
        productId,
        productName: product.name,
        changeType: delta > 0 ? 'restock' : 'adjustment',
        quantityDelta: delta,
        previousStock: prevStock,
        newStock,
        reason: reason.trim() || (delta > 0 ? 'Reabastecimiento de mercadería' : 'Ajuste manual de inventario'),
        performedBy: profile?.displayName || user.displayName || user.email || 'Personal Shopper',
        createdAt: nowIso,
      };
      batch.set(logRef, adjLog);

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
    }
  };

  const deleteProduct = async (productId: string): Promise<void> => {
    if (!user) throw new Error('Usuario no autenticado');
    const prodRef = doc(db, 'products', productId);
    try {
      await deleteDoc(prodRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
    }
  };

  const deleteSale = async (saleId: string): Promise<void> => {
    if (!user) throw new Error('Usuario no autenticado');
    const saleRef = doc(db, 'sales', saleId);
    try {
      await deleteDoc(saleRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sales/${saleId}`);
    }
  };

  const removeDuplicateProducts = async (): Promise<number> => {
    if (!user) throw new Error('Usuario no autenticado');
    const seen = new Set<string>();
    const duplicateIds: string[] = [];

    products.forEach((p) => {
      const key = (p.sku || p.name).toLowerCase().trim();
      if (seen.has(key)) {
        duplicateIds.push(p.id);
      } else {
        seen.add(key);
      }
    });

    if (duplicateIds.length === 0) return 0;

    const batch = writeBatch(db);
    duplicateIds.forEach((id) => {
      batch.delete(doc(db, 'products', id));
    });

    try {
      await batch.commit();
      return duplicateIds.length;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'products');
    }
  };

  const seedDemoProducts = async (): Promise<number> => {
    if (!user) throw new Error('Usuario no autenticado');
    if (isSeedingRef.current) return 0; // Prevent concurrent or double-click execution

    try {
      isSeedingRef.current = true;
      const nowIso = new Date().toISOString();
      const batch = writeBatch(db);

      SAMPLE_PRODUCTS.forEach((sample) => {
        // Deterministic ID based on SKU prevents duplicate records even if triggered multiple times!
        const safeSku = sample.sku.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const prodId = `prod_demo_${safeSku}`;
        const prodRef = doc(db, 'products', prodId);
        const newProd: Product = {
          ...sample,
          id: prodId,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        batch.set(prodRef, newProd);

        const logId = `log_demo_${safeSku}`;
        const logRef = doc(db, 'inventory_logs', logId);
        const log: InventoryLog = {
          id: logId,
          productId: prodId,
          productName: sample.name,
          changeType: 'initial',
          quantityDelta: sample.stock,
          previousStock: 0,
          newStock: sample.stock,
          reason: 'Carga de catálogo boutique demo',
          performedBy: profile?.displayName || 'Sistema Demo',
          createdAt: nowIso,
        };
        batch.set(logRef, log);
      });

      await batch.commit();
      return SAMPLE_PRODUCTS.length;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    } finally {
      isSeedingRef.current = false;
    }
  };

  return (
    <DataContext.Provider
      value={{
        products,
        lowStockProducts,
        outOfStockProducts,
        alertCount,
        sales,
        inventoryLogs,
        customers,
        loadingData,
        hasDuplicates,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartSubtotal,
        cartTotalCount,
        processSale,
        addProduct,
        updateProduct,
        adjustStock,
        deleteProduct,
        deleteSale,
        seedDemoProducts,
        removeDuplicateProducts,
        addCustomer,
        updateCustomer,
        deleteCustomer,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
