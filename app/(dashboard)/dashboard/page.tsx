'use client';

import { useState } from 'react';
import { useDashboard } from '../layout';
import { Building, Sparkles, AlertCircle, Plus, LayoutDashboard } from 'lucide-react';

export default function DashboardPage() {
  const { user, activeTeam, refreshSession } = useDashboard();
  
  // Onboarding Form States
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Generate slug dynamically from name
  const handleNameChange = (val: string) => {
    setName(val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // remove invalid chars
      .replace(/\s+/g, '-') // spaces to hyphens
      .replace(/-+/g, '-'); // collapse multiple hyphens
    setSlug(generatedSlug);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to create workspace');
      } else {
        // Refresh session to fetch the new team memberships and update UI
        await refreshSession();
      }
    } catch (err) {
      console.error('Workspace creation failed:', err);
      setFormError('An unexpected connection error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasNoWorkspace = !user?.memberships || user.memberships.length === 0;

  if (hasNoWorkspace) {
    return (
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center text-center space-y-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-950 border border-cyan-500/30 text-cyan-400">
            <Building className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">Setup Your Workspace</h1>
            <p className="text-xs text-slate-400">
              Create a team workspace to sync GitHub metrics and generate team velocity insights.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateWorkspace} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Workspace Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Tech Dev Team"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Workspace URL Slug</label>
            <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
              <span className="text-sm text-slate-600 select-none">drevlo.com/</span>
              <input
                type="text"
                required
                placeholder="acme-tech-dev"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Lowercase letters, numbers, and hyphens only. Used as your unique team path.
            </p>
          </div>

          {formError && (
            <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-4 text-xs text-red-400 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !name || !slug}
            className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 px-4 py-3 text-sm font-bold shadow-lg shadow-cyan-500/10 transition-all duration-200 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
            <span>{isSubmitting ? 'Creating Workspace...' : 'Create Workspace'}</span>
          </button>
        </form>
      </div>
    );
  }

  // Dashboard landing view (User has at least 1 active workspace)
  return (
    <div className="space-y-8">
      {/* Welcome header banner */}
      <div className="relative rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/60 to-indigo-950/10 p-6 md:p-8 overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-cyan-400">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Phase 1 Complete</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
              Welcome to Drevlo, {user?.name}!
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              You are currently logged into the **{activeTeam?.teamName}** workspace. Your JWT session is secured, and team workspace management database hooks are active.
            </p>
          </div>

          <div className="shrink-0 flex items-center">
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs px-3 py-1 font-bold">
              Plan: {user?.plan}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of stats/status modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Workspace Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Workspace Status</h2>
            <Building className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-slate-100">{activeTeam?.teamName}</p>
            <div className="flex flex-col space-y-1 text-xs text-slate-400">
              <p>Slug: <code className="text-slate-300">{activeTeam?.teamSlug}</code></p>
              <p>GitHub Org: <span className="text-slate-300">{activeTeam?.githubOrg || 'Not connected yet'}</span></p>
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Database Sync</h2>
            <LayoutDashboard className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-slate-100">Ready</p>
            <div className="flex flex-col space-y-1 text-xs text-slate-400">
              <p>ORMapper: <span className="text-slate-300">Prisma (WASM Client)</span></p>
              <p>Database: <span className="text-slate-300">Supabase (PostgreSQL)</span></p>
            </div>
          </div>
        </div>

        {/* Next Step Phase 2 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Phase 2 Next Steps</h2>
            <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-slate-100">Core Dashboard</p>
            <div className="flex flex-col space-y-1 text-xs text-slate-400">
              <p>Connect GitHub repositories</p>
              <p>Configure Octokit webhooks & sync</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
