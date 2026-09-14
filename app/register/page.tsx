'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { BobMark } from '@/components/bob/primitives';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // If user session exists immediately (e.g. email confirmation disabled), go to dashboard
      if (data.session) {
        router.push('/');
        router.refresh();
      } else {
        setSuccessMsg(
          'Registration successful! If email confirmation is enabled on your Supabase instance, please check your inbox.'
        );
        setLoading(false);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070B14] text-[#E2E8F0] flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md bg-[#0D1527] border border-[#1E293B] rounded-xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8 text-center">
          <BobMark className="text-[#00D4FF] mb-3" />
          <h1 className="text-xl font-bold tracking-wide text-white uppercase">BOB Supply Chain Intelligence</h1>
          <span className="text-[10px] font-mono tracking-widest text-[#00D4FF]/90 uppercase mt-1">by Team Synora</span>
          <p className="text-xs text-[#7A8FAD] mt-1.5">Create your enterprise operator account</p>
        </div>

        {error && (
          <div className="mb-6 p-3 text-xs bg-red-950/40 border border-red-500/30 text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-3 text-xs bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-lg">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5" htmlFor="fullName">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Supply Chain Operator"
              className="w-full px-3.5 py-2.5 bg-[#070B14] border border-[#1E293B] rounded-lg text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors"
            />
          </div>

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
              className="w-full px-3.5 py-2.5 bg-[#070B14] border border-[#1E293B] rounded-lg text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors"
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••••• (min 6 characters)"
              className="w-full px-3.5 py-2.5 bg-[#070B14] border border-[#1E293B] rounded-lg text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-[#00D4FF] hover:bg-[#00bfe6] disabled:opacity-50 text-[#070B14] font-semibold text-sm rounded-lg transition-colors cursor-pointer"
          >
            {loading ? 'Creating Account...' : 'Register Operator'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#1E293B] text-center">
          <p className="text-xs text-[#7A8FAD]">
            Already have an account?{' '}
            <Link href="/login" className="text-[#00D4FF] hover:underline font-medium">
              Sign In
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
