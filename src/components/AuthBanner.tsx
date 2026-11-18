import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserCheck } from 'lucide-react';

export const AuthBanner: React.FC = () => {
  const { user, loginWithGoogle, loading } = useAuth();

  if (loading || user) return null;

  return (
    <div className="bg-gray-900 text-white px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2 text-center sm:text-left">
          <UserCheck className="w-4 h-4 text-pink-400 shrink-0" />
          <span className="text-gray-300">
            Inicia sesión con tu cuenta de Google para registrar ventas a tu nombre y gestionar clientes e inventario.
          </span>
        </div>

        <button
          onClick={loginWithGoogle}
          className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg text-xs transition-colors flex items-center gap-1.5 shrink-0"
        >
          <LogIn className="w-3.5 h-3.5 text-gray-700" />
          Iniciar Sesión
        </button>
      </div>
    </div>
  );
};
