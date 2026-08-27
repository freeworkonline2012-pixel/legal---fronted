import {
  clearAuthSession,
  getAccessToken,
  getCurrentUser,
  getRefreshToken,
  isAuthenticated,
  setAuthSession,
} from './auth';
import type { AuthResponse } from './types';

const SESSION: AuthResponse = {
  access_token: 'access-token-1',
  refresh_token: 'refresh-token-1',
  user: {
    id: 'u-1',
    email: 'user@example.com',
    full_name: null,
    role: 'user',
    created_at: '2026-01-01T10:00:00.000Z',
  },
};

describe('auth session (src/lib/auth.ts)', () => {
  beforeEach(() => {
    clearAuthSession();
  });

  it('يعيد null عندما لا توجد جلسة', () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getCurrentUser()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });

  it('يحفظ الجلسة ويستعيد التوكنين والمستخدم', () => {
    setAuthSession(SESSION);
    expect(getAccessToken()).toBe('access-token-1');
    expect(getRefreshToken()).toBe('refresh-token-1');
    expect(isAuthenticated()).toBe(true);
    expect(getCurrentUser()?.email).toBe('user@example.com');
    expect(getCurrentUser()?.role).toBe('user');
  });

  it('يمسح الجلسة كاملة (حق الحذف 151/2020)', () => {
    setAuthSession(SESSION);
    clearAuthSession();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getCurrentUser()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });
});
