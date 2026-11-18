import React from 'react';
import { Sale } from '../types';
import { Printer, MessageCircle, X, Check } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const formatBs = (amount: number) => `Bs. ${amount.toFixed(2)}`;

  const paymentLabels: Record<string, string> = {
    cash: 'Efectivo',
    qr_transfer: 'Transferencia QR Simple',
    card: 'Tarjeta Débito/Crédito',
    tigo_money: 'Tigo Money',
    other: 'Otro',
  };

  const formattedDate = new Date(sale.createdAt).toLocaleString('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const shareViaWhatsApp = () => {
    let itemsText = '';
    sale.items.forEach((item, index) => {
      const variantInfo = [item.size, item.colorOrShade].filter(Boolean).join(' - ');
      const variantStr = variantInfo ? ` (${variantInfo})` : '';
      itemsText += `${index + 1}. *${item.productName}*${variantStr}\n   ${item.quantity} x ${formatBs(item.unitPrice)} = ${formatBs(item.subtotal)}\n`;
    });

    const message = `🛍️ *DE COMPRITAS CON PAULA*
_Personal Shopper Bolivia_
━━━━━━━━━━━━━━━━━━━━
📄 *Comprobante de Compra*
*Nº Recibo:* ${sale.receiptNumber}
*Fecha:* ${formattedDate}
*Cliente:* ${sale.customerName || 'Cliente Mostrador'}
*Atendido por:* ${sale.sellerName}
━━━━━━━━━━━━━━━━━━━━
*DETALLE DE ARTÍCULOS:*
${itemsText}
━━━━━━━━━━━━━━━━━━━━
*Subtotal:* ${formatBs(sale.subtotal)}
${sale.discount > 0 ? `*Descuento:* -${formatBs(sale.discount)}\n` : ''}*TOTAL COBRADO:* *${formatBs(sale.totalAmount)}*
*Método de Pago:* ${paymentLabels[sale.paymentMethod] || sale.paymentMethod}
${sale.paymentMethod === 'cash' && sale.amountReceived && sale.amountReceived > 0 ? `💵 *Efectivo recibido:* ${formatBs(sale.amountReceived)}\n🪙 *Cambio / Vuelto:* ${formatBs(sale.changeDue || 0)}\n` : ''}━━━━━━━━━━━━━━━━━━━━
✨ ¡Muchas gracias por tu compra!
*De Compritas con Paula*`;

    const encoded = encodeURIComponent(message);
    const phone = sale.customerPhone ? sale.customerPhone.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-gray-100 flex flex-col my-8">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">Venta Completada</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Ticket Content (Minimalist) */}
        <div id="printable-receipt" className="p-5 bg-white space-y-3.5 text-gray-800 text-xs">
          <div className="text-center pb-3 border-b border-gray-100">
            <div className="flex justify-center mb-1.5">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-11-04_at_5.17.12_PM_161c4a55.jpeg"
                alt="De Compritas con Paula"
                className="h-12 w-auto object-contain rounded-lg"
              />
            </div>
            <h2 className="font-bold text-gray-900 text-sm uppercase">
              De Compritas con Paula
            </h2>
            <p className="text-[10px] text-gray-400 tracking-wider uppercase">
              Personal Shopper Bolivia
            </p>
          </div>

          {/* Ticket Metadata */}
          <div className="grid grid-cols-2 gap-2 text-[11px] bg-gray-50 p-2.5 rounded-lg border border-gray-100">
            <div>
              <span className="text-gray-400 block text-[10px]">Recibo:</span>
              <span className="font-medium text-gray-900">{sale.receiptNumber}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Fecha:</span>
              <span className="text-gray-700">{formattedDate}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Cliente:</span>
              <span className="font-medium text-gray-800 truncate block">
                {sale.customerName || 'Cliente Mostrador'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Atendido por:</span>
              <span className="text-gray-700 truncate block">{sale.sellerName}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {sale.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-xs py-1 border-b border-gray-50">
                <div className="flex-1 pr-2">
                  <p className="font-medium text-gray-900 leading-snug">{item.productName}</p>
                  <p className="text-gray-400 text-[10px]">
                    {item.quantity} x {formatBs(item.unitPrice)}
                    {item.size && <span className="ml-1 text-gray-600">[{item.size}]</span>}
                    {item.colorOrShade && <span className="ml-1">({item.colorOrShade})</span>}
                  </p>
                </div>
                <span className="font-semibold text-gray-900">{formatBs(item.subtotal)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="pt-2 border-t border-gray-200 space-y-1 text-xs">
            <div className="flex justify-between text-gray-500 text-[11px]">
              <span>Subtotal ({sale.totalItemsCount} un.):</span>
              <span>{formatBs(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-pink-600 text-[11px]">
                <span>Descuento:</span>
                <span>-{formatBs(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-100">
              <span>TOTAL:</span>
              <span>{formatBs(sale.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-gray-500 pt-0.5">
              <span>Método:</span>
              <span className="font-medium text-gray-700">
                {paymentLabels[sale.paymentMethod] || sale.paymentMethod}
              </span>
            </div>
            {sale.paymentMethod === 'cash' && sale.amountReceived !== undefined && sale.amountReceived > 0 && (
              <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-100 space-y-0.5 text-[11px] mt-1.5">
                <div className="flex justify-between text-gray-600">
                  <span>Paga con / Recibido:</span>
                  <span className="font-semibold text-gray-900">{formatBs(sale.amountReceived)}</span>
                </div>
                <div className="flex justify-between text-emerald-900 font-bold pt-0.5 border-t border-emerald-100">
                  <span>Cambio / Vuelto:</span>
                  <span className="text-emerald-700 font-extrabold text-xs">{formatBs(sale.changeDue || 0)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-3.5 bg-gray-50 border-t border-gray-100 space-y-1.5">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={shareViaWhatsApp}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-black text-white font-medium text-xs rounded-xl transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2 bg-white hover:bg-gray-100 text-gray-700 font-medium text-xs rounded-xl border border-gray-200 transition-colors"
          >
            Nueva Venta
          </button>
        </div>
      </div>
    </div>
  );
};
