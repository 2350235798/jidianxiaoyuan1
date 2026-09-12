import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import axios from '@/utils/axios';
import type { User, ApiResponse } from '@shared/api.interface';
import { logger } from '@/utils/logger';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isGuest: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, nickname: string) => Promise<void>;
  logout: () => void;
  enterGuestMode: () => void;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'jidian_campus_token';
const GUEST_KEY = 'jidian_campus_guest';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const guest = localStorage.getItem(GUEST_KEY);
    if (token) {
      fetchProfile();
    } else if (guest) {
      setIsGuest(true);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get<ApiResponse<User>>('/api/auth/profile');
      if (res.data?.success && res.data.data) {
        setUser(res.data.data);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch (err) {
      logger.error('获取用户信息失败', String(err));
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (phone: string, password: string) => {
    const res = await axios.post<ApiResponse<{ token: string; user: User }>>(
      '/api/auth/login',
      { phone, password }
    );
    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || '登录失败');
    }
    localStorage.setItem(TOKEN_KEY, res.data.data.token);
    setUser(res.data.data.user);
    setIsGuest(false);
    localStorage.removeItem(GUEST_KEY);
  };

  const register = async (phone: string, password: string, nickname: string) => {
    const res = await axios.post<ApiResponse<{ token: string; user: User }>>(
      '/api/auth/register',
      { phone, password, nickname }
    );
    if (!res.data?.success || !res.data.data) {
      throw new Error(res.data?.message || '注册失败');
    }
    localStorage.setItem(TOKEN_KEY, res.data.data.token);
    setUser(res.data.data.user);
    setIsGuest(false);
    localStorage.removeItem(GUEST_KEY);
  };

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem(GUEST_KEY);
  }, []);

  const enterGuestMode = () => {
    localStorage.setItem(GUEST_KEY, '1');
    setIsGuest(true);
    setUser(null);
  };

  const updateUser = (newUser: User) => {
    setUser(newUser);
  };

  const refreshUser = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isGuest, login, register, logout, enterGuestMode, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
