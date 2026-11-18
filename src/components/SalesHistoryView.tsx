import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Sale } from '../types';
import {
  Search,
  Receipt,
  Printer,
  MessageCircle,
  Calendar,
  CreditCard,
  User,
  ShoppingBag,
  Eye,
  Trash2,
} from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';
import { ConfirmModal } from './ConfirmModal';

export const SalesHistoryView: React.FC = () => {
  const { isAdmin } = useAuth();
  const { sales, deleteSale } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDeleteSale = (sale: Sale) => {
    setSaleToDelete(sale);
  };

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;
    try {
      setDeletingSaleId(saleToDelete.id);
      await deleteSale(saleToDelete.id);
      setFeedback({ type: 'success', text: `Ticket "${saleToDelete.receiptNumber}" anulado y eliminado con éxito.` });
      setSaleToDelete(null);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      console.error("Error al anular venta:", err);
      setFeedback({ type: 'error', text: 'No se pudo eliminar el ticket. Por favor verifica tu conexión.' });
    } finally {
      setDeletingSaleId(null);
    }
  };

  const paymentLabels: Record<string, string> = {
    qr_transfer: 'QR Simple',
    cash: 'Efectivo',
    card: 'Tarjeta',
    tigo_money: 'Tigo Money',
    other: 'Otro',
  };

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const query = searchTerm.toLowerCase().trim();
      if (!query) return true;

      const matchesReceipt = s.receiptNumber.toLowerCase().includes(query);
      const matchesClient = s.customerName && s.customerName.toLowerCase().includes(query);
      const matchesSeller = s.sellerName && s.sellerName.toLowerCase().includes(query);
      const matchesProduct = s.items.some((item) =>
        item.productName.toLowerCase().includes(query)
      );

      return matchesReceipt || matchesClient || matchesSeller || matchesProduct;
    });
  }, [sales, searchTerm]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-gray-50/50 p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            Registro de Ventas & Tickets
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            Consulta el historial completo de comprobantes emitidos, clientes y detalles
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ticket, cliente o prenda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-2xs ${
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

      {/* Sales List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {filteredSales.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <Receipt className="w-12 h-12 text-pink-300 stroke-[1.2] mb-2" />
            <p className="font-semibold text-gray-700 text-sm">No se encontraron ventas</p>
            <p className="text-xs text-gray-500 mt-1">
              Las transacciones registradas desde el Punto de Venta aparecerán aquí en tiempo real.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredSales.map((sale) => {
              const formattedDate = new Date(sale.createdAt).toLocaleString('es-BO', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              return (
                <div
                  key={sale.id}
                  className="p-4 hover:bg-pink-50/20 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  {/* Left: Info */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-gray-900 bg-pink-50 text-pink-700 px-2 py-0.5 rounded-md border border-pink-200">
                        {sale.receiptNumber}
                      </span>
                      <span className="text-gray-500">{formattedDate}</span>
                      <span className="px-2 py-0.5 rounded-full font-semibold text-[11px] bg-gray-100 text-gray-700">
                        {paymentLabels[sale.paymentMethod] || sale.paymentMethod}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-gray-700">
                      <span className="flex items-center gap-1 font-semibold">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        Cliente: {sale.customerName || 'Cliente Mostrador'}
                      </span>
                      {sale.customerPhone && (
                        <span className="text-gray-500 text-[11px]">({sale.customerPhone})</span>
                      )}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-pink-50/70 text-gray-800 text-[11px] font-medium border border-pink-200/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-600"></span>
                        <span>Atendido por:</span>
                        <strong className="text-gray-900">{sale.sellerName || 'Personal'}</strong>
                        {sale.sellerRole && (
                          <span className="text-[10px] text-pink-700 font-semibold">
                            [{sale.sellerRole === 'admin' ? 'Administrador' : 'Cajero/a'}]
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Items chips */}
                    <p className="text-[11px] text-gray-500 line-clamp-1">
                      {sale.items.map((it) => `${it.quantity}x ${it.productName}`).join(' • ')}
                    </p>
                  </div>

                  {/* Right: Amounts & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                    <div className="text-left md:text-right">
                      <span className="text-gray-500 text-[11px] block">
                        {sale.totalItemsCount} prendas
                      </span>
                      <span className="font-extrabold text-base text-pink-700">
                        Bs. {sale.totalAmount.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="px-3 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold rounded-xl border border-pink-200 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                        title="Ver Comprobante"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Comprobante</span>
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteSale(sale)}
                          disabled={deletingSaleId === sale.id}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-gray-200 transition-colors shadow-2xs disabled:opacity-40 cursor-pointer"
                          title="Anular y eliminar comprobante"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for viewing/re-printing receipt */}
      {selectedSale && (
        <ReceiptModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}

      {/* In-App Confirmation Modal: Delete Sale */}
      <ConfirmModal
        isOpen={Boolean(saleToDelete)}
        title="¿Anular y eliminar comprobante de venta?"
        description={`¿Deseas anular y eliminar permanentemente el ticket "${saleToDelete?.receiptNumber}" por un total de Bs. ${saleToDelete?.totalAmount.toFixed(2)}?`}
        confirmText="Anular Ticket"
        cancelText="Conservar"
        isDanger={true}
        isLoading={deletingSaleId === saleToDelete?.id}
        onConfirm={confirmDeleteSale}
        onClose={() => setSaleToDelete(null)}
      />
    </div>
  );
};
