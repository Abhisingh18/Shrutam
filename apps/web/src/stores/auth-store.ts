import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  userId: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: string;
}

interface AuthState {
  tenantId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (params: {
    tenantId: string;
    accessToken: string;
    refreshToken: string;
    user?: AuthUser | null;
  }) => void;
  setUser: (user: AuthUser) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clear: () => void;
}

// Client-side session store — docs/09-frontend-architecture.md §5 (Zustand for
// cross-route ephemeral state). Access tokens are short-lived (15 min, see
// docs/04-rbac-security.md §5); persisted only so a page refresh doesn't force
// a re-login, not as a substitute for httpOnly cookies in the production build.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      tenantId: null,
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ tenantId, accessToken, refreshToken, user = null }) =>
        set({ tenantId, accessToken, refreshToken, user }),
      setUser: (user) => set({ user }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      clear: () => set({ tenantId: null, accessToken: null, refreshToken: null, user: null }),
    }),
    { name: "sutram-auth" },
  ),
);
