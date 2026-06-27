import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import * as authApi from '../api/auth';
import { subscribeToPush, unsubscribeFromPush } from '../utils/pushNotifications';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'LOADING' }
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; user: Partial<User> };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOADING': return { ...state, isLoading: true };
    case 'LOGIN': return { user: action.user, isAuthenticated: true, isLoading: false };
    case 'LOGOUT': return { user: null, isAuthenticated: false, isLoading: false };
    case 'UPDATE_USER': return { ...state, user: state.user ? { ...state.user, ...action.user } : null };
  }
}

interface AuthContextType extends AuthState {
  login: (login: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('tot_access_token');
    if (!token) {
      dispatch({ type: 'LOGOUT' });
      return;
    }
    authApi.getMe()
      .then(user => dispatch({ type: 'LOGIN', user }))
      .catch(() => {
        localStorage.removeItem('tot_access_token');
        localStorage.removeItem('tot_refresh_token');
        dispatch({ type: 'LOGOUT' });
      });
  }, []);

  async function login(loginStr: string, password: string) {
    const { user, accessToken, refreshToken } = await authApi.login(loginStr, password);
    localStorage.setItem('tot_access_token', accessToken);
    localStorage.setItem('tot_refresh_token', refreshToken);
    dispatch({ type: 'LOGIN', user });
    subscribeToPush().catch(() => {});
  }

  async function register(username: string, email: string, password: string, displayName?: string) {
    const { user, accessToken, refreshToken } = await authApi.register(username, email, password, displayName);
    localStorage.setItem('tot_access_token', accessToken);
    localStorage.setItem('tot_refresh_token', refreshToken);
    dispatch({ type: 'LOGIN', user });
    subscribeToPush().catch(() => {});
  }

  async function logout() {
    await unsubscribeFromPush().catch(() => {});
    const refreshToken = localStorage.getItem('tot_refresh_token');
    if (refreshToken) {
      try { await authApi.logout(refreshToken); } catch { /* ignore */ }
    }
    localStorage.removeItem('tot_access_token');
    localStorage.removeItem('tot_refresh_token');
    dispatch({ type: 'LOGOUT' });
  }

  function updateUser(updates: Partial<User>) {
    dispatch({ type: 'UPDATE_USER', user: updates });
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
