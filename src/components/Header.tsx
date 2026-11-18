import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Receipt,
  History,
  Bell,
  LogOut,
  LogIn,
} from 'lucide-react';

export type ActiveTab = 'pos' | 'inventory' | 'customers' | 'reports' | 'sales' | 'audit';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenAlerts: () => void;
  onOpenUsersModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenAlerts,
  onOpenUsersModal,
}) => {
  const { user, profile, isAdmin, canSwitchRole, isLoggingIn, loginWithGoogle, logout, switchActiveRole } = useAuth();
  const { alertCount } = useData();

  const accountName =
    profile?.username?.trim() ||
    profile?.displayName?.trim() ||
    user?.displayName?.trim() ||
    user?.email?.split('@')[0] ||
    'Usuario';

  // Cashier role can only view and edit in Ventas (POS & Tickets) and Clientes
  const allNavItems = [
    { id: 'pos' as const, label: 'Ventas (POS)', icon: ShoppingCart },
    { id: 'inventory' as const, label: 'Inventario', icon: Package, adminOnly: true },
    { id: 'customers' as const, label: 'Clientes', icon: Users },
    { id: 'reports' as const, label: 'Reportes', icon: BarChart3, adminOnly: true },
    { id: 'sales' as const, label: 'Tickets', icon: Receipt },
    { id: 'audit' as const, label: 'Movimientos', icon: History, adminOnly: true },
  ];

  const visibleNavItems = allNavItems.filter((item) => (isAdmin ? true : !item.adminOnly));

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 gap-2">
          {/* Brand & Logo */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer"
            onClick={() => onTabChange('pos')}
          >
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-11-04_at_5.17.12_PM_161c4a55.jpeg"
              alt="De Compritas con Paula"
              className="h-9 w-auto object-contain rounded-lg"
            />
            <div className="min-w-0">
              <span className="font-bold text-xs sm:text-sm tracking-tight text-gray-900 block leading-tight truncate max-w-[135px] sm:max-w-none">
                De Compritas con Paula
              </span>
              <span className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wider block truncate">
                Personal Shopper Bolivia
              </span>
            </div>
          </div>

          {/* Desktop Nav Items (Role-filtered) */}
          <nav className="hidden md:flex items-center space-x-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-gray-900 font-semibold'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right actions: Alerts Bell + Role Badge + User Profile */}
          <div className="flex items-center space-x-2">
            {/* Real-time Alert Bell (Admin only or all) */}
            <button
              onClick={onOpenAlerts}
              className={`relative p-2 rounded-lg transition-colors ${
                alertCount > 0
                  ? 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
              title="Alertas de stock bajo"
            >
              <Bell className="w-4 h-4" />
              {alertCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-600" />
              )}
            </button>

            {/* Team & Roles Configuration Button (Admin only) */}
            {user && isAdmin && onOpenUsersModal && (
              <button
                onClick={onOpenUsersModal}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors font-medium shadow-2xs cursor-pointer"
                title="Configuración de cuentas, cajeros y roles"
              >
                <Users className="w-3.5 h-3.5 text-pink-600" />
                <span>Equipo & Roles</span>
              </button>
            )}

            {/* User Profile & Role Indicator */}
            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-gray-100">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={accountName}
                    className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {(accountName[0] || 'U').toUpperCase()}
                  </div>
                )}

                <div className="flex flex-col text-left min-w-0">
                  <span className="text-[11px] sm:text-xs font-semibold text-gray-800 truncate max-w-[95px] sm:max-w-[140px] leading-tight">
                    {accountName}
                  </span>
                  {canSwitchRole ? (
                    <button
                      onClick={() => switchActiveRole(isAdmin ? 'cashier' : 'admin')}
                      className={`text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 w-fit shadow-2xs ${
                        isAdmin
                          ? 'bg-gray-900 text-white hover:bg-black'
                          : 'bg-pink-100 text-pink-800 hover:bg-pink-200'
                      }`}
                      title={`Modo: ${isAdmin ? 'Administrador' : 'Vista Cajero'}. Clic para alternar vista`}
                    >
                      <span>{isAdmin ? 'Admin' : 'Cajero'}</span>
                      <span className="text-[8px] opacity-70">⇄</span>
                    </button>
                  ) : (
                    <span className="text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-pink-100 text-pink-800 w-fit">
                      Cajero
                    </span>
                  )}
                </div>

                <button
                  onClick={logout}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={loginWithGoogle}
                disabled={isLoggingIn}
                className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isLoggingIn ? 'Ingresando...' : 'Ingresar'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar (Role-filtered) */}
      <div className="md:hidden border-t border-gray-100 bg-white px-2 py-1 flex items-center justify-around overflow-x-auto">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`px-2 py-1 text-[11px] font-medium flex flex-col items-center gap-0.5 transition-colors ${
                isActive
                  ? 'text-pink-600 font-bold'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
        {user && isAdmin && onOpenUsersModal && (
          <button
            onClick={onOpenUsersModal}
            className="px-2 py-1 text-[11px] font-medium flex flex-col items-center gap-0.5 text-gray-500 hover:text-pink-600 transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-pink-600" />
            <span>Equipo</span>
          </button>
        )}
      </div>
    </header>
  );
};
