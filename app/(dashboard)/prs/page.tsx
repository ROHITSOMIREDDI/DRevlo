'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../layout';
import PrCycleTime from '@/components/charts/pr-cycle-time';
import { GitPullRequest, Clock, CheckCircle2, AlertCircle, Building } from 'lucide-react';

interface ChartDataRecord {
  name: string;
  avgHours: number;
  p50Hours: number;
  p90Hours: number;
}

interface Metrics {
  openPrsCount: number;
  avgCycleTimeHours: number;
  mergeRatePercent: number;
}

export default function PrsPage() {
  const { activeTeam } = useDashboard();
  const [chartData, setChartData] = useState<ChartDataRecord[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    openPrsCount: 0,
    avgCycleTimeHours: 0,
    mergeRatePercent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrData = async () => {
    if (!activeTeam) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/prs?teamId=${activeTeam.teamId}`);
      if (res.ok) {
        const data = await res.json();
        setChartData(data.chartData || []);
        setMetrics(data.metrics || { openPrsCount: 0, avgCycleTimeHours: 0, mergeRatePercent: 0 });
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load pull request analytics');
      }
    } catch (err) {
      console.error('Failed to load PRs:', err);
      setError('Connection failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrData();
  }, [activeTeam]);

  if (!activeTeam?.githubOrg) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
          <Building className="h-8 w-8" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-xl font-bold text-slate-100">Connect GitHub to Track PRs</h2>
          <p className="text-sm text-slate-400">
            Before we can render cycle time analytics, you need to connect your GitHub App installation in settings.
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
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">PR Analytics</h1>
        <p className="text-sm text-slate-400">Measure review latency, merge efficiency, and sprint workflow metrics</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-4 text-xs text-red-400 flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Open PRs Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Open Pull Requests</h2>
            <GitPullRequest className="h-5 w-5 text-cyan-400" />
          </div>
          {isLoading ? (
            <div className="h-8 w-12 bg-slate-800 animate-pulse rounded" />
          ) : (
            <p className="text-3xl font-extrabold text-slate-100">{metrics.openPrsCount}</p>
          )}
        </div>

        {/* Avg Cycle Time Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Avg Cycle Time</h2>
            <Clock className="h-5 w-5 text-indigo-400" />
          </div>
          {isLoading ? (
            <div className="h-8 w-24 bg-slate-800 animate-pulse rounded" />
          ) : (
            <p className="text-3xl font-extrabold text-slate-100">
              {metrics.avgCycleTimeHours > 0
                ? `${metrics.avgCycleTimeHours.toFixed(1)} hrs`
                : 'N/A'}
            </p>
          )}
        </div>

        {/* Merge Rate Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">PR Merge Rate</h2>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          {isLoading ? (
            <div className="h-8 w-20 bg-slate-800 animate-pulse rounded" />
          ) : (
            <p className="text-3xl font-extrabold text-slate-100">
              {metrics.mergeRatePercent > 0
                ? `${Math.round(metrics.mergeRatePercent)}%`
                : 'N/A'}
            </p>
          )}
        </div>
      </div>

      {/* Cycle Time Chart */}
      {isLoading ? (
        <div className="h-80 bg-slate-900/10 border border-slate-850 animate-pulse rounded-2xl flex items-center justify-center">
          <p className="text-xs text-slate-500">Loading cycle time graphs...</p>
        </div>
      ) : (
        <PrCycleTime data={chartData} />
      )}
    </div>
  );
}
