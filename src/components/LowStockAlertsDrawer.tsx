import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Product } from '../types';
import { X, Check, Package, RefreshCw, Plus, Minus, ArrowRight } from 'lucide-react';
import { sanitizeNumberInput, handleSelectOnFocus } from '../utils/numberInput';

interface LowStockAlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProductForEdit?: (product: Product) => void;
}

export const LowStockAlertsDrawer: React.FC<LowStockAlertsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { lowStockProducts, outOfStockProducts, adjustStock } = useData();
  // Store per-product restock quantity as string so the user can easily clear and type any number on mobile
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  if (!isOpen) return null;

  const getQty = (productId: string): number => {
    const val = quantities[productId];
    if (val === undefined || val === '') return 5;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
  };

  const getRawInput = (productId: string): string => {
    return quantities[productId] ?? '5';
  };

  const handleQtyChange = (productId: string, value: string) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: sanitizeNumberInput(value, false),
    }));
  };

  const handleStep = (productId: string, delta: number) => {
    const current = getQty(productId);
    const next = Math.max(1, current + delta);
    setQuantities((prev) => ({
      ...prev,
      [productId]: next.toString(),
    }));
  };

  const handleRestock = async (product: Product) => {
    const qty = getQty(product.id);
    try {
      setRestockingId(product.id);
      await adjustStock(product.id, qty, `Reposición desde alertas de stock (+${qty} un.)`);
      setSuccessId(product.id);
      setTimeout(() => {
        setSuccessId(null);
        setRestockingId(null);
      }, 1500);
    } catch (err) {
      console.error(err);
      setRestockingId(null);
    }
  };

  const totalAlerts = outOfStockProducts.length + lowStockProducts.length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-gray-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-700 flex items-center justify-center font-bold">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">
                Alertas de Stock ({totalAlerts})
              </h2>
              <p className="text-xs text-gray-400">Escoge la cantidad exacta a reponer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {totalAlerts === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                <Check className="w-6 h-6 stroke-[2]" />
              </div>
              <p className="font-semibold text-gray-800 text-sm">Inventario al día</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                No hay productos en estado crítico ni agotados actualmente.
              </p>
            </div>
          ) : (
            <>
              {/* Agotados */}
              {outOfStockProducts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                      Agotados ({outOfStockProducts.length})
                    </span>
                    <span className="text-[11px] text-gray-400">0 unidades</span>
                  </div>

                  {outOfStockProducts.map((prod) => {
                    const currentQty = getQty(prod.id);
                    const rawValue = getRawInput(prod.id);
                    const isBusy = restockingId === prod.id;
                    const isSuccess = successId === prod.id;

                    return (
                      <div
                        key={prod.id}
                        className="p-3.5 bg-red-50/40 border border-red-200/80 rounded-2xl space-y-3 text-xs shadow-xs"
                      >
                        {/* Product Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 text-sm truncate">{prod.name}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-gray-500">
                              <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                {prod.sku}
                              </span>
                              {prod.size && <span>• Talla: {prod.size}</span>}
                              {prod.colorOrShade && <span>• {prod.colorOrShade}</span>}
                            </div>
                          </div>
                          <span className="shrink-0 text-[11px] font-bold text-red-700 bg-red-100/90 px-2 py-0.5 rounded-full border border-red-200">
                            Agotado (0)
                          </span>
                        </div>

                        {/* Interactive Quantity Selector */}
                        <div className="bg-white p-2.5 rounded-xl border border-red-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-gray-600">
                              Cantidad a sumar:
                            </span>
                            <div className="flex items-center gap-1 text-[11px] text-gray-500">
                              <span>Stock final:</span>
                              <span className="font-bold text-emerald-700">
                                {0 + currentQty} un.
                              </span>
                            </div>
                          </div>

                          {/* Stepper + Number Input */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStep(prod.id, -1)}
                              disabled={isBusy || currentQty <= 1}
                              className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center transition-colors disabled:opacity-40"
                              title="Restar 1"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            <input
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              value={rawValue}
                              onFocus={handleSelectOnFocus}
                              onChange={(e) => handleQtyChange(prod.id, e.target.value)}
                              disabled={isBusy}
                              className="flex-1 text-center py-1.5 px-2 bg-gray-50 border border-gray-300 rounded-lg font-bold text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-pink-500 focus:bg-white"
                            />

                            <button
                              type="button"
                              onClick={() => handleStep(prod.id, 1)}
                              disabled={isBusy}
                              className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center transition-colors disabled:opacity-40"
                              title="Sumar 1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Submit Restock Button */}
                        <button
                          type="button"
                          onClick={() => handleRestock(prod)}
                          disabled={isBusy}
                          className={`w-full py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                            isSuccess
                              ? 'bg-emerald-600 text-white'
                              : 'bg-red-600 hover:bg-red-700 text-white active:scale-98'
                          } disabled:opacity-60`}
                        >
                          {isBusy ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Guardando aumento...
                            </>
                          ) : isSuccess ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              ¡Stock actualizado (+{currentQty})!
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              Aumentar +{currentQty} {currentQty === 1 ? 'unidad' : 'unidades'}
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Stock Bajo */}
              {lowStockProducts.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Stock Bajo ({lowStockProducts.length})
                    </span>
                    <span className="text-[11px] text-gray-400">Pronto por agotarse</span>
                  </div>

                  {lowStockProducts.map((prod) => {
                    const currentQty = getQty(prod.id);
                    const rawValue = getRawInput(prod.id);
                    const isBusy = restockingId === prod.id;
                    const isSuccess = successId === prod.id;

                    return (
                      <div
                        key={prod.id}
                        className="p-3.5 bg-amber-50/40 border border-amber-200/80 rounded-2xl space-y-3 text-xs shadow-xs"
                      >
                        {/* Product Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 text-sm truncate">{prod.name}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-gray-500">
                              <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                {prod.sku}
                              </span>
                              {prod.size && <span>• Talla: {prod.size}</span>}
                              {prod.colorOrShade && <span>• {prod.colorOrShade}</span>}
                            </div>
                          </div>
                          <span className="shrink-0 text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                            Quedan {prod.stock} un.
                          </span>
                        </div>

                        {/* Interactive Quantity Selector */}
                        <div className="bg-white p-2.5 rounded-xl border border-amber-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-gray-600">
                              Cantidad a sumar:
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                              <span>Stock actual: <strong className="text-gray-700">{prod.stock}</strong></span>
                              <ArrowRight className="w-3 h-3 text-gray-400" />
                              <span>Nuevo: <strong className="text-emerald-700">{prod.stock + currentQty} un.</strong></span>
                            </div>
                          </div>

                          {/* Stepper + Number Input */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStep(prod.id, -1)}
                              disabled={isBusy || currentQty <= 1}
                              className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center transition-colors disabled:opacity-40"
                              title="Restar 1"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            <input
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              value={rawValue}
                              onFocus={handleSelectOnFocus}
                              onChange={(e) => handleQtyChange(prod.id, e.target.value)}
                              disabled={isBusy}
                              className="flex-1 text-center py-1.5 px-2 bg-gray-50 border border-gray-300 rounded-lg font-bold text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-pink-500 focus:bg-white"
                            />

                            <button
                              type="button"
                              onClick={() => handleStep(prod.id, 1)}
                              disabled={isBusy}
                              className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center transition-colors disabled:opacity-40"
                              title="Sumar 1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Submit Restock Button */}
                        <button
                          type="button"
                          onClick={() => handleRestock(prod)}
                          disabled={isBusy}
                          className={`w-full py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                            isSuccess
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-600 hover:bg-amber-700 text-white active:scale-98'
                          } disabled:opacity-60`}
                        >
                          {isBusy ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Guardando aumento...
                            </>
                          ) : isSuccess ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              ¡Stock actualizado (+{currentQty})!
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              Aumentar +{currentQty} {currentQty === 1 ? 'unidad' : 'unidades'}
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
