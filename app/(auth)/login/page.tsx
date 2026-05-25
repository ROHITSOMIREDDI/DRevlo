import Link from 'next/link';
import { Suspense } from 'react';
import LoginContent from './login-content';

export const metadata = {
  title: 'Sign In | Drevlo',
  description: 'Log in to Drevlo to view your team velocity and analytics.',
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 font-sans text-slate-100 antialiased selection:bg-cyan-500 selection:text-slate-900">
      {/* Background ambient glow effect */}
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />

      {/* Main glass card container */}
      <div className="relative z-10 w-full max-w-md px-6 py-12 sm:px-8">
        <div className="flex flex-col items-center space-y-6 text-center">
          {/* Logo element */}
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-lg shadow-cyan-500/20">
            <span className="text-xl font-bold tracking-wider text-slate-950">D</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-cyan-100 to-indigo-200 bg-clip-text text-transparent">
              DREVLO
            </h1>
            <p className="text-sm font-medium tracking-widest text-slate-400 uppercase">
              Your team. Your velocity.
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center space-y-4 py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <p className="text-xs text-slate-400">Loading auth portal...</p>
            </div>
          }>
            <LoginContent />
          </Suspense>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          By signing in, you agree to our{' '}
          <Link href="#" className="underline hover:text-slate-400 transition-colors">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="#" className="underline hover:text-slate-400 transition-colors">
            Privacy Policy
          </Link>.
        </p>
      </div>
    </div>
  );
}
