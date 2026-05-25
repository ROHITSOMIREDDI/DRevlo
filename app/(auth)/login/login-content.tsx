'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function LoginContent() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const [isLoading, setIsLoading] = useState(false);

  // Mapping OAuth error parameters to human readable descriptions
  const getErrorMessage = (error: string | null) => {
    if (!error) return null;
    switch (error) {
      case 'no_code':
        return 'GitHub authorization code was not received. Please try again.';
      case 'token_exchange_failed':
        return 'Could not exchange authorization code for a session token.';
      case 'profile_fetch_failed':
        return 'Could not retrieve your GitHub profile details.';
      case 'no_email_found':
        return 'Your email is private or verified email could not be found.';
      case 'auth_internal_error':
        return 'An internal authentication error occurred. Please try again later.';
      default:
        return 'An unexpected authentication error occurred.';
    }
  };

  const errorMessage = getErrorMessage(errorParam);

  const handleLogin = () => {
    setIsLoading(true);
    // Redirect browser to api endpoint initiating GitHub OAuth
    window.location.href = '/api/auth/github';
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <h2 className="text-xl font-semibold text-slate-100">Welcome Back</h2>
        <p className="text-xs text-slate-400">
          Connect your GitHub account to manage team velocity and review performance insights.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-4 text-xs text-red-400">
          <div className="flex space-x-2">
            <svg
              className="h-4 w-4 shrink-0 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={isLoading}
        className="group relative flex w-full items-center justify-center space-x-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 shadow-md transition-all duration-200 hover:border-slate-600 hover:bg-slate-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
      >
        {isLoading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
        ) : (
          <svg className="h-5 w-5 fill-current text-slate-100" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        )}
        <span>{isLoading ? 'Connecting to GitHub...' : 'Continue with GitHub'}</span>
      </button>
    </div>
  );
}
