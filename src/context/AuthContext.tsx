import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { UserProfileRecord } from '../constants/brand.ts';

interface AuthContextValue {
  profile: UserProfileRecord | null;
  role: 'admin' | 'customer' | null;
  token: string | null;
  loading: boolean;
  loginCustomer: (email: string, password: string) => Promise<void>;
  registerCustomer: (input: {
    fullName: string;
    email: string;
    phoneNumber: string;
    password: string;
  }) => Promise<void>;
  loginAdmin: (email: string, password: string, fullName?: string) => Promise<void>;
  signInWithGoogle: (options?: { isAdminLoginAttempt?: boolean }) => Promise<'admin' | 'customer'>;
  updateProfile: (updates: { fullName: string; phoneNumber: string }) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// In-memory token store (never stored in localStorage per security guidelines)
let memoryToken: string | null = null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [role, setRole] = useState<'admin' | 'customer' | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const setSession = useCallback(
    (newToken: string | null, newProfile: UserProfileRecord | null, newRole: 'admin' | 'customer' | null) => {
      memoryToken = newToken;
      setToken(newToken);
      setProfile(newProfile);
      setRole(newRole);
    },
    []
  );

  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (memoryToken) {
      headers.set('Authorization', `Bearer ${memoryToken}`);
    }
    return fetch(url, {
      ...options,
      headers,
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && !memoryToken?.startsWith('imam.')) {
        try {
          const idToken = await firebaseUser.getIdToken();
          memoryToken = idToken;
          setToken(idToken);
          const res = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            setProfile(data.profile);
            setRole(data.role);
          }
        } catch (err) {
          console.error('Error syncing Firebase user session:', err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginCustomer = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed.');
    }
    setSession(data.token, data.profile, data.role);
  };

  const registerCustomer = async (input: {
    fullName: string;
    email: string;
    phoneNumber: string;
    password: string;
  }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed.');
    }
    setSession(data.token, data.profile, data.role);
  };

  const loginAdmin = async (email: string, password: string, fullName?: string) => {
    const res = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Administrator login failed.');
    }
    setSession(data.token, data.profile, data.role);
  };

  const signInWithGoogle = async (options?: {
    isAdminLoginAttempt?: boolean;
  }): Promise<'admin' | 'customer'> => {
    const credential = await signInWithPopup(auth, googleAuthProvider);
    const idToken = await credential.user.getIdToken();

    const res = await fetch('/api/auth/google-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fullName: credential.user.displayName || '',
        isAdminLoginAttempt: options?.isAdminLoginAttempt || false,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      await signOut(auth);
      throw new Error(data.error || 'Google authentication failed.');
    }

    setSession(idToken, data.profile, data.role);
    return data.role;
  };

  const updateProfile = async (updates: { fullName: string; phoneNumber: string }) => {
    const res = await apiFetch('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update profile.');
    }
    setProfile(data.profile);
  };

  const updatePassword = async (newPassword: string) => {
    const res = await apiFetch('/api/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update password.');
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    try {
      await signOut(auth);
    } catch {
      // ignore firebase signout error if session was password-based
    }
    setSession(null, null, null);
  };

  return (
    <AuthContext.Provider
      value={{
        profile,
        role,
        token,
        loading,
        loginCustomer,
        registerCustomer,
        loginAdmin,
        signInWithGoogle,
        updateProfile,
        updatePassword,
        logout,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
