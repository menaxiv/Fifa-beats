import { create } from 'zustand';
import type { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  setUser: (user: User | null, isAdmin?: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  isLoading: true,
  setUser: (user, isAdmin = false) =>
    set({ user, isAuthenticated: !!user, isAdmin, isLoading: false }),
}));
