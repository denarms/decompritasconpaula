import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { Header, ActiveTab } from './components/Header';
import { AuthBanner } from './components/AuthBanner';
import { POSView } from './components/POSView';
import { InventoryView } from './components/InventoryView';
import { CustomersView } from './components/CustomersView';
import { ReportsView } from './components/ReportsView';
import { SalesHistoryView } from './components/SalesHistoryView';
import { InventoryAuditView } from './components/InventoryAuditView';
import { LowStockAlertsDrawer } from './components/LowStockAlertsDrawer';
import { ProductModal } from './components/ProductModal';
import { UsersRoleModal } from './components/UsersRoleModal';
import { LogIn, RefreshCw, KeyRound, User as UserIcon, Lock } from 'lucide-react';

function MainApp() {
  const {
    user,
    isAdmin,
    isCashier,
    loading: authLoading,
    isLoggingIn,
    error: authError,
    loginWithGoogle,
    loginWithPassword,
  } = useAuth();
  const { loadingData } = useData();
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);

  // Login form state for unauthenticated screen
  const [loginMethod, setLoginMethod] = useState<'password' | 'google'>('password');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Guard: If user is a cashier, redirect from admin-only tabs back to pos
  useEffect(() => {
    if (!isAdmin && (activeTab === 'inventory' || activeTab === 'reports' || activeTab === 'audit')) {
      setActiveTab('pos');
    }
  }, [isAdmin, activeTab]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword) {
      setPasswordError('Ingresa tu usuario y contraseña.');
      return;
    }
    try {
      setIsSubmittingPassword(true);
      setPasswordError(null);
      await loginWithPassword(loginUsername.trim(), loginPassword);
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Minimalist Boutique Welcome Screen when unauthenticated
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-between font-sans text-gray-900">
        {/* Minimal Nav */}
        <div className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-11-04_at_5.17.12_PM_161c4a55.jpeg"
              alt="De Compritas con Paula"
              className="h-10 w-auto object-contain rounded-lg"
            />
            <div>
              <h2 className="font-bold text-sm text-gray-900 leading-tight">
                De Compritas con Paula
              </h2>
              <span className="text-[10px] text-gray-400 tracking-wider uppercase">
                Personal Shopper Bolivia
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLoginMethod(loginMethod === 'password' ? 'google' : 'password')}
              className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-4 hidden sm:block"
            >
              {loginMethod === 'password' ? '¿Entrar con Google?' : '¿Entrar con Usuario y Contraseña?'}
            </button>
          </div>
        </div>

        {/* Minimalist Hero & Login Card */}
        <div className="max-w-md mx-auto px-6 py-10 w-full space-y-5">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-11-04_at_5.17.12_PM_161c4a55.jpeg"
                alt="Logo De Compritas con Paula"
                className="h-20 w-auto object-contain rounded-2xl shadow-xs border border-gray-100"
              />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Ingreso al Sistema de Ventas
            </h1>
            <p className="text-xs text-gray-500">
              Inicia sesión como Cajero/a o Administrador
            </p>
          </div>

          {/* Login Mode Switcher Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('password');
                setPasswordError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                loginMethod === 'password'
                  ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Usuario y Contraseña</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('google');
                setPasswordError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                loginMethod === 'google'
                  ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Cuenta Google</span>
            </button>
          </div>

          {/* Login Forms */}
          {loginMethod === 'password' ? (
            <form
              onSubmit={handlePasswordLogin}
              className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3.5 text-xs"
            >
              {passwordError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                  {passwordError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Usuario o Correo
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="ej. cajera1 o denarms@gmail.com"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-pink-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingPassword || isLoggingIn}
                className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingPassword ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Iniciar Sesión</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3.5 text-center text-xs">
              <p className="text-gray-500 text-xs">
                Accede de forma rápida utilizando tu cuenta de Google.
              </p>
              <button
                onClick={loginWithGoogle}
                disabled={isLoggingIn}
                className="w-full py-2.5 bg-gray-900 hover:bg-black text-white font-medium text-xs rounded-xl shadow-xs transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Abriendo selector de Google...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Iniciar con Cuenta Google</span>
                  </>
                )}
              </button>
              {authError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs text-left">
                  {authError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Minimal Footer */}
        <div className="p-4 text-center text-[11px] text-gray-400 border-t border-gray-100">
          De Compritas con Paula • Personal Shopper Bolivia
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900 antialiased select-text">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAlerts={() => setAlertsOpen(true)}
        onOpenUsersModal={() => setIsUsersModalOpen(true)}
      />

      {/* Auth Banner */}
      <AuthBanner />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {loadingData && (
          <div className="absolute top-2 right-4 z-30 bg-white/95 px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs text-[11px] font-medium text-gray-600 flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 animate-spin text-pink-600" />
            Sincronizando...
          </div>
        )}

        {activeTab === 'pos' && (
          <POSView onOpenProductModal={() => setIsProductModalOpen(true)} />
        )}

        {activeTab === 'inventory' && isAdmin && <InventoryView />}

        {activeTab === 'customers' && <CustomersView />}

        {activeTab === 'reports' && isAdmin && <ReportsView />}

        {activeTab === 'sales' && <SalesHistoryView />}

        {activeTab === 'audit' && isAdmin && <InventoryAuditView />}
      </main>

      {/* Real-time Alerts Drawer */}
      <LowStockAlertsDrawer
        isOpen={alertsOpen}
        onClose={() => setAlertsOpen(false)}
      />

      {/* Global Product Modal (Admin only) */}
      {isProductModalOpen && isAdmin && (
        <ProductModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
        />
      )}

      {/* Team Roles Modal (Admin only) */}
      {isUsersModalOpen && isAdmin && (
        <UsersRoleModal
          isOpen={isUsersModalOpen}
          onClose={() => setIsUsersModalOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainApp />
      </DataProvider>
    </AuthProvider>
  );
}
