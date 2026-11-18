import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Product, CATEGORIES, PaymentMethod, Sale, Customer } from '../types';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  QrCode,
  Banknote,
  Smartphone,
  User,
  Phone,
  Check,
  Package,
  ArrowRight,
  UserPlus,
  ChevronDown,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ReceiptModal } from './ReceiptModal';
import { CustomerModal } from './CustomerModal';
import { sanitizeNumberInput, handleSelectOnFocus } from '../utils/numberInput';

interface POSViewProps {
  onOpenProductModal: () => void;
}

export const POSView: React.FC<POSViewProps> = ({ onOpenProductModal }) => {
  const { isAdmin } = useAuth();
  const {
    products,
    customers,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    cartSubtotal,
    cartTotalCount,
    processSale,
  } = useData();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Registered Customer selection state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Checkout form state
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceivedStr, setAmountReceivedStr] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mobile cart sheet visibility
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Completed sale receipt
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status === 'archived') return false;

      const matchesCategory =
        selectedCategory === 'Todos' || p.category === selectedCategory;

      const query = searchTerm.toLowerCase().trim();
      if (!query) return matchesCategory;

      const matchesSearch =
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.brand && p.brand.toLowerCase().includes(query)) ||
        (p.colorOrShade && p.colorOrShade.toLowerCase().includes(query)) ||
        (p.size && p.size.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  const finalTotal = Math.max(0, cartSubtotal - discount);
  const amountReceivedNum = amountReceivedStr.trim() === '' ? 0 : parseFloat(amountReceivedStr) || 0;
  const changeDue = Math.max(0, amountReceivedNum - finalTotal);
  const hasShortage = amountReceivedNum > 0 && amountReceivedNum < finalTotal;
  const shortageAmount = Math.max(0, finalTotal - amountReceivedNum);

  // Handle client selection from registered directory
  const handleSelectCustomer = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const custId = e.target.value;
    setSelectedCustomerId(custId);
    if (!custId) {
      setCustomerName('');
      setCustomerPhone('');
      return;
    }
    const found = customers.find((c) => c.id === custId);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone || '');
    }
  };

  const handleCustomerCreated = (newId: string, name: string, phone: string) => {
    setSelectedCustomerId(newId);
    setCustomerName(name);
    setCustomerPhone(phone);
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setError('Agrega al menos un artículo al carrito');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const sale = await processSale({
        customerId: selectedCustomerId || undefined,
        customerName: customerName.trim() || 'Cliente Mostrador',
        customerPhone: customerPhone.trim(),
        discount,
        paymentMethod,
        amountReceived: paymentMethod === 'cash' && amountReceivedNum > 0 ? amountReceivedNum : undefined,
        changeDue: paymentMethod === 'cash' && amountReceivedNum > 0 ? changeDue : undefined,
        notes,
      });

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#DB2777', '#E11D48', '#BE185D', '#F43F5E'],
      });

      setCompletedSale(sale);
      setMobileCartOpen(false);
      // Reset checkout details
      setSelectedCustomerId('');
      setCustomerName('');
      setCustomerPhone('');
      setDiscount(0);
      setAmountReceivedStr('');
      setNotes('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar la venta');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-white">
      {/* LEFT COLUMN: Product Catalog */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-gray-100">
        {/* Search & Categories Bar (Minimalist) */}
        <div className="p-4 border-b border-gray-100 space-y-3 bg-white">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar prenda, tono, SKU o marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:border-pink-500 focus:bg-white transition-colors placeholder:text-gray-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Catalog Actions (Admin only) */}
            {isAdmin && (
              <button
                onClick={onOpenProductModal}
                className="px-3 py-2 bg-pink-600 hover:bg-pink-700 text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Nuevo Artículo
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
            {['Todos', ...CATEGORIES].map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full whitespace-nowrap font-medium text-xs transition-colors ${
                    active
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
          {products.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-gray-200">
              <Package className="w-10 h-10 text-gray-300 stroke-[1.2] mb-3" />
              <h3 className="font-semibold text-gray-800 text-sm">Catálogo Vacío</h3>
              <p className="text-xs text-gray-400 max-w-sm mt-1 mb-4">
                Aún no hay artículos registrados en el inventario.
              </p>
              {isAdmin && (
                <button
                  onClick={onOpenProductModal}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-medium rounded-xl transition-colors"
                >
                  Registrar Nuevo Artículo
                </button>
              )}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <Package className="w-8 h-8 mb-2 text-gray-300 stroke-[1.2]" />
              <p className="font-medium text-gray-600 text-xs">No se encontraron artículos</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Prueba con otra palabra clave o categoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((prod) => {
                const isOutOfStock = prod.stock <= 0;
                const isLowStock = !isOutOfStock && prod.stock <= prod.minStockAlert;
                const cartQty = cart.find((i) => i.product.id === prod.id)?.quantity || 0;

                return (
                  <div
                    key={prod.id}
                    onClick={() => {
                      if (!isOutOfStock) addToCart(prod);
                    }}
                    className={`group bg-white rounded-xl border transition-all flex flex-col justify-between overflow-hidden cursor-pointer select-none ${
                      isOutOfStock
                        ? 'opacity-50 border-gray-200 bg-gray-50 cursor-not-allowed'
                        : isLowStock
                        ? 'border-amber-200 hover:border-pink-300 hover:shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-xs'
                    }`}
                  >
                    {/* Top Image */}
                    <div className="relative aspect-square w-full bg-gray-50 overflow-hidden">
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                          <Package className="w-8 h-8 stroke-[1.2]" />
                          <span className="text-[10px] uppercase font-semibold mt-1 text-gray-400">
                            {prod.category}
                          </span>
                        </div>
                      )}

                      {/* Stock Pill */}
                      <div className="absolute top-2 left-2">
                        {isOutOfStock ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                            Agotado
                          </span>
                        ) : isLowStock ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            Quedan {prod.stock}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-900/70 text-white backdrop-blur-xs">
                            {prod.stock} un.
                          </span>
                        )}
                      </div>

                      {/* Cart Quantity Badge */}
                      {cartQty > 0 && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-pink-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                          {cartQty}
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                          <span className="truncate">{prod.brand || prod.category}</span>
                          <span className="font-mono">{prod.sku}</span>
                        </div>

                        <h4 className="font-medium text-gray-900 text-xs line-clamp-2 leading-tight">
                          {prod.name}
                        </h4>

                        {/* Variants */}
                        <div className="flex flex-wrap items-center gap-1 mt-1 text-[10px]">
                          {prod.size && (
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                              {prod.size}
                            </span>
                          )}
                          {prod.colorOrShade && (
                            <span className="px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 truncate max-w-[100px]">
                              {prod.colorOrShade}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price & Add */}
                      <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm text-gray-900">
                          Bs. {prod.salePrice.toFixed(2)}
                        </span>

                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isOutOfStock) addToCart(prod);
                          }}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                            isOutOfStock
                              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                              : 'bg-pink-50 hover:bg-pink-600 text-pink-700 hover:text-white'
                          }`}
                          title="Añadir a la venta"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN (DESKTOP/TABLET): Minimalist Cart & Checkout */}
      <div className="hidden lg:flex flex-col w-96 xl:w-[400px] h-full bg-white border-l border-gray-100">
        {/* Cart Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-4 h-4 text-gray-700" />
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Ticket de Venta</h3>
              <p className="text-[11px] text-gray-400">
                {cartTotalCount} {cartTotalCount === 1 ? 'artículo' : 'artículos'}
              </p>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-gray-400 hover:text-rose-600 font-medium transition-colors"
            >
              Vaciar
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <ShoppingCart className="w-10 h-10 stroke-[1] text-gray-200 mb-2" />
              <p className="font-medium text-gray-600 text-xs">El carrito está vacío</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Selecciona artículos del catálogo para agregarlos.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="p-2.5 bg-gray-50/60 rounded-xl border border-gray-100 flex items-center justify-between gap-2"
              >
                <div className="flex-1 min-w-0 pr-1">
                  <h5 className="font-medium text-gray-900 text-xs truncate">
                    {item.product.name}
                  </h5>
                  <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                    <span>Bs. {item.product.salePrice.toFixed(2)} c/u</span>
                    {item.product.size && <span>• Talla {item.product.size}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 hover:bg-gray-50 text-gray-500 rounded-l-lg transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-medium text-xs text-gray-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="p-1 hover:bg-gray-50 text-gray-500 rounded-r-lg transition-colors disabled:opacity-30"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-bold text-xs text-gray-900 min-w-[55px] text-right">
                    Bs. {(item.product.salePrice * item.quantity).toFixed(2)}
                  </span>

                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 text-gray-300 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Customer & Payment Form (Minimalist) */}
        <div className="p-4 border-t border-gray-100 bg-white space-y-3 text-xs">
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Client Selection (Registered Customer vs New) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-gray-400" />
                Cliente:
              </label>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="text-[11px] text-pink-600 hover:text-pink-700 font-medium flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" />
                + Registrar Cliente
              </button>
            </div>

            {/* Selector of registered clients */}
            <select
              value={selectedCustomerId}
              onChange={handleSelectCustomer}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl bg-gray-50 text-xs focus:ring-1 focus:ring-pink-500 focus:outline-hidden"
            >
              <option value="">-- Seleccionar de Clientes Registrados --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''} - {c.city || 'Bolivia'}
                </option>
              ))}
            </select>

            {/* Direct manual or pre-filled input */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <input
                type="text"
                placeholder="Nombre cliente"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (selectedCustomerId) setSelectedCustomerId('');
                }}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl bg-gray-50 text-xs focus:ring-1 focus:ring-pink-500 focus:outline-hidden"
              />
              <input
                type="tel"
                placeholder="WhatsApp"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl bg-gray-50 text-xs focus:ring-1 focus:ring-pink-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-[11px] font-medium text-gray-600 block mb-1">
              Método de Pago:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'cash', label: 'Efectivo', icon: Banknote },
                { id: 'qr_transfer', label: 'QR Simple', icon: QrCode },
                { id: 'card', label: 'Tarjeta', icon: CreditCard },
                { id: 'tigo_money', label: 'Tigo Money', icon: Smartphone },
              ].map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(m.id as PaymentMethod);
                      if (m.id !== 'cash') setAmountReceivedStr('');
                    }}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                      active
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calculadora de Efectivo y Vuelto (Cuando paga en efectivo) */}
          {paymentMethod === 'cash' && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/90 rounded-xl space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  Calculadora de Cambio / Vuelto
                </label>
                {amountReceivedStr && (
                  <button
                    type="button"
                    onClick={() => setAmountReceivedStr('')}
                    className="text-[10px] text-gray-400 hover:text-rose-600 font-medium"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-gray-600 font-medium">Cliente paga con (Bs.):</span>
                  <span className="text-gray-500">A cobrar: <strong className="text-gray-900">Bs. {finalTotal.toFixed(2)}</strong></span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500 text-xs">
                    Bs.
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    value={amountReceivedStr}
                    onFocus={handleSelectOnFocus}
                    onChange={(e) => setAmountReceivedStr(sanitizeNumberInput(e.target.value, true, false))}
                    className="w-full pl-9 pr-7 py-2 border border-emerald-300 rounded-xl bg-white text-sm font-bold text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  {amountReceivedStr !== '' && (
                    <button
                      type="button"
                      onClick={() => setAmountReceivedStr('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 text-xs"
                      title="Borrar"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Indicador de Vuelto a Entregar */}
              {amountReceivedNum >= finalTotal && amountReceivedNum > 0 ? (
                <div className="p-2.5 bg-white rounded-xl border border-emerald-200 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
                      Vuelto a entregar
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      {amountReceivedNum === finalTotal ? 'Pago exacto (sin vuelto)' : `Paga Bs. ${amountReceivedNum.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-emerald-600 block">
                      Bs. {changeDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : hasShortage ? (
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 flex justify-between items-center">
                  <span>Falta para completar:</span>
                  <span className="font-bold text-amber-900">Bs. {shortageAmount.toFixed(2)}</span>
                </div>
              ) : null}
            </div>
          )}

          {/* Discount input */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
            <span className="text-gray-500 text-xs">Descuento (Bs.):</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={discount === 0 ? '' : discount.toString()}
              onFocus={handleSelectOnFocus}
              onChange={(e) => {
                const clean = sanitizeNumberInput(e.target.value, true);
                if (clean === '') {
                  setDiscount(0);
                } else {
                  const val = parseFloat(clean);
                  setDiscount(isNaN(val) ? 0 : Math.min(cartSubtotal, Math.max(0, val)));
                }
              }}
              className="w-20 text-right px-2 py-1 border border-gray-200 rounded-lg text-xs font-medium text-gray-900 bg-gray-50 focus:ring-1 focus:ring-pink-500 focus:outline-hidden"
            />
          </div>

          {/* Totals */}
          <div className="pt-2 border-t border-gray-100 space-y-1">
            <div className="flex justify-between text-gray-500 text-xs">
              <span>Subtotal ({cartTotalCount} un.):</span>
              <span>Bs. {cartSubtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-pink-600 text-xs">
                <span>Descuento:</span>
                <span>-Bs. {discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-1">
              <span className="font-bold text-xs text-gray-900 uppercase">Total:</span>
              <span className="font-extrabold text-lg text-gray-900">
                Bs. {finalTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCompleteSale}
            disabled={processing || cart.length === 0}
            className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {processing ? (
              <span>Registrando venta...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Registrar Venta • Bs. {finalTotal.toFixed(2)}
              </>
            )}
          </button>
        </div>
      </div>

      {/* MOBILE FLOATING CART BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-200 shadow-lg z-40 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-gray-400 block uppercase font-medium">Total</span>
          <span className="font-bold text-base text-gray-900">
            Bs. {finalTotal.toFixed(2)}
          </span>
        </div>

        <button
          onClick={() => setMobileCartOpen(true)}
          disabled={cart.length === 0}
          className="px-4 py-2 bg-pink-600 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-40"
        >
          <span>Ver Carrito ({cartTotalCount})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* MOBILE CART MODAL SHEET */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-t-2xl max-h-[88vh] flex flex-col overflow-hidden shadow-xl border-t border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">
                Ticket de Venta ({cartTotalCount} artículos)
              </h3>
              <button
                onClick={() => setMobileCartOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-medium p-1"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-52">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="p-2 bg-gray-50 rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.product.name}</p>
                    <p className="text-[11px] text-gray-400">
                      Bs. {item.product.salePrice.toFixed(2)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">
                      Bs. {(item.product.salePrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100 bg-white space-y-3 text-xs">
              <select
                value={selectedCustomerId}
                onChange={handleSelectCustomer}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl bg-gray-50 text-xs"
              >
                <option value="">-- Seleccionar Cliente Registrado --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>

              {/* Métodos de Pago en Móvil (Todos los 4 métodos disponibles) */}
              <div>
                <label className="text-[11px] font-medium text-gray-600 block mb-1">
                  Método de Pago:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'cash', label: 'Efectivo', icon: Banknote },
                    { id: 'qr_transfer', label: 'QR Simple', icon: QrCode },
                    { id: 'card', label: 'Tarjeta', icon: CreditCard },
                    { id: 'tigo_money', label: 'Tigo Money', icon: Smartphone },
                  ].map((m) => {
                    const Icon = m.icon;
                    const active = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(m.id as PaymentMethod);
                          if (m.id !== 'cash') setAmountReceivedStr('');
                        }}
                        className={`py-2 px-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                          active
                            ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Calculadora en Móvil (Cuando es Efectivo) */}
              {paymentMethod === 'cash' && (
                <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-700 font-bold flex items-center gap-1">
                      <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                      Paga con (Bs.):
                    </span>
                    <span className="font-bold text-gray-900">A cobrar: Bs. {finalTotal.toFixed(2)}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-gray-500 text-xs">
                      Bs.
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0.00"
                      value={amountReceivedStr}
                      onFocus={handleSelectOnFocus}
                      onChange={(e) => setAmountReceivedStr(sanitizeNumberInput(e.target.value, true, false))}
                      className="w-full pl-8 pr-7 py-1.5 border border-emerald-300 rounded-xl bg-white text-sm font-bold text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    {amountReceivedStr !== '' && (
                      <button
                        type="button"
                        onClick={() => setAmountReceivedStr('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {amountReceivedNum >= finalTotal && amountReceivedNum > 0 && (
                    <div className="p-2 bg-white rounded-lg border border-emerald-200 flex justify-between items-center shadow-xs">
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase block">Vuelto a devolver:</span>
                        <span className="text-[10px] text-emerald-700">Paga con Bs. {amountReceivedNum.toFixed(2)}</span>
                      </div>
                      <span className="text-base font-black text-emerald-600">Bs. {changeDue.toFixed(2)}</span>
                    </div>
                  )}
                  {hasShortage && (
                    <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-200 text-[10px] text-amber-800 flex justify-between items-center">
                      <span>Falta para completar:</span>
                      <span className="font-bold text-amber-900">Bs. {shortageAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Descuento en Móvil */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
                <span className="text-gray-500 text-xs">Descuento (Bs.):</span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  value={discount === 0 ? '' : discount.toString()}
                  onFocus={handleSelectOnFocus}
                  onChange={(e) => {
                    const clean = sanitizeNumberInput(e.target.value, true);
                    if (clean === '') {
                      setDiscount(0);
                    } else {
                      const val = parseFloat(clean);
                      setDiscount(isNaN(val) ? 0 : Math.min(cartSubtotal, Math.max(0, val)));
                    }
                  }}
                  className="w-20 text-right px-2 py-1 border border-gray-200 rounded-lg text-xs font-medium text-gray-900 bg-gray-50 focus:ring-1 focus:ring-pink-500 focus:outline-hidden"
                />
              </div>

              {/* Totales en Móvil */}
              <div className="space-y-0.5 pt-1 border-t border-gray-100 text-xs">
                {discount > 0 && (
                  <div className="flex justify-between text-pink-600 text-[11px]">
                    <span>Descuento aplicado:</span>
                    <span>-Bs. {discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-bold text-gray-900">
                  <span>TOTAL A COBRAR:</span>
                  <span className="text-base font-extrabold text-pink-600">Bs. {finalTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleCompleteSale}
                disabled={processing}
                className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {processing ? 'Procesando...' : `Cobrar Bs. ${finalTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK CUSTOMER REGISTRATION MODAL */}
      {isCustomerModalOpen && (
        <CustomerModal
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          onCustomerCreated={handleCustomerCreated}
        />
      )}

      {/* COMPLETED SALE RECEIPT MODAL */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </div>
  );
};
