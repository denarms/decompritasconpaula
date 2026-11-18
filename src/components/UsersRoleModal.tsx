import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, UserProfile } from '../types';
import {
  X,
  ShieldCheck,
  UserCheck,
  Check,
  RefreshCw,
  Users,
  UserPlus,
  Trash2,
  Info,
  Mail,
  HelpCircle,
  KeyRound,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface UsersRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UsersRoleModal: React.FC<UsersRoleModalProps> = ({ isOpen, onClose }) => {
  const {
    usersList,
    changeUserRole,
    addAuthorizedUser,
    createAccountWithPassword,
    deleteUser,
    user: currentAuthUser,
  } = useAuth();

  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showFirebaseConsoleHelp, setShowFirebaseConsoleHelp] = useState(false);

  // New account form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [creationMethod, setCreationMethod] = useState<'password' | 'google'>('password');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('cashier');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedCredentials, setLastCreatedCredentials] = useState<{
    user: string;
    pass: string;
    name: string;
    role: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  if (!isOpen) return null;

  const handleRoleChange = async (targetUser: UserProfile, roleToSet: UserRole) => {
    if (targetUser.email.toLowerCase() === 'denarms@gmail.com' && roleToSet !== 'admin') {
      setErrorMessage('La cuenta principal de administración no puede ser degradada a cajero.');
      return;
    }

    try {
      setUpdatingUid(targetUser.uid);
      setMessage(null);
      setErrorMessage(null);
      await changeUserRole(targetUser.uid, roleToSet);
      setMessage(`Rol de "${targetUser.displayName}" actualizado a ${roleToSet === 'admin' ? 'Administrador' : 'Cajero / Atención al Cliente'}.`);
      setTimeout(() => setMessage(null), 3500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al actualizar rol');
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    setShowFirebaseConsoleHelp(false);

    try {
      setIsSubmitting(true);

      if (creationMethod === 'password') {
        if (!usernameInput.trim()) {
          setErrorMessage('Ingresa un nombre de usuario.');
          return;
        }
        if (!passwordInput || passwordInput.length < 6) {
          setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
          return;
        }

        await createAccountWithPassword({
          usernameOrEmail: usernameInput.trim(),
          password: passwordInput,
          displayName: newName.trim() || usernameInput.trim(),
          role: newRole,
        });

        setLastCreatedCredentials({
          user: usernameInput.trim(),
          pass: passwordInput,
          name: newName.trim() || usernameInput.trim(),
          role: newRole === 'admin' ? 'Administrador' : 'Cajero / Atención al Cliente',
        });

        setMessage(`¡Cuenta creada con éxito! El cajero/a ya puede ingresar usando su usuario y contraseña.`);
        setUsernameInput('');
        setPasswordInput('');
        setNewName('');
      } else {
        if (!newEmail.trim()) {
          setErrorMessage('Ingresa el correo electrónico de Google.');
          return;
        }
        await addAuthorizedUser(newEmail.trim(), newName.trim(), newRole);
        setMessage(`Cuenta Google pre-autorizada para "${newEmail.trim()}" con rol de ${newRole === 'admin' ? 'Administrador' : 'Cajero / Atención al Cliente'}.`);
        setNewEmail('');
        setNewName('');
      }

      setShowAddForm(false);
      setTimeout(() => setMessage(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar la cuenta';
      setErrorMessage(msg);
      if (msg.includes('Firebase Console') || msg.includes('operation-not-allowed')) {
        setShowFirebaseConsoleHelp(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCredentials = () => {
    if (!lastCreatedCredentials) return;
    const text = `Credenciales de Acceso a De Compritas con Paula:\n👤 Usuario: ${lastCreatedCredentials.user}\n🔑 Contraseña: ${lastCreatedCredentials.pass}\n🏷️ Rol: ${lastCreatedCredentials.role}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDeleteUser = (targetUser: UserProfile) => {
    if (targetUser.email.toLowerCase() === 'denarms@gmail.com') {
      setErrorMessage('No es posible eliminar la cuenta principal de administración.');
      return;
    }
    setUserToDelete(targetUser);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setUpdatingUid(userToDelete.uid);
      setMessage(null);
      setErrorMessage(null);
      await deleteUser(userToDelete.uid);
      setMessage(`Cuenta "${userToDelete.displayName}" eliminada del sistema.`);
      setUserToDelete(null);
      setTimeout(() => setMessage(null), 3500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al eliminar cuenta');
    } finally {
      setUpdatingUid(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                Configuración de Cuentas & Roles
              </h3>
              <p className="text-xs text-gray-400">
                Crea cuentas con usuario y contraseña o autoriza cuentas de Google
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          {message && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {lastCreatedCredentials && (
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-pink-600" />
                  Credenciales recién creadas (Copia y entrégaselas a tu cajero/a):
                </span>
                <button
                  onClick={copyCredentials}
                  className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 font-medium text-[11px] rounded-lg border border-gray-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? '¡Copiado!' : 'Copiar datos'}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-gray-200 font-mono">
                <div>
                  <span className="text-gray-400 block text-[10px] font-sans">Usuario:</span>
                  <span className="font-bold text-gray-900">{lastCreatedCredentials.user}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] font-sans">Contraseña:</span>
                  <span className="font-bold text-pink-700">{lastCreatedCredentials.pass}</span>
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs space-y-2">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              {showFirebaseConsoleHelp && (
                <div className="pt-2 border-t border-red-200 text-[11px] text-gray-700 space-y-1.5">
                  <p className="font-semibold text-gray-900">
                    Instrucción para activar inicio con contraseña en Firebase (1 solo clic):
                  </p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Ingresa a la consola de Firebase en Métodos de Inicio de Sesión.</li>
                    <li>Haz clic en <strong>Correo electrónico/contraseña</strong>.</li>
                    <li>Activa la casilla <strong>Habilitar</strong> y haz clic en <strong>Guardar</strong>.</li>
                  </ol>
                  <a
                    href="https://console.firebase.google.com/project/gen-lang-client-0059503922/authentication/providers"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-900 text-white rounded-lg font-medium hover:bg-black transition-colors mt-1"
                  >
                    <span>Abrir Configuración en Firebase Console</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Action Bar: Add Account Button */}
          <div className="flex items-center justify-between pt-1">
            <span className="font-semibold text-gray-900 text-xs">
              Equipo de la Boutique ({usersList.length} cuentas)
            </span>

            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setErrorMessage(null);
                setShowFirebaseConsoleHelp(false);
              }}
              className="px-3.5 py-1.5 bg-pink-600 hover:bg-pink-700 text-white font-medium text-xs rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Ocultar Formulario' : '+ Crear Nueva Cuenta'}</span>
            </button>
          </div>

          {/* Form to Add Account (Password vs Google) */}
          {showAddForm && (
            <form
              onSubmit={handleCreateAccount}
              className="p-4 bg-pink-50/40 rounded-xl border border-pink-200/80 space-y-3.5 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">
                  Crear / Registrar Cuenta de Personal
                </span>

                {/* Method Switcher */}
                <div className="flex bg-white p-0.5 rounded-lg border border-gray-200 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setCreationMethod('password')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      creationMethod === 'password'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Usuario y Contraseña
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreationMethod('google')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      creationMethod === 'google'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Cuenta Google
                  </button>
                </div>
              </div>

              {creationMethod === 'password' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">
                        Nombre de Usuario o Alias <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ej. cajera1, ana, paula"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-pink-500"
                      />
                      <span className="text-[10px] text-gray-400 mt-0.5 block">
                        No requiere @gmail.com, solo un nombre o código fácil.
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">
                        Contraseña (mínimo 6 dígitos) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ej. cajera123"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-pink-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                      Nombre completo o Identificador del Cajero/a
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Ana Belén (Turno Tarde)"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-pink-500"
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                      Este es el nombre que aparecerá en los recibos y tickets de venta ("Atendido por: Ana Belén").
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                      Correo Gmail / Google <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="ejemplo@gmail.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                      Nombre o Identificador
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Andrea Gómez"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-pink-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-pink-100">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-medium text-gray-700">Rol asignado:</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg bg-white font-medium text-gray-800 focus:outline-hidden focus:border-pink-500"
                  >
                    <option value="cashier">Cajero / Atención al Cliente (Recomendado)</option>
                    <option value="admin">Administrador (Acceso total)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-gray-900 hover:bg-black text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creando cuenta...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{creationMethod === 'password' ? 'Crear Cuenta y Contraseña' : 'Pre-autorizar Cuenta Google'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Users List Table */}
          <div className="space-y-2">
            {usersList.length === 0 ? (
              <p className="text-gray-400 py-6 text-center">No hay cuentas registradas aún.</p>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
                {usersList.map((u) => {
                  const isSuperAdminAccount = u.email.toLowerCase() === 'denarms@gmail.com';
                  const isCurrent = u.uid === currentAuthUser?.uid;
                  const isPasswordAccount = u.authType === 'password' || u.username;
                  const isPreauth = u.uid.startsWith('preauth_');

                  return (
                    <div
                      key={u.uid}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        {u.photoURL ? (
                          <img
                            src={u.photoURL}
                            alt={u.displayName}
                            className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                            isPasswordAccount ? 'bg-indigo-50 text-indigo-700' : 'bg-pink-100 text-pink-700'
                          }`}>
                            {(u.displayName || u.username || u.email)[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-gray-900 text-xs truncate">
                              {u.displayName}
                            </p>
                            {isCurrent && (
                              <span className="text-[10px] text-pink-600 font-medium">(Tú)</span>
                            )}
                            {isPasswordAccount && (
                              <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-medium flex items-center gap-0.5">
                                <KeyRound className="w-2.5 h-2.5" />
                                Usuario & Contraseña
                              </span>
                            )}
                            {isPreauth && (
                              <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-medium">
                                Pre-autorizado
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 truncate flex items-center gap-1">
                            {isPasswordAccount ? (
                              <span>Usuario: <strong className="text-gray-700">{u.username || u.email.split('@')[0]}</strong></span>
                            ) : (
                              <>
                                <Mail className="w-3 h-3" />
                                <span>{u.email}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Role & Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {updatingUid === u.uid ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          <>
                            <select
                              value={u.role || 'cashier'}
                              disabled={isSuperAdminAccount}
                              onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                              className={`px-2.5 py-1 text-xs border rounded-lg font-medium cursor-pointer focus:outline-hidden ${
                                u.role === 'admin'
                                  ? 'bg-gray-900 text-white border-gray-900'
                                  : 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-white'
                              } disabled:opacity-60 disabled:cursor-not-allowed`}
                            >
                              <option value="admin">Administrador</option>
                              <option value="cashier">Cajero / Atención</option>
                            </select>

                            {!isSuperAdminAccount && !isCurrent && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar cuenta y revocar acceso"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            Administrador principal: <strong className="text-gray-700">denarms@gmail.com</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-900 hover:bg-black text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* In-App Confirmation Modal: Delete Team Account */}
      <ConfirmModal
        isOpen={Boolean(userToDelete)}
        title="¿Eliminar cuenta de usuario?"
        description={`¿Deseas revocar el acceso y eliminar la cuenta de "${userToDelete?.displayName}" (${userToDelete?.username || userToDelete?.email}) del sistema?`}
        confirmText="Eliminar Cuenta"
        cancelText="Conservar"
        isDanger={true}
        isLoading={updatingUid === userToDelete?.uid}
        onConfirm={confirmDeleteUser}
        onClose={() => setUserToDelete(null)}
      />
    </div>
  );
};
