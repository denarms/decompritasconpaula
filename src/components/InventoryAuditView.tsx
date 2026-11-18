import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { InventoryLog } from '../types';
import {
  History,
  TrendingDown,
  TrendingUp,
  PackageCheck,
  Search,
  Filter,
} from 'lucide-react';

export const InventoryAuditView: React.FC = () => {
  const { inventoryLogs } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredLogs = inventoryLogs.filter((log) => {
    if (filterType !== 'all' && log.changeType !== filterType) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = log.productName.toLowerCase().includes(q);
      const matchReason = log.reason && log.reason.toLowerCase().includes(q);
      const matchUser = log.performedBy && log.performedBy.toLowerCase().includes(q);
      return matchName || matchReason || matchUser;
    }

    return true;
  });

  const changeTypeBadge = (type: string, delta: number) => {
    switch (type) {
      case 'sale':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <TrendingDown className="w-3 h-3" />
            Venta ({delta})
          </span>
        );
      case 'restock':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <TrendingUp className="w-3 h-3" />
            Ingreso (+{delta})
          </span>
        );
      case 'initial':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <PackageCheck className="w-3 h-3" />
            Inicial (+{delta})
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            Ajuste ({delta > 0 ? `+${delta}` : delta})
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-gray-50/50 p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            Auditoría de Movimientos de Stock
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            Trazabilidad en tiempo real de cada entrada, salida y venta de artículos
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar producto o ticket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-pink-500 shadow-2xs"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-pink-500 shadow-2xs"
          >
            <option value="all">Todos los Tipos</option>
            <option value="sale">Ventas</option>
            <option value="restock">Reabastecimiento</option>
            <option value="adjustment">Ajustes Manuales</option>
            <option value="initial">Cargas Iniciales</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <History className="w-12 h-12 text-pink-300 stroke-[1.2] mb-2" />
            <p className="font-semibold text-gray-700 text-sm">No hay registros de auditoría</p>
            <p className="text-xs text-gray-500 mt-1">
              Las ventas y modificaciones de stock generarán bitácoras automáticas aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-pink-50/60 text-gray-700 uppercase font-bold border-b border-pink-100 text-[11px]">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Artículo</th>
                  <th className="py-3 px-3">Tipo de Movimiento</th>
                  <th className="py-3 px-3 text-center">Previo</th>
                  <th className="py-3 px-3 text-center">Variación</th>
                  <th className="py-3 px-3 text-center">Resultante</th>
                  <th className="py-3 px-4">Motivo / Operador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => {
                  const dateStr = new Date(log.createdAt).toLocaleString('es-BO', {
                    dateStyle: 'short',
                    timeStyle: 'medium',
                  });

                  return (
                    <tr key={log.id} className="hover:bg-pink-50/20 transition-colors">
                      <td className="py-3 px-4 text-gray-500 font-mono text-[11px] whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900">{log.productName}</td>
                      <td className="py-3 px-3">{changeTypeBadge(log.changeType, log.quantityDelta)}</td>
                      <td className="py-3 px-3 text-center text-gray-500">{log.previousStock}</td>
                      <td className="py-3 px-3 text-center font-bold">
                        <span
                          className={log.quantityDelta > 0 ? 'text-emerald-600' : 'text-rose-600'}
                        >
                          {log.quantityDelta > 0 ? `+${log.quantityDelta}` : log.quantityDelta}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-extrabold text-gray-900 bg-gray-50/60 rounded">
                        {log.newStock}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-800 font-medium leading-snug">{log.reason || '-'}</p>
                        <p className="text-[10px] text-gray-400">Por: {log.performedBy || 'Sistema'}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
