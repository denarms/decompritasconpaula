import React, { useState, useEffect } from 'react';
import { Product, ProductCategory, CATEGORIES } from '../types';
import { useData } from '../context/DataContext';
import { X, Check, RefreshCw, Package, Camera, Trash2, Link as LinkIcon } from 'lucide-react';
import { sanitizeNumberInput, handleSelectOnFocus } from '../utils/numberInput';
import { compressImageFile } from '../utils/imageUtils';

interface ProductModalProps {
  productToEdit?: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ productToEdit, isOpen, onClose }) => {
  const { addProduct, updateProduct } = useData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State - all numeric inputs use sanitized string to prevent mobile zero-locking bugs
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Ropa');
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [colorOrShade, setColorOrShade] = useState('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [salePrice, setSalePrice] = useState<string>('');
  const [stock, setStock] = useState<string>('');
  const [minStockAlert, setMinStockAlert] = useState<string>('2');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImage(true);
      setError(null);
      const compressed = await compressImageFile(file, 800, 800, 0.78);
      setImageUrl(compressed);
    } catch (err) {
      console.error('Error al procesar imagen:', err);
      setError(err instanceof Error ? err.message : 'Error al procesar la imagen seleccionada');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setSku(productToEdit.sku);
      setCategory(productToEdit.category as ProductCategory);
      setBrand(productToEdit.brand || '');
      setSize(productToEdit.size || '');
      setColorOrShade(productToEdit.colorOrShade || '');
      setCostPrice(
        productToEdit.costPrice !== undefined && productToEdit.costPrice !== null
          ? String(productToEdit.costPrice)
          : ''
      );
      setSalePrice(
        productToEdit.salePrice !== undefined && productToEdit.salePrice !== null
          ? String(productToEdit.salePrice)
          : ''
      );
      setStock(
        productToEdit.stock !== undefined && productToEdit.stock !== null
          ? String(productToEdit.stock)
          : '0'
      );
      setMinStockAlert(
        productToEdit.minStockAlert !== undefined && productToEdit.minStockAlert !== null
          ? String(productToEdit.minStockAlert)
          : '2'
      );
      setImageUrl(productToEdit.imageUrl || '');
      setDescription(productToEdit.description || '');
    } else {
      resetForm();
    }
  }, [productToEdit, isOpen]);

  const resetForm = () => {
    setName('');
    generateAutoSku('Ropa');
    setCategory('Ropa');
    setBrand('');
    setSize('');
    setColorOrShade('');
    setCostPrice('');
    setSalePrice('');
    setStock('');
    setMinStockAlert('2');
    setImageUrl('');
    setDescription('');
    setIsProcessingImage(false);
    setShowUrlInput(false);
    setError(null);
  };

  const generateAutoSku = (cat: string) => {
    const prefix = cat.substring(0, 3).toUpperCase();
    const rand = Math.floor(1000 + Math.random() * 9000);
    setSku(`${prefix}-${rand}`);
  };

  if (!isOpen) return null;

  const numCost = costPrice.trim() === '' ? 0 : parseFloat(costPrice) || 0;
  const numSale = salePrice.trim() === '' ? 0 : parseFloat(salePrice) || 0;
  const profitBs = numSale - numCost;
  const profitMarginPercent = numCost > 0 ? ((profitBs / numCost) * 100).toFixed(1) : '100.0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre del producto es obligatorio');
      return;
    }
    if (!sku.trim()) {
      setError('El código SKU es obligatorio');
      return;
    }

    const parsedCost = costPrice.trim() === '' ? 0 : parseFloat(costPrice) || 0;
    const parsedSale = salePrice.trim() === '' ? 0 : parseFloat(salePrice) || 0;
    const parsedStock = stock.trim() === '' ? 0 : parseInt(stock, 10) || 0;
    const parsedAlert = minStockAlert.trim() === '' ? 2 : parseInt(minStockAlert, 10) || 2;

    if (parsedSale <= 0) {
      setError('El precio de venta debe ser mayor a 0');
      return;
    }
    if (parsedCost < 0) {
      setError('El precio de costo no puede ser negativo');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        category,
        brand: brand.trim(),
        size: size.trim(),
        colorOrShade: colorOrShade.trim(),
        costPrice: parsedCost,
        salePrice: parsedSale,
        stock: parsedStock,
        minStockAlert: parsedAlert,
        imageUrl: imageUrl.trim(),
        description: description.trim(),
        status: 'active' as const,
      };

      if (productToEdit) {
        await updateProduct(productToEdit.id, payload);
      } else {
        await addProduct(payload);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden border border-gray-100 my-8">
        {/* Header (Minimalist) */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {productToEdit ? 'Editar Artículo' : 'Nuevo Artículo'}
              </h3>
              <p className="text-gray-400 text-xs">
                {productToEdit ? productToEdit.name : 'Ropa, cosméticos o accesorios'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[78vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-medium text-gray-700 mb-1">
                Nombre del Artículo / Prenda *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Vestido Midi Floral, Rubor Líquido, Perfume 100ml..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-hidden focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">
                Categoría *
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const newCat = e.target.value as ProductCategory;
                  setCategory(newCat);
                  if (!productToEdit) generateAutoSku(newCat);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-hidden focus:border-pink-500 bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-medium text-gray-700">Código / SKU *</label>
                <button
                  type="button"
                  onClick={() => generateAutoSku(category)}
                  className="text-[11px] text-pink-600 hover:underline"
                >
                  Auto-generar
                </button>
              </div>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="ZAR-001..."
                className="w-full px-3 py-2 font-mono border border-gray-200 rounded-xl focus:outline-hidden focus:border-pink-500 uppercase"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">
                Marca / Diseñador
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Zara, Rare Beauty, Victoria's Secret..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-hidden focus:border-pink-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Talla
                </label>
                <input
                  type="text"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="XS, S, M, 38..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-hidden focus:border-pink-500"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Color / Tono
                </label>
                <input
                  type="text"
                  value={colorOrShade}
                  onChange={(e) => setColorOrShade(e.target.value)}
                  placeholder="Rosa, Nude..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-hidden focus:border-pink-500"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-100 space-y-2.5">
            <span className="font-semibold text-gray-800 block">Precios (Bolivianos - Bs.)</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-gray-600 mb-1">Precio Costo (Bs.)</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    value={costPrice}
                    onFocus={(e) => {
                      if (e.currentTarget.value === '0') {
                        setCostPrice('');
                      } else {
                        handleSelectOnFocus(e);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && (costPrice === '0' || costPrice.length <= 1)) {
                        setCostPrice('');
                      }
                    }}
                    onBeforeInput={(e: React.FormEvent<HTMLInputElement>) => {
                      const ev = e.nativeEvent as InputEvent;
                      if (ev.inputType === 'deleteContentBackward' && (costPrice === '0' || costPrice.length <= 1)) {
                        setCostPrice('');
                      }
                    }}
                    onChange={(e) => setCostPrice(sanitizeNumberInput(e.target.value, true, true))}
                    className="w-full pl-2.5 pr-8 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-hidden focus:border-pink-500"
                  />
                  {costPrice !== '' && (
                    <button
                      type="button"
                      onClick={() => setCostPrice('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-md transition-colors"
                      title="Borrar campo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-gray-600 mb-1">Precio Venta (Bs.) *</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    value={salePrice}
                    onFocus={(e) => {
                      if (e.currentTarget.value === '0') {
                        setSalePrice('');
                      } else {
                        handleSelectOnFocus(e);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && (salePrice === '0' || salePrice.length <= 1)) {
                        setSalePrice('');
                      }
                    }}
                    onBeforeInput={(e: React.FormEvent<HTMLInputElement>) => {
                      const ev = e.nativeEvent as InputEvent;
                      if (ev.inputType === 'deleteContentBackward' && (salePrice === '0' || salePrice.length <= 1)) {
                        setSalePrice('');
                      }
                    }}
                    onChange={(e) => setSalePrice(sanitizeNumberInput(e.target.value, true, true))}
                    className="w-full pl-2.5 pr-8 py-1.5 border border-gray-200 rounded-lg bg-white font-bold text-gray-900 focus:outline-hidden focus:border-pink-500"
                  />
                  {salePrice !== '' && (
                    <button
                      type="button"
                      onClick={() => setSalePrice('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-md transition-colors"
                      title="Borrar campo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-end">
                <div className="p-2 bg-white rounded-lg border border-gray-200 text-xs">
                  <span className="text-gray-400 block text-[10px]">Margen Ganancia:</span>
                  <span className="font-bold text-emerald-700">
                    +Bs. {profitBs.toFixed(2)} ({profitMarginPercent}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-gray-700 mb-1">Stock Actual *</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="0"
                  value={stock}
                  onFocus={(e) => {
                    if (e.currentTarget.value === '0') {
                      setStock('');
                    } else {
                      handleSelectOnFocus(e);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && (stock === '0' || stock.length <= 1)) {
                      setStock('');
                    }
                  }}
                  onBeforeInput={(e: React.FormEvent<HTMLInputElement>) => {
                    const ev = e.nativeEvent as InputEvent;
                    if (ev.inputType === 'deleteContentBackward' && (stock === '0' || stock.length <= 1)) {
                      setStock('');
                    }
                  }}
                  onChange={(e) => setStock(sanitizeNumberInput(e.target.value, false, false))}
                  className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-xl focus:outline-hidden focus:border-pink-500"
                />
                {stock !== '' && (
                  <button
                    type="button"
                    onClick={() => setStock('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-md transition-colors"
                    title="Borrar campo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Alerta Stock Bajo *</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="2"
                  value={minStockAlert}
                  onFocus={(e) => {
                    if (e.currentTarget.value === '0') {
                      setMinStockAlert('');
                    } else {
                      handleSelectOnFocus(e);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && (minStockAlert === '0' || minStockAlert.length <= 1)) {
                      setMinStockAlert('');
                    }
                  }}
                  onBeforeInput={(e: React.FormEvent<HTMLInputElement>) => {
                    const ev = e.nativeEvent as InputEvent;
                    if (ev.inputType === 'deleteContentBackward' && (minStockAlert === '0' || minStockAlert.length <= 1)) {
                      setMinStockAlert('');
                    }
                  }}
                  onChange={(e) => setMinStockAlert(sanitizeNumberInput(e.target.value, false, false))}
                  className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-xl focus:outline-hidden focus:border-pink-500"
                />
                {minStockAlert !== '' && (
                  <button
                    type="button"
                    onClick={() => setMinStockAlert('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-md transition-colors"
                    title="Borrar campo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Foto o Imagen del Producto */}
          <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-gray-800 text-xs flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-pink-600" />
                Foto del Producto
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 hover:underline"
                >
                  <Trash2 className="w-3 h-3" />
                  Quitar foto
                </button>
              )}
            </div>

            {/* Hidden native file input for camera / gallery */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {imageUrl ? (
              <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-pink-200">
                <img
                  src={imageUrl}
                  alt="Vista previa del artículo"
                  className="w-16 h-16 object-cover rounded-lg border border-pink-200 shadow-xs shrink-0 bg-gray-50"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Foto lista para guardar
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    Se guardará en el catálogo del producto
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingImage}
                      className="text-[11px] font-semibold text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 px-2.5 py-1 rounded-md border border-pink-200 transition-colors"
                    >
                      Cambiar foto
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-[11px] font-medium text-gray-500 hover:text-gray-700"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Botón principal: Cámara o Galería */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingImage}
                  className="w-full py-3 px-4 bg-white hover:bg-pink-50/50 border-2 border-dashed border-pink-300 hover:border-pink-500 rounded-xl flex flex-col items-center justify-center gap-1 text-center transition-all group active:scale-98"
                >
                  {isProcessingImage ? (
                    <div className="flex items-center gap-2 text-pink-600 py-1">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="font-semibold text-xs">Optimizando y preparando foto...</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Camera className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-gray-800 text-xs">
                        📷 Tomar foto o elegir de Galería
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Toca aquí para usar la cámara de tu celular o tus archivos
                      </span>
                    </>
                  )}
                </button>

                {/* Alternativa: Link web */}
                <div className="pt-1 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-[11px] text-gray-500 hover:text-pink-600 flex items-center gap-1"
                  >
                    <LinkIcon className="w-3 h-3" />
                    {showUrlInput ? 'Ocultar enlace web' : 'Pegar enlace de imagen (URL)'}
                  </button>
                </div>

                {showUrlInput && (
                  <div className="pt-1 animate-in fade-in duration-100">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://ejemplo.com/foto-del-articulo.jpg"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs focus:outline-hidden focus:border-pink-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">Descripción / Notas</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles de la prenda o cosmético..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-hidden focus:border-pink-500 resize-none text-xs"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {productToEdit ? 'Guardar Cambios' : 'Registrar Artículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
