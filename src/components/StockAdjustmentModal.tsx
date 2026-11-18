import React, { useState } from 'react';
import { Product } from '../types';
import { useData } from '../context/DataContext';
import { X, Plus, Minus, Package, Check, RefreshCw } from 'lucide-react';
import { sanitizeNumberInput, handleSelectOnFocus } from '../utils/numberInput';

interface StockAdjustmentModalProps {
  product: Product | null;
  onClose: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ product, onClose }) => {
  const { adjustStock } = useData();
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [quantityStr, setQuantityStr] = useState<string>('5');
  const [reason, setReason] = useState<string>('Llegada de nueva mercadería / Pedido');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!product) return null;

  const parsedQty = quantityStr.trim() === '' ? 0 : parseInt(quantityStr, 10) || 0;
  const currentStock = product.stock;
  const delta = mode === 'add' ? parsedQty : -parsedQty;
  const resultingStock = Math.max(0, currentStock + delta);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedQty <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }
    if (mode === 'remove' && parsedQty > currentStock) {
      setError(`No puedes restar más de ${currentStock} unidades disponibles`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await adjustStock(product.id, delta, reason);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar inventario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-pink-600 to-rose-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-pink-200" />
            <div>
              <h3 className="font-bold text-base">Ajuste Rápido de Stock</h3>
              <p className="text-pink-100 text-xs">Inventario en tiempo real</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Product brief */}
          <div className="p-3 bg-pink-50/60 rounded-xl border border-pink-100 flex items-center space-x-3">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-12 h-12 rounded-lg object-cover border border-pink-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center font-bold">
                {product.category[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 text-sm truncate">{product.name}</h4>
              <p className="text-xs text-gray-500">
                SKU: <span className="font-mono text-gray-700">{product.sku}</span>
                {product.size && ` • Talla: ${product.size}`}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-600">Stock actual:</span>
                <span className="font-bold text-gray-900 text-xs px-2 py-0.5 bg-white rounded border border-gray-200">
                  {currentStock} unidades
                </span>
              </div>
            </div>
          </div>

          {/* Mode Switch: Add vs Deduct */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('add');
                setReason('Llegada de nueva mercadería / Pedido');
              }}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'add'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus className="w-4 h-4" />
              Ingresar / Sumar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('remove');
                setReason('Ajuste por merma, muestra o venta física');
              }}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                mode === 'remove'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Minus className="w-4 h-4" />
              Descontar / Restar
            </button>
          </div>

          {/* Quantity Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Cantidad a {mode === 'add' ? 'sumar' : 'restar'}:
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantityStr((q) => Math.max(1, (parseInt(q, 10) || 1) - 1).toString())}
                className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold"
              >
                -
              </button>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={quantityStr}
                onFocus={handleSelectOnFocus}
                onChange={(e) => setQuantityStr(sanitizeNumberInput(e.target.value, false))}
                className="flex-1 text-center py-2 px-3 border border-gray-300 rounded-xl font-bold text-lg text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-pink-500"
              />
              <button
                type="button"
                onClick={() => setQuantityStr((q) => ((parseInt(q, 10) || 0) + 1).toString())}
                className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Motivo o Justificación del Movimiento:
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Llegada de pedido de USA / Miami..."
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-pink-500"
              maxLength={200}
              required
            />
          </div>

          {/* Stock Simulation Preview */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex justify-between items-center">
            <span className="text-gray-600">Stock resultante:</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 line-through">{currentStock}</span>
              <span className="font-extrabold text-sm text-pink-600">{resultingStock} unidades</span>
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Confirmar Ajuste
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
