'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../layout';
import TeamLeaderboard from '@/components/dashboard/leaderboard';
import { Users, UserPlus, Trash2, AlertCircle, CheckCircle, Mail, ShieldAlert } from 'lucide-react';

interface LeaderboardMember {
  userId: string;
  name: string;
  commits: number;
  prs: number;
  reviews: number;
  score: number;
}

export default function TeamPage() {
  const { user, activeTeam, refreshSession } = useDashboard();
  
  // Leaderboard data state
  const [leaderboardMembers, setLeaderboardMembers] = useState<LeaderboardMember[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);

  // Invite member form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Remove member states
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    if (!activeTeam) return;
    setIsLoadingLeaderboard(true);
    try {
      const res = await fetch(`/api/analytics/leaderboard?teamId=${activeTeam.teamId}`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboardMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTeam]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam) return;

    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const res = await fetch(`/api/teams/${activeTeam.teamId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();

      if (res.ok) {
        setInviteSuccess(`Successfully added ${inviteEmail} to the team!`);
        setInviteEmail('');
        await refreshSession(); // Refresh list of members in session
        await fetchLeaderboard(); // Refresh leaderboard data
      } else {
        setInviteError(data.error || 'Failed to send invitation');
      }
    } catch (err) {
      console.error('Invitation error:', err);
      setInviteError('Connection failed. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (targetUid: string, targetName: string) => {
    if (!activeTeam) return;
    if (!confirm(`Are you sure you want to remove ${targetName} from the workspace?`)) return;

    setRemovingUserId(targetUid);
    try {
      const res = await fetch(`/api/teams/${activeTeam.teamId}/members/${targetUid}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await refreshSession();
        await fetchLeaderboard();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove member');
      }
    } catch (err) {
      console.error('Remove member error:', err);
      alert('Failed to delete member due to connection issues.');
    } finally {
      setRemovingUserId(null);
    }
  };

  const isAdmin = activeTeam?.role === 'ADMIN';

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">Team Management</h1>
        <p className="text-sm text-slate-400">Invite collaborators, configure roles, and inspect team contribution metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Leaderboard & Workspace Members */}
        <div className="lg:col-span-2 space-y-8">
          {/* Leaderboard visualization */}
          {isLoadingLeaderboard ? (
            <div className="h-64 bg-slate-900/10 border border-slate-850 animate-pulse rounded-2xl flex items-center justify-center">
              <p className="text-xs text-slate-500">Loading team leaderboard...</p>
            </div>
          ) : (
            <TeamLeaderboard members={leaderboardMembers} />
          )}

          {/* Members list (Admin actions) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl backdrop-blur-xl">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-cyan-400" />
              <span>Workspace Members</span>
            </h3>

            <div className="divide-y divide-slate-900">
              {user?.memberships
                .filter((m) => m.teamId === activeTeam?.teamId)
                .map((m) => (
                  <div key={user.id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-9 w-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{user.name} (You)</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] px-2.5 py-0.5 font-bold uppercase">
                        {m.role}
                      </span>
                    </div>
                  </div>
                ))}

              {/* In a real workspace page we'd fetch all members in this team from /api/teams/:id but since user memberships is cached in session, we show simulated other members if any, or list them if we have database query. Let's keep it simple for the MVP */}
            </div>
          </div>
        </div>

        {/* Right column: Invite Member Form */}
        <div>
          {isAdmin ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl backdrop-blur-xl space-y-6">
              <div className="flex items-center space-x-2 text-slate-100">
                <UserPlus className="h-5 w-5 text-cyan-400" />
                <h3 className="text-base font-bold">Invite Collaborator</h3>
              </div>

              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                  <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
                    <Mail className="h-4 w-4 text-slate-600 mr-2" />
                    <input
                      type="email"
                      required
                      placeholder="developer@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Workspace Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none transition-colors"
                  >
                    <option value="MEMBER">Member (Read/Write)</option>
                    <option value="ADMIN">Admin (Full Access)</option>
                    <option value="VIEWER">Viewer (Read-only)</option>
                  </select>
                </div>

                {inviteError && (
                  <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-3 text-xs text-red-400 flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{inviteError}</span>
                  </div>
                )}

                {inviteSuccess && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-emerald-400 flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{inviteSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail}
                  className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 px-4 py-2.5 text-xs font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                >
                  {isInviting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  <span>{isInviting ? 'Inviting...' : 'Send Invite'}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/10 p-6 text-center space-y-4">
              <ShieldAlert className="h-10 w-10 text-slate-500 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-300">Invite Restricted</h3>
                <p className="text-xs text-slate-500">
                  Only team Admins can invite new members or configure workspace access roles.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
