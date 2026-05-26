'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../layout';
import CommitHeatmap from '@/components/charts/commit-heatmap';
import { GitCommit, GitPullRequest, GitBranch, RefreshCw, AlertCircle, Building } from 'lucide-react';

interface CommitRecord {
  date: string;
  count: number;
}

export default function CommitsPage() {
  const { activeTeam } = useDashboard();
  const [commits, setCommits] = useState<CommitRecord[]>([]);
  const [totalCommits, setTotalCommits] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCommitData = async () => {
    if (!activeTeam) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/commits?teamId=${activeTeam.teamId}`);
      if (res.ok) {
        const data = await res.json();
        setCommits(data.commits || []);
        setTotalCommits(data.totalCommits || 0);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load commit data');
      }
    } catch (err) {
      console.error('Failed to load commits:', err);
      setError('Connection failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommitData();
  }, [activeTeam]);

  const handleManualSync = async () => {
    if (!activeTeam) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: activeTeam.teamId }),
      });
      if (res.ok) {
        await fetchCommitData();
      } else {
        const data = await res.json();
        setError(data.error || 'Sync failed');
      }
    } catch (err) {
      console.error('Sync error:', err);
      setError('Failed to trigger synchronization');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!activeTeam?.githubOrg) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
          <Building className="h-8 w-8" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-xl font-bold text-slate-100">Connect GitHub to Track Commits</h2>
          <p className="text-sm text-slate-400">
            Before we can render commit analytics, you need to connect your GitHub App installation in settings.
          </p>
        </div>
        <a
          href="/settings"
          className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-5 py-2.5 text-xs font-bold transition-colors"
        >
          Go to Settings
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">Commit Analytics</h1>
          <p className="text-sm text-slate-400">Track team development frequency, schedules, and active workflows</p>
        </div>

        <button
          onClick={handleManualSync}
          disabled={isSyncing || isLoading}
          className="flex items-center justify-center space-x-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-100 transition-colors disabled:opacity-50 active:scale-[0.98]"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing GitHub...' : 'Sync Repository'}</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-4 text-xs text-red-400 flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Highlights grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Total Commits Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Commits</h2>
            <GitCommit className="h-5 w-5 text-cyan-400" />
          </div>
          {isLoading ? (
            <div className="h-8 w-16 bg-slate-800 animate-pulse rounded" />
          ) : (
            <p className="text-3xl font-extrabold text-slate-100">{totalCommits}</p>
          )}
        </div>

        {/* Sync Status Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Sync Status</h2>
            <RefreshCw className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold text-slate-100">Synchronized</p>
            <p className="text-[10px] text-slate-500">Updates trigger instantly via webhooks</p>
          </div>
        </div>

        {/* Codebases Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Sync Engine</h2>
            <GitBranch className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold text-slate-100">Active</p>
            <p className="text-[10px] text-slate-500">GitHub App installation active</p>
          </div>
        </div>
      </div>

      {/* Heatmap Section */}
      {isLoading ? (
        <div className="h-64 bg-slate-900/10 border border-slate-850 animate-pulse rounded-2xl flex items-center justify-center">
          <p className="text-xs text-slate-500">Loading contribution grid...</p>
        </div>
      ) : (
        <CommitHeatmap commits={commits} />
      )}
    </div>
  );
}
