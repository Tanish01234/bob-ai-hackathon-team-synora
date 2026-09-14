import { createClient } from '@/lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

export type AuthStatus =
  | 'AUTH_INITIALIZING'
  | 'AUTHENTICATED'
  | 'AUTH_UNAUTHENTICATED'
  | 'AUTH_ERROR';

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  session: Session | null;
  token: string | null;
  error?: string | null;
}

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL || 'judge@bob.ai';
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'BOB2026Demo';

let currentAuthState: AuthState = {
  status: 'AUTH_INITIALIZING',
  user: null,
  session: null,
  token: null,
};

let bootstrapPromise: Promise<AuthState> | null = null;
const listeners = new Set<(state: AuthState) => void>();

export function getAuthState(): AuthState {
  return currentAuthState;
}

export function subscribeAuth(listener: (state: AuthState) => void): () => void {
  listeners.add(listener);
  listener(currentAuthState);
  return () => {
    listeners.delete(listener);
  };
}

function setAuthState(newState: Partial<AuthState>) {
  currentAuthState = { ...currentAuthState, ...newState };
  listeners.forEach((listener) => {
    try {
      listener(currentAuthState);
    } catch (err) {
      console.error('[auth-bootstrap] Listener error:', err);
    }
  });
}

/**
 * Ensures an authoritative, valid Supabase session is established.
 * 1. Checks for existing persisted session.
 * 2. Refreshes if token is expiring within 60s.
 * 3. If no session and no explicit signout, auto-authenticates into Judge Demo.
 * 4. Deduplicates concurrent callers to a single shared in-flight promise.
 */
export async function ensureAuthSession(options?: {
  forceRefresh?: boolean;
  autoLoginDemo?: boolean;
}): Promise<AuthState> {
  if (typeof window === 'undefined') {
    return {
      status: 'AUTH_UNAUTHENTICATED',
      user: null,
      session: null,
      token: null,
    };
  }

  // Reuse in-flight promise if currently bootstrapping
  if (bootstrapPromise && !options?.forceRefresh) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    setAuthState({ status: 'AUTH_INITIALIZING' });
    const supabase = createClient();

    try {
      // 1. Check for existing persisted session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session && session.access_token) {
        const isExpiring =
          session.expires_at &&
          session.expires_at * 1000 < Date.now() + 60000;

        if (isExpiring || options?.forceRefresh) {
          try {
            const { data: refreshData } = await supabase.auth.refreshSession();
            if (refreshData?.session?.access_token) {
              const refreshedState: AuthState = {
                status: 'AUTHENTICATED',
                user: refreshData.session.user,
                session: refreshData.session,
                token: refreshData.session.access_token,
              };
              setAuthState(refreshedState);
              return refreshedState;
            }
          } catch {
            // retain existing session if refresh fails
          }
        }

        const state: AuthState = {
          status: 'AUTHENTICATED',
          user: session.user,
          session,
          token: session.access_token,
        };
        setAuthState(state);
        return state;
      }

      // 2. Check if user explicitly logged out in this browser session
      const isExplicitLogout =
        sessionStorage.getItem('bob_explicit_logout') === 'true';

      if (isExplicitLogout) {
        const state: AuthState = {
          status: 'AUTH_UNAUTHENTICATED',
          user: null,
          session: null,
          token: null,
        };
        setAuthState(state);
        return state;
      }

      // 3. Frictionless Judge Demo Auto-Bootstrap (Direct root load)
      const allowAutoDemo = options?.autoLoginDemo !== false;
      if (allowAutoDemo) {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
          });

        if (signInError) {
          console.warn('[auth-bootstrap] Auto demo sign-in failed:', signInError.message);
          const state: AuthState = {
            status: 'AUTH_UNAUTHENTICATED',
            user: null,
            session: null,
            token: null,
            error: signInError.message,
          };
          setAuthState(state);
          return state;
        }

        if (data?.session?.access_token) {
          const state: AuthState = {
            status: 'AUTHENTICATED',
            user: data.user,
            session: data.session,
            token: data.session.access_token,
          };
          setAuthState(state);
          return state;
        }
      }

      const state: AuthState = {
        status: 'AUTH_UNAUTHENTICATED',
        user: null,
        session: null,
        token: null,
      };
      setAuthState(state);
      return state;
    } catch (err: any) {
      console.error('[auth-bootstrap] Session bootstrap error:', err);
      const state: AuthState = {
        status: 'AUTH_ERROR',
        user: null,
        session: null,
        token: null,
        error: err?.message || 'Authentication error',
      };
      setAuthState(state);
      return state;
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}

/**
 * Handle explicit signout: prevents auto-login loop in the same session.
 */
export async function logoutUser(): Promise<void> {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('bob_explicit_logout', 'true');
  }
  const supabase = createClient();
  try {
    await supabase.auth.signOut();
  } finally {
    setAuthState({
      status: 'AUTH_UNAUTHENTICATED',
      user: null,
      session: null,
      token: null,
    });
  }
}

/**
 * Clears explicit logout flag when user intentionally signs in or enters demo mode.
 */
export function clearExplicitLogout(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('bob_explicit_logout');
  }
}
