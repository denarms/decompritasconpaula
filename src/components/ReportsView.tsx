import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Download, Printer, Calendar } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { sales } = useData();
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('month');

  // Filter sales by date
  const filteredSales = useMemo(() => {
    const now = new Date();

    return sales.filter((s) => {
      const saleDate = new Date(s.createdAt);

      if (dateRange === 'today') {
        return saleDate.toDateString() === now.toDateString();
      }
      if (dateRange === 'yesterday') {
        const yest = new Date();
        yest.setDate(now.getDate() - 1);
        return saleDate.toDateString() === yest.toDateString();
      }
      if (dateRange === 'week') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return saleDate >= sevenDaysAgo;
      }
      if (dateRange === 'month') {
        return (
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  }, [sales, dateRange]);

  // Aggregate metrics
  const analytics = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalItemsSold = 0;
    let totalDiscounts = 0;

    const categoryMap: Record<string, { count: number; revenue: number }> = {};
    const paymentMap: Record<string, { count: number; total: number }> = {};
    const productSalesMap: Record<string, { name: string; category: string; quantity: number; revenue: number }> = {};

    filteredSales.forEach((sale) => {
      totalRevenue += sale.totalAmount;
      totalCost += sale.totalCost || 0;
      totalItemsSold += sale.totalItemsCount;
      totalDiscounts += sale.discount || 0;

      const method = sale.paymentMethod || 'other';
      if (!paymentMap[method]) {
        paymentMap[method] = { count: 0, total: 0 };
      }
      paymentMap[method].count += 1;
      paymentMap[method].total += sale.totalAmount;

      sale.items.forEach((item) => {
        const cat = item.category || 'Otros';
        if (!categoryMap[cat]) {
          categoryMap[cat] = { count: 0, revenue: 0 };
        }
        categoryMap[cat].count += item.quantity;
        categoryMap[cat].revenue += item.subtotal;

        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = {
            name: item.productName,
            category: item.category,
            quantity: 0,
            revenue: 0,
          };
        }
        productSalesMap[item.productId].quantity += item.quantity;
        productSalesMap[item.productId].revenue += item.subtotal;
      });
    });

    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalCost > 0 ? (grossProfit / totalCost) * 100 : 100;
    const averageTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      profitMargin,
      totalItemsSold,
      totalDiscounts,
      salesCount: filteredSales.length,
      averageTicket,
      categoryStats: Object.entries(categoryMap).sort((a, b) => b[1].revenue - a[1].revenue),
      paymentStats: Object.entries(paymentMap).sort((a, b) => b[1].total - a[1].total),
      topProducts,
    };
  }, [filteredSales]);

  const paymentLabels: Record<string, string> = {
    qr_transfer: 'QR Simple',
    cash: 'Efectivo',
    card: 'Tarjeta',
    tigo_money: 'Tigo Money',
    other: 'Otro',
  };

  const handleExportCSV = () => {
    if (filteredSales.length === 0) return;

    const headers = [
      'Nro Ticket',
      'Fecha',
      'Cliente',
      'Prendas/Items',
      'Subtotal (Bs)',
      'Descuento (Bs)',
      'Total Cobrado (Bs)',
      'Costo Total (Bs)',
      'Metodo de Pago',
      'Vendedora',
    ];

    const rows = filteredSales.map((s) => [
      `"${s.receiptNumber}"`,
      `"${new Date(s.createdAt).toLocaleString('es-BO')}"`,
      `"${s.customerName || 'Cliente Mostrador'}"`,
      s.totalItemsCount,
      s.subtotal.toFixed(2),
      s.discount.toFixed(2),
      s.totalAmount.toFixed(2),
      (s.totalCost || 0).toFixed(2),
      `"${paymentLabels[s.paymentMethod] || s.paymentMethod}"`,
      `"${s.sellerName}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_ventas_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-gray-50/40 p-4 md:p-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
            Reportes & Balances
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            Ingresos, costos, ticket promedio y artículos más vendidos
          </p>
        </div>

        {/* Date Filter & Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 text-xs shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-gray-400 ml-1.5 mr-1" />
            {(
              [
                { id: 'today', label: 'Hoy' },
                { id: 'yesterday', label: 'Ayer' },
                { id: 'week', label: '7 Días' },
                { id: 'month', label: 'Este Mes' },
                { id: 'all', label: 'Todo' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setDateRange(item.id)}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  dateRange === item.id
                    ? 'bg-gray-900 text-white font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            disabled={filteredSales.length === 0}
            className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 font-medium text-xs rounded-lg border border-gray-200 transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            Exportar CSV
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 font-medium text-xs rounded-lg border border-gray-200 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-gray-500" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-400 block">Total Ventas</span>
          <p className="text-xl font-bold text-gray-900 mt-1">
            Bs. {analytics.totalRevenue.toFixed(2)}
          </p>
          <span className="text-[11px] text-gray-500 block mt-0.5">
            {analytics.salesCount} tickets emitidos
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-400 block">Ganancia Bruta</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            +Bs. {analytics.grossProfit.toFixed(2)}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium block mt-0.5">
            Margen: ~{analytics.profitMargin.toFixed(1)}%
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-400 block">Artículos Vendidos</span>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {analytics.totalItemsSold} un.
          </p>
          <span className="text-[11px] text-gray-500 block mt-0.5">
            Ticket promedio: Bs. {analytics.averageTicket.toFixed(2)}
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-400 block">Costo Mercancía</span>
          <p className="text-xl font-bold text-gray-900 mt-1">
            Bs. {analytics.totalCost.toFixed(2)}
          </p>
          <span className="text-[11px] text-gray-500 block mt-0.5">
            Descuentos: Bs. {analytics.totalDiscounts.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Visual Breakdown: Category & Payment Method */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales by Category */}
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-xs">Ventas por Categoría</h3>
            <span className="text-[11px] text-gray-400">Distribución</span>
          </div>

          {analytics.categoryStats.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">
              No hay ventas registradas en este período.
            </p>
          ) : (
            <div className="space-y-2.5">
              {analytics.categoryStats.map(([cat, stat]) => {
                const percent =
                  analytics.totalRevenue > 0
                    ? ((stat.revenue / analytics.totalRevenue) * 100).toFixed(1)
                    : '0';

                return (
                  <div key={cat} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-gray-700">{cat}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-[11px]">{stat.count} un.</span>
                        <span className="font-medium text-gray-900">
                          Bs. {stat.revenue.toFixed(2)}
                        </span>
                        <span className="text-gray-500 text-[11px] min-w-[35px] text-right">
                          {percent}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gray-800 h-1.5 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sales by Payment Method */}
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-xs">Métodos de Cobro</h3>
            <span className="text-[11px] text-gray-400">Canales</span>
          </div>

          {analytics.paymentStats.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">
              No hay ventas registradas en este período.
            </p>
          ) : (
            <div className="space-y-2.5">
              {analytics.paymentStats.map(([method, stat]) => {
                const percent =
                  analytics.totalRevenue > 0
                    ? ((stat.total / analytics.totalRevenue) * 100).toFixed(1)
                    : '0';

                return (
                  <div key={method} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">
                        {paymentLabels[method] || method}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-[11px]">{stat.count} pagos</span>
                        <span className="font-medium text-gray-900">
                          Bs. {stat.total.toFixed(2)}
                        </span>
                        <span className="text-gray-500 text-[11px] min-w-[35px] text-right">
                          {percent}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-pink-600 h-1.5 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top 5 Articles */}
      <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2.5">
        <h3 className="font-semibold text-gray-900 text-xs">
          Artículos Más Vendidos
        </h3>

        {analytics.topProducts.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            Aún no hay ventas registradas para este período.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {analytics.topProducts.map((prod, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-gray-50 rounded-lg flex items-center justify-between text-xs"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-medium text-gray-900 truncate">{prod.name}</p>
                  <span className="text-[10px] text-gray-400">{prod.category}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-semibold text-gray-900 block">
                    {prod.quantity} vendidas
                  </span>
                  <span className="text-[10px] text-gray-500">
                    Bs. {prod.revenue.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
