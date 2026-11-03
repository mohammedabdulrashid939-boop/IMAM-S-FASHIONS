import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.ts';
import { syncUserProfileToSupabase } from '../lib/supabaseStorageCatalog.ts';
import { UserProfileRecord, FOUNDER_NAME, WHATSAPP_LOCAL, isFounderEmail } from '../constants/brand.ts';

interface AuthContextValue {
  profile: UserProfileRecord | null;
  role: 'admin' | 'customer' | null;
  token: string | null;
  loading: boolean;
  loginCustomer: (
    email: string,
    password: string
  ) => Promise<{ profile: UserProfileRecord; role: 'admin' | 'customer' }>;
  registerCustomer: (input: {
    fullName: string;
    email: string;
    phoneNumber: string;
    password: string;
  }) => Promise<void>;
  loginAdmin: (email: string, password: string, fullName?: string) => Promise<void>;
  updateProfile: (updates: { fullName: string; phoneNumber: string }) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function syncSupabaseUserSession(
  userId: string,
  email: string,
  fallbackName = '',
  fallbackPhone = '',
  createdAt?: string,
  metadataRole?: string
): Promise<{ profile: UserProfileRecord; role: 'admin' | 'customer' }> {
  const cleanEmail = email.trim().toLowerCase();
  const isFounder = isFounderEmail(cleanEmail) || metadataRole === 'admin';
  const displayName =
    fallbackName.trim() || (isFounder ? FOUNDER_NAME : cleanEmail.split('@')[0]);
  const resolvedRole: 'admin' | 'customer' = isFounder ? 'admin' : 'customer';

  const syncedProfile = await syncUserProfileToSupabase({
    id: 1,
    uid: userId,
    fullName: displayName,
    email: cleanEmail,
    phoneNumber: fallbackPhone || (isFounder ? WHATSAPP_LOCAL : ''),
    accountStatus: 'Active',
    createdAt: createdAt || new Date().toISOString(),
    role: resolvedRole,
  });

  const finalRole: 'admin' | 'customer' =
    syncedProfile.role === 'admin' || isFounder ? 'admin' : 'customer';

  return {
    profile: {
      ...syncedProfile,
      role: finalRole,
    },
    role: finalRole,
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
      setToken(newToken);
      setProfile(newProfile);
      setRole(newRole);
    },
    []
  );

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && isMounted) {
        try {
          const metaRole =
            session.user.user_metadata?.role || session.user.app_metadata?.role;
          const synced = await syncSupabaseUserSession(
            session.user.id,
            session.user.email || '',
            session.user.user_metadata?.full_name || '',
            session.user.user_metadata?.phone_number || '',
            session.user.created_at,
            metaRole
          );
          if (synced.profile.accountStatus === 'Suspended') {
            await supabase.auth.signOut();
            if (isMounted) setSession(null, null, null);
          } else if (isMounted) {
            setSession(session.access_token, synced.profile, synced.role);
          }
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
        const metaRole =
          session.user.user_metadata?.role || session.user.app_metadata?.role;
        const synced = await syncSupabaseUserSession(
          session.user.id,
          session.user.email || '',
          session.user.user_metadata?.full_name || '',
          session.user.user_metadata?.phone_number || '',
          session.user.created_at,
          metaRole
        );
        if (synced.profile.accountStatus === 'Suspended') {
          await supabase.auth.signOut();
          if (isMounted) setSession(null, null, null);
        } else if (isMounted) {
          setSession(session.access_token, synced.profile, synced.role);
        }
      } else if (!session && isMounted) {
        setSession(null, null, null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setSession]);

  const loginCustomer = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error || !data.user || !data.session) {
      throw new Error(error?.message || 'Invalid email address or password.');
    }
    const metaRole =
      data.user.user_metadata?.role || data.user.app_metadata?.role;
    const synced = await syncSupabaseUserSession(
      data.user.id,
      data.user.email || cleanEmail,
      data.user.user_metadata?.full_name || '',
      data.user.user_metadata?.phone_number || '',
      data.user.created_at,
      metaRole
    );
    if (synced.profile.accountStatus === 'Suspended') {
      await supabase.auth.signOut();
      throw new Error('Your account has been suspended. Please contact support.');
    }
    setSession(data.session.access_token, synced.profile, synced.role);
    return synced;
  };

  const registerCustomer = async (input: {
    fullName: string;
    email: string;
    phoneNumber: string;
    password: string;
  }) => {
    const cleanEmail = input.email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
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
      cleanEmail,
      input.fullName.trim(),
      input.phoneNumber.trim(),
      data.user.created_at
    );
    if (data.session) {
      setSession(data.session.access_token, synced.profile, synced.role);
    }
  };

  const loginAdmin = async (email: string, password: string, fullName?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    let { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    // If founder account doesn't exist yet in Supabase Auth, initialize it on first login
    if (error && isFounderEmail(cleanEmail)) {
      const signUpRes = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName || FOUNDER_NAME,
            phone_number: WHATSAPP_LOCAL,
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
      data.user.user_metadata?.full_name || fullName || FOUNDER_NAME,
      data.user.user_metadata?.phone_number || WHATSAPP_LOCAL,
      data.user.created_at
    );

    if (synced.role !== 'admin') {
      await supabase.auth.signOut();
      throw new Error('Access denied. This account does not have administrator privileges.');
    }

    setSession(data.session.access_token, synced.profile, 'admin');
  };

  const updateProfile = async (updates: { fullName: string; phoneNumber: string }) => {
    if (!profile) throw new Error('Not signed in.');

    await supabase.auth.updateUser({
      data: {
        full_name: updates.fullName.trim(),
        phone_number: updates.phoneNumber.trim(),
      },
    });

    const updatedProfile = await syncUserProfileToSupabase({
      ...profile,
      fullName: updates.fullName.trim(),
      phoneNumber: updates.phoneNumber.trim(),
    });

    setProfile(updatedProfile);
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
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
        updateProfile,
        updatePassword,
        logout,
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
