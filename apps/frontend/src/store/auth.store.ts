import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  profilePictureUrl?: string;
  isActive?: boolean;
  lastLogin?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
