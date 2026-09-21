import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, getToken } from './api';
import { User } from './types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null as any);

/**
 * Đọc thông tin user tối thiểu từ JWT lưu cục bộ, dùng khi offline (không gọi được /auth/me).
 * Không xác thực chữ ký (server luôn kiểm tra lại ở mọi API thật) - chỉ để hiển thị UI tạm.
 */
function decodeUserFromToken(token: string): User | null {
  try {
    const payload = token.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (!json?.id || !json?.role) return null;
    return {
      id: json.id,
      email: json.email,
      full_name: json.full_name,
      role: json.role,
      showroom_id: json.showroom_id ?? null,
      manager_id: json.manager_id ?? null,
      onboarded: true, // tránh kẹt ở màn Onboarding khi offline; sẽ đồng bộ lại khi online
    } as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = getToken();
      if (token) {
        try {
          const me = await api.get<User>('/auth/me');
          setUser(me);
        } catch (e: any) {
          if (e?.status === 401) {
            // Token thật sự không hợp lệ/hết hạn -> đăng xuất.
            setToken(null);
          } else {
            // Lỗi mạng (offline) hoặc lỗi máy chủ tạm thời: giữ token, dựng lại user tối thiểu
            // từ chính token JWT (không cần gọi API) để vẫn vào được app và dùng dữ liệu cache.
            const cached = decodeUserFromToken(token);
            if (cached) setUser(cached);
            else setToken(null); // token hỏng, không đọc được -> đăng xuất
          }
        }
      }
      setLoading(false);
    })();
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    setToken(res.token);
    setUser(res.user);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  async function refresh() {
    const me = await api.get<User>('/auth/me');
    setUser(me);
  }

  return <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
