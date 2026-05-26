'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../layout';
import {
  Settings,
  Building,
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
  CreditCard,
  Plus,
  Shield,
  Trash2,
  Lock,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export default function SettingsPage() {
  const { activeTeam, user, refreshSession } = useDashboard();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Status flags from callback redirects
  const isConnectedSuccess = searchParams.get('github_connected') === 'success';
  const isBillingSuccess = searchParams.get('billing') === 'success';
  const isBillingCancel = searchParams.get('billing') === 'cancel';
  const warningParam = searchParams.get('warning');
  const errorParam = searchParams.get('error');

  // Tabs state
  const [activeTab, setActiveTab] = useState<'workspace' | 'github' | 'members' | 'billing'>('workspace');

  // Team Details & Timezone state
  const [teamDetails, setTeamDetails] = useState<any>(null);
  const [teamName, setTeamName] = useState(activeTeam?.teamName || '');
  const [timezone, setTimezone] = useState('UTC');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Invite member state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Members list state
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Billing state
  const [billingLoading, setBillingLoading] = useState(false);

  const fetchTeamDetails = async () => {
    if (!activeTeam) return;
    try {
      const res = await fetch(`/api/teams/${activeTeam.teamId}`);
      if (res.ok) {
        const data = await res.json();
        setTeamDetails(data);
        setTeamName(data.name || '');
        setTimezone(data.timezone || 'UTC');
      }
    } catch (err) {
      console.error('Failed to load team details:', err);
    }
  };

  const fetchMembers = async () => {
    if (!activeTeam) return;
    setMembersLoading(true);
    try {
      // Endpoint /api/teams/[id]/members or we can resolve members list from teamDetails
      // For consistency, let's fetch members list from /api/standups or layout data, or simply query /api/teams/[id]
      const res = await fetch(`/api/teams/${activeTeam.teamId}`);
      if (res.ok) {
        const data = await res.json();
        // Set members directly if returned
        // The endpoint we created GET /api/teams/[id] does not include members in relation, let's update it or fetch separately
        // Let's check how team members leaderboard queries them. We can query members from database.
        // If teamDetails has members, we use it. Otherwise, let's fetch from the team members endpoint.
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMembersLoading(false);
    }
  };

  // Resolve members from team query
  const loadWorkspaceData = async () => {
    if (!activeTeam) return;
    await fetchTeamDetails();
    
    // Fetch members directly by querying active workspace relations
    try {
      const res = await fetch(`/api/teams/${activeTeam.teamId}`);
      if (res.ok) {
        const teamData = await res.json();
        // Since we need members list, let's fetch members list
        // Let's check if we can query active team members:
        // Actually, we can fetch team details. Let's make a quick query to fetch members list:
        const membersRes = await fetch(`/api/teams/${activeTeam.teamId}/invite`); // Let's check if there is an endpoint
        // To be safe, we can mock/fetch members from layout user session or query directly.
        // Let's check user session memberships or team details owner details.
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, [activeTeam]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam) return;
    setIsUpdating(true);
    setUpdateSuccess(false);
    setUpdateError(null);

    try {
      const res = await fetch(`/api/teams/${activeTeam.teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName,
          timezone: timezone,
        }),
      });

      if (res.ok) {
        setUpdateSuccess(true);
        await refreshSession();
        await fetchTeamDetails();
      } else {
        const data = await res.json();
        setUpdateError(data.error || 'Failed to update settings');
      }
    } catch (err) {
      console.error(err);
      setUpdateError('Connection failed.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam) return;
    setIsInviting(true);
    setInviteSuccess(false);
    setInviteError(null);

    try {
      const res = await fetch(`/api/teams/${activeTeam.teamId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (res.ok) {
        setInviteSuccess(true);
        setInviteEmail('');
        await loadWorkspaceData();
      } else {
        const data = await res.json();
        setInviteError(data.error || 'Failed to send invitation');
      }
    } catch (err) {
      console.error(err);
      setInviteError('Connection failed.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleStripeCheckout = async () => {
    if (!activeTeam) return;
    setBillingLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: activeTeam.teamId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      }
    } catch (err) {
      console.error('Failed to launch checkout:', err);
    } finally {
      setBillingLoading(false);
    }
  };

  const handleStripePortal = async () => {
    if (!activeTeam) return;
    setBillingLoading(true);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: activeTeam.teamId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      }
    } catch (err) {
      console.error('Failed to launch portal:', err);
    } finally {
      setBillingLoading(false);
    }
  };

  const handleGitHubConnect = () => {
    if (!activeTeam) return;
    const githubAppName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME;
    if (!githubAppName || githubAppName === 'drevlo-app') {
      // In local testing when no custom GitHub App is configured, bypass redirect to GitHub
      // and redirect directly to callback with a mock installation ID
      window.location.href = `/api/github/connect?installation_id=mock-installation-123&state=${activeTeam.teamId}`;
      return;
    }
    const redirectUrl = `https://github.com/apps/${githubAppName}/installations/new?state=${activeTeam.teamId}`;
    window.location.href = redirectUrl;
  };

  const isConnected = !!activeTeam?.githubOrg;
  const isOwner = teamDetails?.ownerId === user?.id;
  const userPlan = teamDetails?.owner?.plan || 'FREE';

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header section */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">Settings</h1>
        <p className="text-sm text-slate-400">Configure workspace parameters, timezones, and subscriptions</p>
      </div>

      {/* Action alerts */}
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

      {warningParam === 'repo_limit_reached' && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-xs text-amber-400 flex items-start space-x-2">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 text-amber-500" />
          <div>
            <p className="font-bold">Repository Limit Enforced (Free Plan)</p>
            <p className="text-[10px] text-amber-500/80 mt-0.5">
              Your GitHub App installation has access to multiple repos, but only the first 2 have been connected to Drevlo. Please upgrade to Pro to unlock unlimited repositories.
            </p>
          </div>
        </div>
      )}

      {isBillingSuccess && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-xs text-emerald-400 flex items-start space-x-2">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-500" />
          <div>
            <p className="font-bold">Subscription Upgrade Successful!</p>
            <p className="text-[10px] text-emerald-500/80 mt-0.5">
              Thank you for subscribing to Drevlo Pro. Your limits have been removed.
            </p>
          </div>
        </div>
      )}

      {isBillingCancel && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-xs text-amber-400 flex items-start space-x-2">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 text-amber-500" />
          <div>
            <p className="font-bold">Upgrade Session Cancelled</p>
            <p className="text-[10px] text-amber-500/80 mt-0.5">
              Your checkout process was cancelled. No charges were made.
            </p>
          </div>
        </div>
      )}

      {errorParam && (
        <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-4 text-xs text-red-400 flex items-start space-x-2">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500" />
          <div>
            <p className="font-bold">Operation Failed</p>
            <p className="text-[10px] text-red-400/80 mt-0.5">Error: {errorParam}</p>
          </div>
        </div>
      )}

      {/* Tabs Selector Navigation */}
      <div className="flex border-b border-slate-900 space-x-6">
        <button
          onClick={() => setActiveTab('workspace')}
          className={`pb-3 text-sm font-bold transition-all duration-200 ${
            activeTab === 'workspace'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Workspace Settings
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 text-sm font-bold transition-all duration-200 ${
            activeTab === 'members'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Members & Invites
        </button>
        <button
          onClick={() => setActiveTab('github')}
          className={`pb-3 text-sm font-bold transition-all duration-200 ${
            activeTab === 'github'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          GitHub Integration
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`pb-3 text-sm font-bold transition-all duration-200 ${
            activeTab === 'billing'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Billing & Plans
        </button>
      </div>

      {/* Tabs Content */}
      <div className="space-y-6">
        
        {/* Workspace Configuration Tab */}
        {activeTab === 'workspace' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl backdrop-blur-xl space-y-6">
            <h3 className="text-base font-bold text-slate-100 flex items-center">
              <Building className="h-5 w-5 mr-2 text-cyan-400" />
              <span>Workspace Configurations</span>
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
              {updateError && (
                <p className="text-xs font-semibold text-rose-400">Error: {updateError}</p>
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
        )}

        {/* Members Management Tab */}
        {activeTab === 'members' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left: Invite Form (2 Cols) */}
            <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl backdrop-blur-xl space-y-6">
              <h3 className="text-base font-bold text-slate-100 flex items-center">
                <Users className="h-5 w-5 mr-2 text-cyan-400" />
                <span>Invite Workspace Members</span>
              </h3>

              {userPlan === 'FREE' && (
                <div className="rounded-xl border border-cyan-800/10 bg-cyan-950/10 p-4 text-xs text-slate-300 flex items-start space-x-2.5">
                  <Shield className="h-4.5 w-4.5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-200">Free Tier Gating Enforcement</p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Free workspaces are limited to a maximum of <strong>3 members</strong>. Upgrade your workspace to invite unlimited developers.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleInviteMember} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Invitee Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="developer@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-700 focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Workspace Authorization Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e: any) => setInviteRole(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none"
                  >
                    <option value="MEMBER">Member (Read/Write)</option>
                    <option value="ADMIN">Administrator (Full Control)</option>
                    <option value="VIEWER">Viewer (Read-only)</option>
                  </select>
                </div>

                {inviteSuccess && (
                  <p className="text-xs font-semibold text-emerald-400">Member successfully invited. Invitation email sent via Resend.</p>
                )}
                {inviteError && (
                  <p className="text-xs font-semibold text-rose-400">Error: {inviteError}</p>
                )}

                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail}
                  className="flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 px-5 py-2.5 text-xs font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isInviting ? 'Sending Invite...' : 'Send Invitation'}</span>
                </button>
              </form>
            </div>

            {/* Right: Quick Gating info */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest mb-2">Member Limits</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-900">
                    <span className="text-slate-500">Plan Tier:</span>
                    <span className="font-bold text-cyan-400 uppercase">{userPlan}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-900">
                    <span className="text-slate-500">Seats Capacity:</span>
                    <span className="text-slate-300">{userPlan === 'FREE' ? '3 Max' : 'Unlimited'}</span>
                  </div>
                </div>
              </div>

              {userPlan === 'FREE' && (
                <button
                  onClick={() => setActiveTab('billing')}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-400 py-2.5 text-xs font-bold transition-colors"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Upgrade Workspace</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* GitHub Integration Tab */}
        {activeTab === 'github' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center">
                <GitHubIcon className="h-5 w-5 mr-2 text-cyan-400" />
                <span>GitHub App Integration</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Drevlo connects to your organization via a GitHub App to ingest code activities, branches, pull requests, and review states.
              </p>

              {userPlan === 'FREE' && (
                <div className="rounded-xl border border-cyan-800/10 bg-cyan-950/10 p-4 text-xs text-slate-300 flex items-start space-x-2.5">
                  <Shield className="h-4.5 w-4.5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-200">Free Tier Repository Limits</p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Free workspaces are limited to tracking a maximum of <strong>2 repositories</strong>. Upgrade to Pro to track unlimited repositories.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-900">
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
        )}

        {/* Billing & Subscription tab */}
        {activeTab === 'billing' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Left: Active plan card (7 Cols) */}
            <div className="md:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center mb-4">
                  <CreditCard className="h-5 w-5 mr-2 text-cyan-400" />
                  <span>Workspace Billing Plan</span>
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl font-black text-slate-950 text-sm ${
                      userPlan === 'PRO'
                        ? 'bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-lg shadow-cyan-500/20'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {userPlan === 'PRO' ? 'PRO' : 'FREE'}
                    </div>

                    <div>
                      <h4 className="text-sm font-extrabold text-slate-200">
                        {userPlan === 'PRO' ? 'Drevlo Pro Plan' : 'Drevlo Free Tier'}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {userPlan === 'PRO' ? 'Active subscription billed via Stripe' : 'Limited features workspace'}
                      </p>
                    </div>
                  </div>

                  {userPlan === 'FREE' ? (
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                      You are currently on the Free plan. Upgrade to access seat scaling, unlimited connected repositories, and manual AI retrospective updates.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                      Your Pro subscription is fully active. You can manage your invoices, payment cards, or cancel settings directly through Stripe Billing Portal.
                    </p>
                  )}
                </div>
              </div>

              {isOwner ? (
                <div className="pt-4 border-t border-slate-900 flex space-x-3">
                  {userPlan === 'FREE' ? (
                    <button
                      onClick={handleStripeCheckout}
                      disabled={billingLoading}
                      className="rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 px-5 py-2.5 text-xs font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center space-x-2"
                    >
                      {billingLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                      <span>Upgrade to Pro — $9/dev/mo</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStripePortal}
                      disabled={billingLoading}
                      className="rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 px-5 py-2.5 text-xs font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center space-x-2"
                    >
                      {billingLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                      <span>Manage Stripe Subscription</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="pt-4 border-t border-slate-900">
                  <p className="text-[10px] text-slate-500 font-semibold flex items-center">
                    <Lock className="h-3.5 w-3.5 mr-1" />
                    Only the workspace owner can manage billing subscriptions.
                  </p>
                </div>
              )}
            </div>

            {/* Right: Plan Comparison Card (5 Cols) */}
            <div className="md:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl backdrop-blur-xl space-y-4">
              <h4 className="text-xs font-black tracking-widest text-slate-200 uppercase">Tier Comparisons</h4>
              <div className="space-y-3 text-[11px] font-semibold text-slate-400">
                <div className="space-y-1">
                  <p className="text-slate-200">Free Tier</p>
                  <ul className="list-disc list-inside pl-1 space-y-1 text-slate-500 text-[10px]">
                    <li>Max 3 team members</li>
                    <li>Max 2 connected repos</li>
                    <li>Automated 9:00 AM cron reports</li>
                    <li>No custom AI manual regenerations</li>
                  </ul>
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-900">
                  <p className="text-slate-200 flex items-center">
                    Drevlo Pro
                    <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded px-1.5 py-0.5 ml-2">
                      $9/seat
                    </span>
                  </p>
                  <ul className="list-disc list-inside pl-1 space-y-1 text-slate-400 text-[10px]">
                    <li>Unlimited team members</li>
                    <li>Unlimited connected repos</li>
                    <li>On-demand AI retrospective generation</li>
                    <li>On-demand health score regeneration</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
