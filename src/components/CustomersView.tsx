import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Customer } from '../types';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  Mail,
  Edit2,
  Trash2,
  MessageCircle,
  ShoppingBag,
  Calendar,
} from 'lucide-react';
import { CustomerModal } from './CustomerModal';
import { ConfirmModal } from './ConfirmModal';

export const CustomersView: React.FC = () => {
  const { customers, deleteCustomer } = useData();
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerToEdit, setSelectedCustomerToEdit] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deletingCustId, setDeletingCustId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      const matchName = c.name.toLowerCase().includes(q);
      const matchPhone = c.phone && c.phone.includes(q);
      const matchCity = c.city && c.city.toLowerCase().includes(q);
      return matchName || matchPhone || matchCity;
    });
  }, [customers, searchTerm]);

  const handleDelete = (cust: Customer) => {
    setCustomerToDelete(cust);
  };

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      setDeletingCustId(customerToDelete.id);
      await deleteCustomer(customerToDelete.id);
      setFeedback({ type: 'success', text: `Cliente "${customerToDelete.name}" eliminado correctamente.` });
      setCustomerToDelete(null);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      console.error("Error al eliminar cliente:", err);
      setFeedback({ type: 'error', text: 'No se pudo eliminar el cliente. Intenta nuevamente.' });
    } finally {
      setDeletingCustId(null);
    }
  };

  const openWhatsApp = (phone?: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
      'Hola! Te escribimos de De Compritas con Paula 🛍️'
    )}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-gray-50/40 p-4 md:p-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
            Directorio de Clientes
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            Registro de clientes habituales, compras acumuladas y contacto directo por WhatsApp
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar cliente por nombre, ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:border-pink-500 shadow-2xs"
            />
          </div>

          <button
            onClick={() => {
              setSelectedCustomerToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-3.5 py-2 bg-pink-600 hover:bg-pink-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar Cliente</span>
          </button>
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

      {/* Directory Table / Grid */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <Users className="w-10 h-10 text-pink-300 stroke-[1.2] mb-2" />
            <p className="font-medium text-gray-700 text-sm">No hay clientes registrados</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              Registra clientes para agilizar sus compras en el Punto de Venta y enviarles comprobantes a su WhatsApp.
            </p>
            <button
              onClick={() => {
                setSelectedCustomerToEdit(null);
                setIsModalOpen(true);
              }}
              className="mt-3 px-3 py-1.5 bg-pink-50 text-pink-700 font-medium text-xs rounded-lg border border-pink-200 hover:bg-pink-100 transition-colors"
            >
              + Añadir el primer cliente
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100 text-[11px]">
                <tr>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-3">Contacto & WhatsApp</th>
                  <th className="py-3 px-3">Ciudad</th>
                  <th className="py-3 px-3">Preferencias / Tallas</th>
                  <th className="py-3 px-3 text-center">Compras Realizadas</th>
                  <th className="py-3 px-3 text-right">Total Acumulado</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.map((cust) => {
                  return (
                    <tr key={cust.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-pink-50 text-pink-700 font-bold flex items-center justify-center text-xs">
                            {cust.name[0]?.toUpperCase() || 'C'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-xs">{cust.name}</p>
                            {cust.email && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3" />
                                {cust.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-3">
                        {cust.phone ? (
                          <button
                            onClick={() => openWhatsApp(cust.phone)}
                            className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-medium hover:underline"
                            title="Abrir chat de WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{cust.phone}</span>
                          </button>
                        ) : (
                          <span className="text-gray-400">Sin teléfono</span>
                        )}
                      </td>

                      {/* City */}
                      <td className="py-3 px-3 text-gray-600">
                        {cust.city ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {cust.city}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Notes / Preferences */}
                      <td className="py-3 px-3 text-gray-600 max-w-xs">
                        <p className="truncate text-[11px] text-gray-500">
                          {cust.notes || '-'}
                        </p>
                      </td>

                      {/* Purchases count */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold text-[11px]">
                          {cust.totalPurchasesCount || 0}
                        </span>
                      </td>

                      {/* Total spent */}
                      <td className="py-3 px-3 text-right font-semibold text-gray-900">
                        Bs. {(cust.totalSpent || 0).toFixed(2)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedCustomerToEdit(cust);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-pink-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Editar datos de cliente"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(cust)}
                            disabled={deletingCustId === cust.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                            title="Eliminar cliente"
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
        )}
      </div>

      {/* Customer Modal */}
      {isModalOpen && (
        <CustomerModal
          isOpen={isModalOpen}
          customerToEdit={selectedCustomerToEdit}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCustomerToEdit(null);
          }}
        />
      )}

      {/* In-App Confirmation Modal: Delete Customer */}
      <ConfirmModal
        isOpen={Boolean(customerToDelete)}
        title="¿Eliminar cliente del directorio?"
        description={`¿Estás segura de eliminar a "${customerToDelete?.name}"? Esta acción borrará sus datos de contacto e historial del directorio.`}
        confirmText="Eliminar Cliente"
        cancelText="Conservar"
        isDanger={true}
        isLoading={deletingCustId === customerToDelete?.id}
        onConfirm={confirmDeleteCustomer}
        onClose={() => setCustomerToDelete(null)}
      />
    </div>
  );
};
