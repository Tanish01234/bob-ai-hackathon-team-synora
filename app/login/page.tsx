'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { clearExplicitLogout, loginJudgeDemo } from '@/lib/auth-bootstrap';
import { BobMark } from '@/components/bob/primitives';

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL || 'judge@bob.ai';
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'BOB2026Demo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const router = useRouter();

  // If a genuine session is already active, direct user to dashboard
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then((res: any) => {
      if (res?.data?.session?.access_token) {
        router.replace('/');
      }
    });
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading || demoLoading) return;
    setError(null);
    setDemoError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('Authentication session was not established. Please try again.');
        setLoading(false);
        return;
      }

      clearExplicitLogout();
      router.replace('/');
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    if (loading || demoLoading) return;
    setError(null);
    setDemoError(null);
    setDemoLoading(true);

    try {
      const authState = await loginJudgeDemo();
      if (!authState.token) {
        setDemoError('Failed to establish secure demo session. Please try again.');
        setDemoLoading(false);
        return;
      }

      router.replace('/');
    } catch (err: any) {
      setDemoError(err?.message || 'Demo access is temporarily unavailable. Please try again or use a normal account.');
      setDemoLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070B14] text-[#E2E8F0] flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md bg-[#0D1527] border border-[#1E293B] rounded-xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8 text-center">
          <BobMark className="text-[#00D4FF] mb-3" />
          <h1 className="text-xl font-bold tracking-wide text-white uppercase">BOB Supply Chain Intelligence</h1>
          <span className="text-[10px] font-mono tracking-widest text-[#00D4FF]/90 uppercase mt-1">by Team Synora</span>
          <p className="text-xs text-[#7A8FAD] mt-1.5">Autonomous Supply Chain Risk Intelligence</p>
        </div>

        {error && (
          <div role="alert" className="mb-6 p-3 text-xs bg-red-950/40 border border-red-500/30 text-red-400 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@supplychain.org"
              disabled={loading || demoLoading}
              className="w-full px-3.5 py-2.5 bg-[#070B14] border border-[#1E293B] rounded-lg text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading || demoLoading}
              className="w-full px-3.5 py-2.5 bg-[#070B14] border border-[#1E293B] rounded-lg text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading || demoLoading}
            className="w-full mt-2 py-2.5 px-4 bg-[#00D4FF] hover:bg-[#00bfe6] disabled:opacity-50 text-[#070B14] font-semibold text-sm rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>

        {/* Clean Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#1E293B]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0D1527] px-3 text-[#64748B] font-mono tracking-wider">
              or
            </span>
          </div>
        </div>

        {/* Dedicated Judge / Demo Access Section */}
        <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/20 to-transparent p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-amber-400 text-xs">⚡</span>
            <span className="text-[11px] font-bold tracking-wider uppercase text-cyan-400 font-mono">
              Judge Demo Access
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mb-3.5 leading-relaxed">
            Explore the complete BOB intelligence platform instantly using the preconfigured demo account.
          </p>

          {demoError && (
            <div role="alert" className="mb-3 p-2.5 text-xs bg-red-950/40 border border-red-500/30 text-red-400 rounded-lg text-left">
              {demoError}
            </div>
          )}

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading || demoLoading}
            aria-busy={demoLoading}
            aria-label="Enter Demo Mode with preconfigured judge account"
            className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500/15 hover:from-cyan-500/25 to-blue-500/15 hover:to-blue-500/25 border border-cyan-400/40 hover:border-cyan-400/70 text-cyan-300 hover:text-white font-medium text-sm rounded-lg transition-all shadow-[0_0_16px_rgba(0,212,255,0.12)] hover:shadow-[0_0_24px_rgba(0,212,255,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {demoLoading ? (
              <>
                <span className="size-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-mono">Connecting to BOB Command Center...</span>
              </>
            ) : (
              <>
                <span className="text-base">🚀</span>
                <span>Enter Demo Mode</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-[#1E293B] text-center">
          <p className="text-xs text-[#7A8FAD]">
            Don't have an account?{' '}
            <Link href="/register" className="text-[#00D4FF] hover:underline font-medium">
              Create account
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-5 text-center">
        <p className="text-[11px] font-mono text-slate-500 tracking-wider">
          BOB Supply Chain Intelligence · <span className="text-slate-400">by Team Synora</span>
        </p>
      </div>
    </div>
  );
}
