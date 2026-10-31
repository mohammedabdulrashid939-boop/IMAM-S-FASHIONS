import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';
import { UserProfileRecord } from '../constants/brand.ts';

const FOUNDER_EMAIL = 'mohammedabdulrashid939@gmail.com';

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

let memoryToken: string | null = null;

async function syncSupabaseUserSession(
  userId: string,
  email: string,
  fallbackName = '',
  fallbackPhone = '',
  forceAdmin = false
): Promise<{ profile: UserProfileRecord; role: 'admin' | 'customer' }> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const cleanEmail = email.trim().toLowerCase();

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('uid', userId)
    .maybeSingle();

  const { data: existingRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('uid', userId)
    .maybeSingle();

  const isFounder = cleanEmail === FOUNDER_EMAIL || forceAdmin;
  const resolvedRole: 'admin' | 'customer' =
    existingRole?.role === 'admin' || isFounder ? 'admin' : 'customer';

  if (existingProfile) {
    if (isFounder && existingRole?.role !== 'admin') {
      await supabase
        .from('user_roles')
        .upsert(
          { user_id: existingProfile.user_id, uid: userId, role: 'admin' },
          { onConflict: 'uid' }
        );
    }
    return {
      profile: {
        id: existingProfile.id,
        uid: existingProfile.uid,
        fullName: existingProfile.full_name,
        email: existingProfile.email,
        phoneNumber: existingProfile.phone_number || '',
        accountStatus: existingProfile.account_status || 'Active',
        createdAt: existingProfile.created_at,
        role: resolvedRole,
      },
      role: resolvedRole,
    };
  }

  // Ensure user, profile, and role rows exist in Supabase tables
  const displayName = fallbackName.trim() || cleanEmail.split('@')[0];
  try {
    const { data: upsertedUser } = await supabase
      .from('users')
      .upsert(
        {
          uid: userId,
          email: cleanEmail,
          fullName: undefined,
          full_name: displayName,
          phone_number: fallbackPhone,
          account_status: 'Active',
        },
        { onConflict: 'uid' }
      )
      .select()
      .maybeSingle();

    const numericUserId = upsertedUser?.id || null;

    const { data: upsertedProfile } = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: numericUserId,
          uid: userId,
          full_name: displayName,
          email: cleanEmail,
          phone_number: fallbackPhone,
          account_status: 'Active',
        },
        { onConflict: 'uid' }
      )
      .select()
      .maybeSingle();

    await supabase
      .from('user_roles')
      .upsert(
        {
          user_id: numericUserId,
          uid: userId,
          role: resolvedRole,
        },
        { onConflict: 'uid' }
      );

    if (upsertedProfile) {
      return {
        profile: {
          id: upsertedProfile.id,
          uid: upsertedProfile.uid,
          fullName: upsertedProfile.full_name,
          email: upsertedProfile.email,
          phoneNumber: upsertedProfile.phone_number || '',
          accountStatus: upsertedProfile.account_status || 'Active',
          createdAt: upsertedProfile.created_at,
          role: resolvedRole,
        },
        role: resolvedRole,
      };
    }
  } catch {
    // Fallback if RLS isn't updated yet
  }

  return {
    profile: {
      id: 0,
      uid: userId,
      fullName: displayName,
      email: cleanEmail,
      phoneNumber: fallbackPhone,
      accountStatus: 'Active',
      createdAt: new Date().toISOString(),
      role: resolvedRole,
    },
    role: resolvedRole,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [role, setRole] = useState<'admin' | 'customer' | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const setSession = useCallback(
    (
      newToken: string | null,
      newProfile: UserProfileRecord | null,
      newRole: 'admin' | 'customer' | null
    ) => {
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
      credentials: 'include',
      headers,
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user && isMounted) {
          try {
            const synced = await syncSupabaseUserSession(
              session.user.id,
              session.user.email || '',
              session.user.user_metadata?.full_name || '',
              session.user.user_metadata?.phone_number || ''
            );
            setSession(session.access_token, synced.profile, synced.role);
          } catch (err) {
            console.error('Supabase session sync error:', err);
          }
        }
        if (isMounted) setLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user && isMounted) {
          const synced = await syncSupabaseUserSession(
            session.user.id,
            session.user.email || '',
            session.user.user_metadata?.full_name || '',
            session.user.user_metadata?.phone_number || ''
          );
          setSession(session.access_token, synced.profile, synced.role);
        } else if (!session && isMounted) {
          setSession(null, null, null);
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    const restoreSession = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          headers: memoryToken ? { Authorization: `Bearer ${memoryToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.profile && data.role) {
            if (data.token) {
              memoryToken = data.token;
              setToken(data.token);
            }
            setProfile(data.profile);
            setRole(data.role);
            setLoading(false);
            return;
          }
        }
      } catch {
        // ignore network error during initial check
      }

      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser && !memoryToken?.startsWith('imam.')) {
          try {
            const idToken = await firebaseUser.getIdToken();
            memoryToken = idToken;
            if (isMounted) setToken(idToken);
            const res = await fetch('/api/auth/me', {
              credentials: 'include',
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
            });
            if (res.ok) {
              const data = await res.json();
              if (isMounted && data.profile) {
                setProfile(data.profile);
                setRole(data.role);
              }
            }
          } catch (err) {
            console.error('Error syncing Firebase user session:', err);
          }
        }
        if (isMounted) setLoading(false);
      });

      return unsubscribe;
    };

    const unsubPromise = restoreSession();
    return () => {
      isMounted = false;
      unsubPromise.then((unsub) => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [setSession]);

  const loginCustomer = async (email: string, password: string) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !data.user || !data.session) {
        throw new Error(error?.message || 'Invalid email or password.');
      }
      const synced = await syncSupabaseUserSession(data.user.id, data.user.email || email);
      setSession(data.session.access_token, synced.profile, synced.role);
      return;
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
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
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: {
            full_name: input.fullName.trim(),
            phone_number: input.phoneNumber.trim(),
          },
        },
      });
      if (error || !data.user) {
        throw new Error(error?.message || 'Registration failed.');
      }
      const synced = await syncSupabaseUserSession(
        data.user.id,
        input.email,
        input.fullName,
        input.phoneNumber
      );
      if (data.session) {
        setSession(data.session.access_token, synced.profile, synced.role);
      }
      return;
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
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
    if (isSupabaseConfigured && supabase) {
      const cleanEmail = email.trim().toLowerCase();
      let { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      // If founder account doesn't exist yet in Supabase Auth, initialize it on first login
      if (error && cleanEmail === FOUNDER_EMAIL) {
        const signUpRes = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: fullName || 'Mohammed Abdul Rashid',
              phone_number: '0245198198',
            },
          },
        });
        if (!signUpRes.error && signUpRes.data.user && signUpRes.data.session) {
          data = {
            user: signUpRes.data.user,
            session: signUpRes.data.session,
          };
          error = null;
        }
      }

      if (error || !data.user || !data.session) {
        throw new Error(error?.message || 'Invalid administrator credentials.');
      }

      const synced = await syncSupabaseUserSession(
        data.user.id,
        data.user.email || cleanEmail,
        fullName || 'Mohammed Abdul Rashid'
      );

      if (synced.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Access denied. This account does not have administrator privileges.');
      }

      setSession(data.session.access_token, synced.profile, 'admin');
      return;
    }

    const res = await fetch('/api/auth/admin-login', {
      method: 'POST',
      credentials: 'include',
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
      credentials: 'include',
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
    if (isSupabaseConfigured && supabase && profile) {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: updates.fullName.trim(),
          phone_number: updates.phoneNumber.trim(),
        })
        .eq('uid', profile.uid);

      if (error) throw new Error(error.message);
      setProfile({
        ...profile,
        fullName: updates.fullName.trim(),
        phoneNumber: updates.phoneNumber.trim(),
      });
      return;
    }

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
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
      return;
    }

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
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    try {
      await signOut(auth);
    } catch {
      // ignore
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
