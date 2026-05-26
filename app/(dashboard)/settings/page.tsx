'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../layout';
import { Settings, Building, Globe, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SettingsPage() {
  const { activeTeam, refreshSession } = useDashboard();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Status flags from callback redirects
  const isConnectedSuccess = searchParams.get('github_connected') === 'success';
  const connectionError = searchParams.get('error');

  const [teamName, setTeamName] = useState(activeTeam?.teamName || '');
  const [timezone, setTimezone] = useState(activeTeam?.githubOrg || 'UTC'); // default fallback
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    if (activeTeam) {
      setTeamName(activeTeam.teamName);
    }
  }, [activeTeam]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateSuccess(false);

    try {
      // Mock update for MVP settings layout
      await new Promise((resolve) => setTimeout(resolve, 800));
      setUpdateSuccess(true);
      await refreshSession();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGitHubConnect = () => {
    if (!activeTeam) return;
    // Redirect user to GitHub App installation flow
    // In a real application, replace 'drevlo-app' with your registered GitHub App name
    const githubAppName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'drevlo-app';
    const redirectUrl = `https://github.com/apps/${githubAppName}/installations/new?state=${activeTeam.teamId}`;
    window.location.href = redirectUrl;
  };

  const isConnected = !!activeTeam?.githubOrg;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header section */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">Settings</h1>
        <p className="text-sm text-slate-400">Configure workspace parameters, timezones, and integrations</p>
      </div>

      {isConnectedSuccess && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-xs text-emerald-400 flex items-start space-x-2">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-500" />
          <div>
            <p className="font-bold">GitHub Connection Successful!</p>
            <p className="text-[10px] text-emerald-500/80 mt-0.5">
              Your repositories have been synchronized and webhook events are active.
            </p>
          </div>
        </div>
      )}

      {connectionError && (
        <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-4 text-xs text-red-400 flex items-start space-x-2">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500" />
          <div>
            <p className="font-bold">Integration Connection Failed</p>
            <p className="text-[10px] text-red-400/80 mt-0.5">
              Reason: {connectionError === 'forbidden_connection' ? 'Forbidden permission' : 'Connection callback rejected.'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Workspace Form Card */}
        <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl backdrop-blur-xl space-y-6">
          <h3 className="text-base font-bold text-slate-100 flex items-center">
            <Building className="h-5 w-5 mr-2 text-cyan-400" />
            <span>Workspace Settings</span>
          </h3>

          <form onSubmit={handleUpdateSettings} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Workspace Name</label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Timezone Configuration</label>
              <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
                <Globe className="h-4 w-4 text-slate-600 mr-2" />
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-100 focus:outline-none"
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                </select>
              </div>
            </div>

            {updateSuccess && (
              <p className="text-xs font-semibold text-emerald-400">Workspace settings saved successfully.</p>
            )}

            <button
              type="submit"
              disabled={isUpdating}
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 px-5 py-2.5 text-xs font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* GitHub Integration card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center">
              <RefreshCw className="h-5 w-5 mr-2 text-cyan-400" />
              <span>GitHub App Integration</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drevlo connects to your organization via a GitHub App to ingest code activities, branches, pull requests, and review states.
            </p>
          </div>

          <div className="space-y-4">
            {isConnected ? (
              <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                  <span>CONNECTED</span>
                </div>
                <div className="text-[10px] text-slate-500 space-y-1">
                  <p>Installation ID: <code className="text-slate-400">{activeTeam?.githubOrg}</code></p>
                  <p>Webhooks: <span className="text-emerald-400">ACTIVE</span></p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-center">
                <p className="text-xs text-slate-400">GitHub is not connected to this workspace.</p>
              </div>
            )}

            <button
              onClick={handleGitHubConnect}
              className={`flex w-full items-center justify-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 active:scale-[0.98] ${
                isConnected
                  ? 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
              }`}
            >
              <span>{isConnected ? 'Configure Integration' : 'Connect GitHub App'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
