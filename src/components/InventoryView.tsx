import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Product, CATEGORIES } from '../types';
import {
  Search,
  Plus,
  Package,
  Edit2,
  Trash2,
  FileDown,
  RefreshCw,
} from 'lucide-react';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { ProductModal } from './ProductModal';
import { ConfirmModal } from './ConfirmModal';
import { generateProductCatalogPdf } from '../utils/catalogPdf';

export const InventoryView: React.FC = () => {
  const { products, deleteProduct } = useData();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'normal' | 'low' | 'out'>('all');

  // Modals state
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Compute Inventory Financial KPIs
  const inventoryStats = useMemo(() => {
    let totalItemsCount = 0;
    let totalCostVal = 0;
    let totalSaleVal = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      if (p.status === 'archived') return;
      totalItemsCount += p.stock;
      totalCostVal += (p.costPrice || 0) * p.stock;
      totalSaleVal += p.salePrice * p.stock;

      if (p.stock <= 0) {
        outOfStockCount++;
      } else if (p.stock <= p.minStockAlert) {
        lowStockCount++;
      }
    });

    const potentialProfit = totalSaleVal - totalCostVal;

    return {
      totalProductsCount: products.filter((p) => p.status !== 'archived').length,
      totalItemsCount,
      totalCostVal,
      totalSaleVal,
      potentialProfit,
      lowStockCount,
      outOfStockCount,
    };
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status === 'archived') return false;

      if (categoryFilter !== 'Todos' && p.category !== categoryFilter) return false;

      if (stockStatusFilter === 'normal' && (p.stock <= p.minStockAlert || p.stock <= 0)) return false;
      if (stockStatusFilter === 'low' && (p.stock > p.minStockAlert || p.stock <= 0)) return false;
      if (stockStatusFilter === 'out' && p.stock > 0) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matches =
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          (p.brand && p.brand.toLowerCase().includes(query)) ||
          (p.size && p.size.toLowerCase().includes(query)) ||
          (p.colorOrShade && p.colorOrShade.toLowerCase().includes(query));
        if (!matches) return false;
      }

      return true;
    });
  }, [products, categoryFilter, stockStatusFilter, searchTerm]);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDelete = (prod: Product) => {
    setProductToDelete(prod);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      setDeletingId(productToDelete.id);
      await deleteProduct(productToDelete.id);
      setFeedback({ type: 'success', text: `Artículo "${productToDelete.name}" eliminado correctamente del inventario.` });
      setProductToDelete(null);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      console.error("Error al eliminar producto:", err);
      setFeedback({ type: 'error', text: 'No se pudo eliminar el artículo. Por favor verifica tu conexión e intenta de nuevo.' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadCatalogPdf = async () => {
    if (filteredProducts.length === 0 || isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      await generateProductCatalogPdf({
        products: filteredProducts,
        categoryLabel: categoryFilter,
      });
      setFeedback({
        type: 'success',
        text: `Catálogo PDF descargado (${filteredProducts.length} ${filteredProducts.length === 1 ? 'artículo' : 'artículos'}, sin cantidades de stock).`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error('Error al generar catálogo PDF:', err);
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo generar el catálogo en PDF.',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-gray-50/40 p-4 md:p-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
            Inventario & Stock
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            Control de existencias, precios de costo/venta y reposición
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadCatalogPdf}
            disabled={filteredProducts.length === 0 || isGeneratingPdf}
            className="px-3.5 py-2 bg-gray-900 hover:bg-black text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Descargar catálogo de productos en PDF (sin mostrar stock)"
          >
            {isGeneratingPdf ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-pink-300" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-pink-300" />
            )}
            <span>{isGeneratingPdf ? 'Generando PDF...' : 'Descargar Catálogo PDF'}</span>
          </button>

          <button
            onClick={() => {
              setProductToEdit(null);
              setIsProductModalOpen(true);
            }}
            className="px-3.5 py-2 bg-pink-600 hover:bg-pink-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Artículo</span>
          </button>
        </div>
      </div>

      {/* In-App Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-2xs animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold px-2 py-0.5 rounded hover:bg-black/5"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Financial Cards (Minimalist) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-400 block">Artículos en Catálogo</span>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {inventoryStats.totalProductsCount}
          </p>
          <span className="text-[11px] text-gray-500 block mt-0.5">
            {inventoryStats.totalItemsCount} unidades físicas
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-400 block">Valor al Costo</span>
          <p className="text-xl font-bold text-gray-900 mt-1">
            Bs. {inventoryStats.totalCostVal.toFixed(2)}
          </p>
          <span className="text-[11px] text-gray-500 block mt-0.5">Capital invertido</span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-400 block">Valor Comercial</span>
          <p className="text-xl font-bold text-gray-900 mt-1">
            Bs. {inventoryStats.totalSaleVal.toFixed(2)}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium block mt-0.5">
            +Bs. {inventoryStats.potentialProfit.toFixed(2)} margen est.
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-400 block">Alertas de Stock</span>
          <p className="text-xl font-bold text-rose-600 mt-1">
            {inventoryStats.lowStockCount + inventoryStats.outOfStockCount}
          </p>
          <span className="text-[11px] text-gray-500 block mt-0.5">
            {inventoryStats.outOfStockCount} agotados • {inventoryStats.lowStockCount} bajos
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU, marca, talla, tono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-pink-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-pink-500"
            >
              <option value="Todos">Todas las Categorías</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={stockStatusFilter}
              onChange={(e) =>
                setStockStatusFilter(e.target.value as 'all' | 'normal' | 'low' | 'out')
              }
              className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-pink-500"
            >
              <option value="all">Todo el Stock</option>
              <option value="normal">Stock Normal</option>
              <option value="low">Stock Bajo</option>
              <option value="out">Agotados (0)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table (Desktop) / Cards (Mobile) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <Package className="w-10 h-10 text-gray-300 stroke-[1.2] mb-2" />
            <p className="font-medium text-gray-700 text-sm">No hay artículos que coincidan</p>
            <p className="text-xs text-gray-400 mt-0.5">Modifica los filtros o registra un nuevo artículo.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/70 text-gray-600 font-semibold border-b border-gray-100 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Artículo</th>
                    <th className="py-2.5 px-3">Categoría / Marca</th>
                    <th className="py-2.5 px-3">Talla / Tono</th>
                    <th className="py-2.5 px-3 text-right">Costo</th>
                    <th className="py-2.5 px-3 text-right">P. Venta</th>
                    <th className="py-2.5 px-3 text-right">Margen</th>
                    <th className="py-2.5 px-3 text-center">Stock</th>
                    <th className="py-2.5 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map((prod) => {
                    const isOutOfStock = prod.stock <= 0;
                    const isLowStock = !isOutOfStock && prod.stock <= prod.minStockAlert;
                    const profit = prod.salePrice - (prod.costPrice || 0);
                    const margin =
                      prod.costPrice > 0 ? ((profit / prod.costPrice) * 100).toFixed(0) : '100';

                    return (
                      <tr
                        key={prod.id}
                        className={`hover:bg-gray-50/40 transition-colors ${
                          isOutOfStock ? 'bg-red-50/20' : isLowStock ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2.5">
                            {prod.imageUrl ? (
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="w-9 h-9 rounded-lg object-cover border border-gray-200"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 font-semibold flex items-center justify-center text-xs">
                                {prod.category[0]}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-900 text-xs leading-snug">
                                {prod.name}
                              </p>
                              <span className="font-mono text-[10px] text-gray-400">
                                {prod.sku}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-medium text-gray-800 block">{prod.category}</span>
                          <span className="text-[11px] text-gray-400">{prod.brand || '-'}</span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-0.5 text-[11px]">
                            {prod.size && (
                              <span className="font-medium text-gray-700">Talla: {prod.size}</span>
                            )}
                            {prod.colorOrShade && (
                              <span className="text-gray-500 truncate max-w-[120px]">
                                {prod.colorOrShade}
                              </span>
                            )}
                            {!prod.size && !prod.colorOrShade && (
                              <span className="text-gray-400 text-[10px]">-</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right text-gray-500">
                          Bs. {(prod.costPrice || 0).toFixed(2)}
                        </td>

                        <td className="py-3 px-3 text-right font-bold text-gray-900">
                          Bs. {prod.salePrice.toFixed(2)}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
                            +{margin}%
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          {isOutOfStock ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700">
                              0 (Agotado)
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">
                              {prod.stock} (Bajo)
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                              {prod.stock} un.
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedProductForStock(prod)}
                              className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-[11px] border border-gray-200 transition-colors"
                              title="Ajustar existencias"
                            >
                              ± Stock
                            </button>
                            <button
                              onClick={() => {
                                setProductToEdit(prod);
                                setIsProductModalOpen(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-pink-600 rounded-lg hover:bg-gray-50 transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(prod)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredProducts.map((prod) => {
                const isOutOfStock = prod.stock <= 0;
                const isLowStock = !isOutOfStock && prod.stock <= prod.minStockAlert;

                return (
                  <div key={prod.id} className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 font-semibold flex items-center justify-center text-xs">
                            {prod.category[0]}
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-gray-900 text-xs">{prod.name}</h4>
                          <p className="text-[11px] text-gray-400">{prod.category} • SKU: {prod.sku}</p>
                        </div>
                      </div>

                      <span className="font-bold text-xs text-gray-900">
                        Bs. {prod.salePrice.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                      <div>
                        {isOutOfStock ? (
                          <span className="text-red-600 font-medium text-[11px]">Agotado (0)</span>
                        ) : isLowStock ? (
                          <span className="text-amber-600 font-medium text-[11px]">Bajo ({prod.stock} un.)</span>
                        ) : (
                          <span className="text-gray-600 text-[11px]">Stock: {prod.stock} un.</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedProductForStock(prod)}
                          className="px-2 py-0.5 bg-gray-50 text-gray-700 rounded text-xs border border-gray-200"
                        >
                          ± Stock
                        </button>
                        <button
                          onClick={() => {
                            setProductToEdit(prod);
                            setIsProductModalOpen(true);
                          }}
                          className="p-1 text-gray-400"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(prod)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Stock Adjustment Dialog */}
      {selectedProductForStock && (
        <StockAdjustmentModal
          product={selectedProductForStock}
          onClose={() => setSelectedProductForStock(null)}
        />
      )}

      {/* Create / Edit Product Modal */}
      {isProductModalOpen && (
        <ProductModal
          isOpen={isProductModalOpen}
          productToEdit={productToEdit}
          onClose={() => {
            setIsProductModalOpen(false);
            setProductToEdit(null);
          }}
        />
      )}

      {/* In-App Confirmation Modal: Delete Product */}
      <ConfirmModal
        isOpen={Boolean(productToDelete)}
        title="¿Eliminar artículo del inventario?"
        description={`¿Estás segura de eliminar permanentemente "${productToDelete?.name}" (SKU: ${productToDelete?.sku})? Esta acción borrará el registro del catálogo.`}
        confirmText="Eliminar Artículo"
        cancelText="Conservar"
        isDanger={true}
        isLoading={deletingId === productToDelete?.id}
        onConfirm={confirmDeleteProduct}
        onClose={() => setProductToDelete(null)}
      />
    </div>
  );
};
