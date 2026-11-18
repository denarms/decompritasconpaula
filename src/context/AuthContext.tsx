import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  User,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import {
  auth,
  googleProvider,
  db,
  firebaseConfig,
  handleFirestoreError,
  OperationType,
  testConnection,
} from '../firebase/config';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isCashier: boolean;
  canSwitchRole: boolean;
  usersList: UserProfile[];
  loading: boolean;
  isLoggingIn: boolean;
  error: string | null;
  loginWithGoogle: () => Promise<void>;
  loginWithPassword: (usernameOrEmail: string, password: string) => Promise<void>;
  createAccountWithPassword: (params: {
    usernameOrEmail: string;
    password: string;
    displayName: string;
    role: UserRole;
  }) => Promise<UserProfile>;
  logout: () => Promise<void>;
  changeUserRole: (targetUid: string, newRole: UserRole) => Promise<void>;
  addAuthorizedUser: (email: string, displayName: string, newRole: UserRole) => Promise<void>;
  deleteUser: (targetUid: string) => Promise<void>;
  switchActiveRole: (newRole: UserRole) => Promise<void>;
  dbOnline: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: 'cashier',
  isAdmin: false,
  isCashier: true,
  canSwitchRole: false,
  usersList: [],
  loading: true,
  isLoggingIn: false,
  error: null,
  loginWithGoogle: async () => {},
  loginWithPassword: async () => {},
  createAccountWithPassword: async () => ({ uid: '', email: '', displayName: '', role: 'cashier' }),
  logout: async () => {},
  changeUserRole: async () => {},
  addAuthorizedUser: async () => {},
  deleteUser: async () => {},
  switchActiveRole: async () => {},
  dbOnline: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbOnline, setDbOnline] = useState(true);

  // Check initial firestore connectivity
  useEffect(() => {
    testConnection().then((connected) => {
      setDbOnline(connected);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          
          const isSuperAdmin = currentUser.email?.toLowerCase() === 'denarms@gmail.com';
          
          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            if (isSuperAdmin && data.role !== 'admin') {
              const updatedProfile: UserProfile = { ...data, role: 'admin' };
              await setDoc(userDocRef, updatedProfile, { merge: true });
              setProfile(updatedProfile);
            } else {
              setProfile(data);
            }
          } else {
            // Check if an admin pre-authorized this email; otherwise default strictly to cashier (fail-closed)
            let assignedRole: UserRole = isSuperAdmin ? 'admin' : 'cashier';
            let initialName = (currentUser.displayName || (isSuperAdmin ? 'Administrador de Tienda' : 'Cajero / Atención')).slice(0, 100);
            const rawPhoto = currentUser.photoURL || '';
            const safePhoto = rawPhoto.length <= 500 ? rawPhoto : '';
            const userEmail = (currentUser.email || '').toLowerCase();
            const safeEmail = (currentUser.email || `${currentUser.uid}@google.internal`).slice(0, 120);

            if (userEmail) {
              const safeDocId = `preauth_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
              const preAuthDocRef = doc(db, 'users', safeDocId);
              try {
                const preAuthSnap = await getDoc(preAuthDocRef);
                if (preAuthSnap.exists()) {
                  const preData = preAuthSnap.data() as UserProfile;
                  assignedRole = isSuperAdmin ? 'admin' : (preData.role || 'cashier');
                  if (preData.displayName) initialName = preData.displayName.slice(0, 100);
                  const newProfile: UserProfile = {
                    uid: currentUser.uid,
                    email: safeEmail,
                    displayName: initialName,
                    photoURL: safePhoto,
                    role: assignedRole,
                    authType: 'google',
                    createdAt: new Date().toISOString(),
                  };
                  await setDoc(userDocRef, newProfile);
                  setProfile(newProfile);
                  try {
                    await deleteDoc(preAuthDocRef);
                  } catch {
                    // Ignore cleanup error
                  }
                } else {
                  const newProfile: UserProfile = {
                    uid: currentUser.uid,
                    email: safeEmail,
                    displayName: initialName,
                    photoURL: safePhoto,
                    role: assignedRole,
                    authType: 'google',
                    createdAt: new Date().toISOString(),
                  };
                  await setDoc(userDocRef, newProfile);
                  setProfile(newProfile);
                }
              } catch {
                const newProfile: UserProfile = {
                  uid: currentUser.uid,
                  email: safeEmail,
                  displayName: initialName,
                  photoURL: safePhoto,
                  role: assignedRole,
                  authType: 'google',
                  createdAt: new Date().toISOString(),
                };
                await setDoc(userDocRef, newProfile);
                setProfile(newProfile);
              }
            } else {
              const newProfile: UserProfile = {
                uid: currentUser.uid,
                email: safeEmail,
                displayName: initialName,
                photoURL: safePhoto,
                role: assignedRole,
                authType: 'google',
                createdAt: new Date().toISOString(),
              };
              await setDoc(userDocRef, newProfile);
              setProfile(newProfile);
            }
          }
        } catch (err) {
          console.error("Error fetching/syncing user profile:", err);
          const isSuperAdmin = currentUser.email?.toLowerCase() === 'denarms@gmail.com';
          setProfile({
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || (isSuperAdmin ? 'Administrador de Tienda' : 'Cajero / Atención'),
            photoURL: currentUser.photoURL || '',
            role: isSuperAdmin ? 'admin' : 'cashier',
          });
        }
      } else {
        setProfile(null);
        setPreviewRole(null);
        setUsersList([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isSuperAdmin = user?.email?.toLowerCase() === 'denarms@gmail.com';
  const actualIsAdmin = Boolean(user && (isSuperAdmin || profile?.role === 'admin'));
  const canSwitchRole = Boolean(isSuperAdmin);

  // Cashiers are strictly locked to 'cashier'. Only real Admins can toggle local UI preview.
  const effectiveRole: UserRole = actualIsAdmin
    ? (previewRole || 'admin')
    : 'cashier';
  const isAdmin = effectiveRole === 'admin';
  const role: UserRole = effectiveRole;
  const isCashier = !isAdmin;

  const switchActiveRole = async (newRole: UserRole) => {
    // Strict security guard: only real administrators can toggle UI preview mode; never touches Firestore role
    if (!actualIsAdmin) {
      return;
    }
    setPreviewRole(newRole);
  };

  // Real-time listener for users directory (Admin only)
  useEffect(() => {
    if (!user || !actualIsAdmin) {
      setUsersList([]);
      return;
    }

    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list: UserProfile[] = [];
        snap.forEach((d) => {
          list.push(d.data() as UserProfile);
        });
        setUsersList(list);
      },
      (err) => {
        console.error("Error fetching users list:", err);
      }
    );

    return () => unsub();
  }, [user, actualIsAdmin]);

  const changeUserRole = async (targetUid: string, newRole: UserRole) => {
    if (!actualIsAdmin) {
      throw new Error('Solo el administrador puede cambiar roles.');
    }
    try {
      const userRef = doc(db, 'users', targetUid);
      await setDoc(userRef, { role: newRole }, { merge: true });
      if (targetUid === user?.uid && profile) {
        setProfile({ ...profile, role: newRole });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const addAuthorizedUser = async (email: string, displayName: string, newRole: UserRole) => {
    if (!actualIsAdmin) {
      throw new Error('Solo el administrador puede autorizar usuarios.');
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Por favor ingresa un correo electrónico válido.');
    }

    const existing = usersList.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error(`El usuario con correo ${cleanEmail} ya está en la lista.`);
    }

    const safeDocId = `preauth_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const preProfile: UserProfile = {
      uid: safeDocId,
      email: cleanEmail,
      displayName: displayName.trim() || 'Cajero / Atención',
      photoURL: '',
      role: newRole,
      createdAt: new Date().toISOString(),
    };

    try {
      const userRef = doc(db, 'users', safeDocId);
      await setDoc(userRef, preProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${safeDocId}`);
    }
  };

  const deleteUser = async (targetUid: string) => {
    if (!actualIsAdmin) {
      throw new Error('Solo el administrador puede eliminar cuentas.');
    }
    const targetUser = usersList.find((u) => u.uid === targetUid);
    if (targetUser?.email.toLowerCase() === 'denarms@gmail.com') {
      throw new Error('No se puede eliminar la cuenta principal de administración.');
    }

    try {
      const userRef = doc(db, 'users', targetUid);
      await deleteDoc(userRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${targetUid}`);
    }
  };

  const loginWithGoogle = async () => {
    if (isLoggingIn) return; // Prevent concurrent popup triggers
    try {
      setIsLoggingIn(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      // User closed the popup window or cancelled without selecting an account: not a fatal app error
      if (
        firebaseError?.code === 'auth/popup-closed-by-user' ||
        firebaseError?.code === 'auth/cancelled-popup-request'
      ) {
        return;
      }

      if (firebaseError?.code === 'auth/popup-blocked') {
        setError('El navegador bloqueó la ventana emergente. Por favor habilita las ventanas emergentes (popups) en la barra de tu navegador.');
        return;
      }

      console.warn("Login notification:", firebaseError?.message || err);
      setError('No se pudo completar el acceso con Google. Por favor intenta de nuevo.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loginWithPassword = async (usernameOrEmail: string, password: string) => {
    const trimmed = usernameOrEmail.trim().toLowerCase();
    if (!trimmed || !password) {
      throw new Error('Por favor ingresa usuario y contraseña.');
    }

    let normalizedEmail = trimmed;
    if (!trimmed.includes('@')) {
      normalizedEmail = `${trimmed}@decompritas.internal`;
    }

    try {
      setIsLoggingIn(true);
      setError(null);
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string };
      console.warn("Password login notification:", fbErr?.code, fbErr?.message);
      if (fbErr?.code === 'auth/operation-not-allowed') {
        const errorMsg = 'El proveedor de inicio con correo/contraseña aún no está activado en Firebase Console. Por favor actívalo en Authentication > Métodos de inicio de sesión.';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      if (
        fbErr?.code === 'auth/user-not-found' ||
        fbErr?.code === 'auth/wrong-password' ||
        fbErr?.code === 'auth/invalid-credential'
      ) {
        const errorMsg = 'Usuario o contraseña incorrectos. Verifica tus credenciales.';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      const errorMsg = fbErr?.message || 'Error al iniciar sesión con contraseña.';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const createAccountWithPassword = async ({
    usernameOrEmail,
    password,
    displayName,
    role: assignedRole,
  }: {
    usernameOrEmail: string;
    password: string;
    displayName: string;
    role: UserRole;
  }): Promise<UserProfile> => {
    if (!actualIsAdmin) throw new Error('Solo el administrador puede crear cuentas de usuario.');

    const trimmed = usernameOrEmail.trim().toLowerCase();
    if (!trimmed) throw new Error('Ingresa un nombre de usuario o correo.');
    if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');

    let normalizedEmail = trimmed;
    let username = trimmed;
    if (!trimmed.includes('@')) {
      username = trimmed;
      normalizedEmail = `${trimmed}@decompritas.internal`;
    } else {
      username = trimmed.split('@')[0];
    }

    // Check if user already exists
    const existing = usersList.find(
      (u) =>
        u.email.toLowerCase() === normalizedEmail ||
        (u.username && u.username.toLowerCase() === username)
    );
    if (existing) {
      throw new Error(`El usuario o correo "${username}" ya está registrado en el sistema.`);
    }

    // Use a secondary Firebase app instance to create the account without logging out the current admin
    const secondaryAppName = `SecondaryAuth_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password);
      const newUid = cred.user.uid;
      const finalDisplayName = displayName.trim() || username;
      try {
        await updateProfile(cred.user, { displayName: finalDisplayName });
      } catch {
        // Ignore profile metadata sync error
      }

      const newProfile: UserProfile = {
        uid: newUid,
        email: normalizedEmail,
        username,
        displayName: finalDisplayName,
        photoURL: '',
        role: assignedRole,
        authType: 'password',
        createdAt: new Date().toISOString(),
      };

      const userDocRef = doc(db, 'users', newUid);
      await setDoc(userDocRef, newProfile);
      return newProfile;
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string };
      if (fbErr?.code === 'auth/operation-not-allowed') {
        // Fallback: create in Firestore users collection so the store manager is never blocked
        const fallbackUid = `user_pass_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const fallbackProfile: UserProfile = {
          uid: fallbackUid,
          email: normalizedEmail,
          username,
          displayName: displayName.trim() || username,
          photoURL: '',
          role: assignedRole,
          authType: 'password',
          createdAt: new Date().toISOString(),
        };
        const userDocRef = doc(db, 'users', fallbackUid);
        await setDoc(userDocRef, fallbackProfile);
        return fallbackProfile;
      }
      if (fbErr?.code === 'auth/email-already-in-use') {
        throw new Error('Este nombre de usuario o correo ya está en uso.');
      }
      throw new Error(fbErr?.message || 'Error al crear la cuenta');
    } finally {
      try {
        await deleteApp(secondaryApp);
      } catch {
        // ignore cleanup error
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setProfile(null);
    } catch (err: unknown) {
      console.error("Logout error:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAdmin,
        isCashier,
        canSwitchRole,
        usersList,
        loading,
        isLoggingIn,
        error,
        loginWithGoogle,
        loginWithPassword,
        createAccountWithPassword,
        logout,
        changeUserRole,
        addAuthorizedUser,
        deleteUser,
        switchActiveRole,
        dbOnline,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
