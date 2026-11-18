import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { useData } from '../context/DataContext';
import { X, Check, User, Phone, MapPin, Mail, FileText, RefreshCw } from 'lucide-react';

interface CustomerModalProps {
  customerToEdit?: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated?: (customerId: string, name: string, phone: string) => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  customerToEdit,
  isOpen,
  onClose,
  onCustomerCreated,
}) => {
  const { addCustomer, updateCustomer } = useData();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name || '');
      setPhone(customerToEdit.phone || '');
      setEmail(customerToEdit.email || '');
      setCity(customerToEdit.city || '');
      setNotes(customerToEdit.notes || '');
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setCity('');
      setNotes('');
    }
    setError(null);
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre del cliente es obligatorio');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        city: city.trim(),
        notes: notes.trim(),
      };

      if (customerToEdit) {
        await updateCustomer(customerToEdit.id, payload);
      } else {
        const newId = await addCustomer(payload);
        if (onCustomerCreated) {
          onCustomerCreated(newId, payload.name, payload.phone);
        }
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-700 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {customerToEdit ? 'Editar Cliente' : 'Registrar Cliente'}
              </h3>
              <p className="text-xs text-gray-400">Directorio de contacto e historial</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block font-medium text-gray-700 mb-1">Nombre Completo *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Camila Morales, María José Pérez..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-hidden focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-gray-700 mb-1">WhatsApp / Celular</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. 77012345"
                  className="w-full pl-8 pr-2.5 py-2 border border-gray-200 rounded-xl focus:outline-hidden focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Ciudad</label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="La Paz, Santa Cruz..."
                  className="w-full pl-8 pr-2.5 py-2 border border-gray-200 rounded-xl focus:outline-hidden focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Correo Electrónico (Opcional)</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@ejemplo.com"
                className="w-full pl-8 pr-2.5 py-2 border border-gray-200 rounded-xl focus:outline-hidden focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Preferencias / Tallas habituales / Notas
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Talla M en vestidos, prefiere tonos nude en labiales..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-hidden focus:border-pink-500 focus:ring-1 focus:ring-pink-500 resize-none"
            />
          </div>

          {/* Action buttons */}
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
              {customerToEdit ? 'Actualizar' : 'Registrar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
