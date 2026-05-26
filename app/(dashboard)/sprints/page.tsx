'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../layout';
import {
  Calendar,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Clock,
  ArrowRight,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
} from 'recharts';

interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  velocity: number; // Target Velocity
  actualVelocity?: number;
}

export default function SprintsPage() {
  const { activeTeam, user } = useDashboard();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sprintName, setSprintName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [targetVelocity, setTargetVelocity] = useState(10);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Mode States (Optional, but nice for polish)
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

  const fetchSprints = async () => {
    if (!activeTeam) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sprints?teamId=${activeTeam.teamId}`);
      if (res.ok) {
        const data = await res.json();
        setSprints(data.sprints || []);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to load sprints.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failed. Could not reach server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSprints();
  }, [activeTeam]);

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam) return;
    setFormSubmitting(true);
    setFormError(null);

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      setFormError('Start date must be before the end date.');
      setFormSubmitting(false);
      return;
    }

    try {
      const payload = {
        teamId: activeTeam.teamId,
        name: sprintName,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        velocity: Number(targetVelocity),
      };

      const res = await fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setSprintName('');
        setStartDate('');
        setEndDate('');
        setTargetVelocity(10);
        await fetchSprints();
      } else {
        const data = await res.json();
        setFormError(data.error || 'Failed to create sprint.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Failed to connect to the server.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    if (!confirm('Are you sure you want to delete this sprint? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/sprints/${sprintId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchSprints();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete sprint.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to the server.');
    }
  };

  if (!activeTeam) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-slate-400">
        <Calendar className="h-12 w-12 text-slate-600 mb-4 animate-pulse" />
        <p className="font-semibold text-lg">No active workspace selected</p>
        <p className="text-sm text-slate-500">Please select or create a team to manage sprints.</p>
      </div>
    );
  }

  const isAdmin = activeTeam.role === 'ADMIN';
  const isFreePlan = user?.plan !== 'PRO';

  // Group sprints by status
  const now = new Date();
  const activeSprint = sprints.find((s) => {
    const start = new Date(s.startDate);
    const end = new Date(s.endDate);
    return now >= start && now <= end;
  });

  const upcomingSprints = sprints
    .filter((s) => new Date(s.startDate) > now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const pastSprints = sprints
    .filter((s) => new Date(s.endDate) < now)
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

  // Formatter for Recharts
  const chartData = [...sprints]
    .reverse() // Display chronological order
    .map((s) => ({
      name: s.name,
      Target: s.velocity,
      Actual: s.actualVelocity || 0,
    }));

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 border-b border-slate-900 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-sm font-bold tracking-widest uppercase mb-1">
            <Calendar className="h-4 w-4" />
            <span>Workspace Operations</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Sprint Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Plan team iterations, track target velocities, and measure actual shipped PR outputs.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 px-4 py-2.5 text-xs font-black tracking-wider transition-all duration-200 active:scale-[0.98] shadow-lg shadow-cyan-500/10"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>CREATE NEW SPRINT</span>
          </button>
        )}
      </div>

      {loading && sprints.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
          <p className="text-xs text-slate-500 font-semibold">Fetching sprint metrics and velocities...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-950/20 border border-red-900/30 p-6 text-center text-sm text-red-400">
          <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sprints listing & grouping (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Active Sprint Section */}
            <div className="space-y-3">
              <h2 className="text-xs font-black tracking-widest text-slate-400 uppercase flex items-center">
                <span className="h-2 w-2 rounded-full bg-cyan-400 mr-2 animate-pulse" />
                Active Sprint
              </h2>
              {activeSprint ? (
                <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 to-slate-950 p-6 relative overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-cyan-500/5 blur-[40px] pointer-events-none" />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-black text-slate-100">{activeSprint.name}</h3>
                      <p className="text-xs text-slate-400 flex items-center font-medium">
                        <Clock className="h-3.5 w-3.5 mr-1 text-slate-500" />
                        {formatDate(activeSprint.startDate)} — {formatDate(activeSprint.endDate)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-6 shrink-0 pt-2 md:pt-0 border-t border-slate-900 md:border-t-0">
                      <div className="text-center">
                        <span className="text-[10px] block text-slate-500 font-bold uppercase tracking-wider">Target PRs</span>
                        <span className="text-xl font-extrabold text-slate-300">{activeSprint.velocity}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] block text-slate-500 font-bold uppercase tracking-wider">Actual Shipped</span>
                        <span className="text-xl font-extrabold text-cyan-400">{activeSprint.actualVelocity || 0}</span>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteSprint(activeSprint.id)}
                          className="text-slate-600 hover:text-rose-400 transition-colors p-1.5 hover:bg-slate-900 rounded-lg"
                          title="Delete Sprint"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-900 bg-slate-900/10 border-dashed p-6 text-center text-xs text-slate-500">
                  No sprint is currently active. Plan your next iteration by clicking "Create New Sprint".
                </div>
              )}
            </div>

            {/* Upcoming Sprints */}
            {upcomingSprints.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-black tracking-widest text-slate-400 uppercase">Upcoming Sprints</h2>
                <div className="space-y-3">
                  {upcomingSprints.map((sprint) => (
                    <div key={sprint.id} className="rounded-xl border border-slate-900 bg-slate-900/10 p-4 flex items-center justify-between hover:border-slate-800 transition-all">
                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-slate-200">{sprint.name}</h4>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <span className="text-[9px] block text-slate-500 font-bold uppercase tracking-wider">Target PRs</span>
                          <span className="text-xs font-extrabold text-slate-300">{sprint.velocity}</span>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteSprint(sprint.id)}
                            className="text-slate-600 hover:text-rose-400 transition-colors p-1"
                            title="Delete Sprint"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Sprints */}
            <div className="space-y-3">
              <h2 className="text-xs font-black tracking-widest text-slate-400 uppercase">Completed Sprints</h2>
              {pastSprints.length > 0 ? (
                <div className="space-y-3">
                  {pastSprints.map((sprint) => (
                    <div key={sprint.id} className="rounded-xl border border-slate-900 bg-slate-900/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-slate-800 transition-all">
                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-slate-300">{sprint.name}</h4>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-slate-900/60 sm:border-t-0 pt-2 sm:pt-0">
                        <div className="flex space-x-6 text-center sm:text-right">
                          <div>
                            <span className="text-[9px] block text-slate-500 font-bold uppercase tracking-wider">Target PRs</span>
                            <span className="text-xs font-extrabold text-slate-400">{sprint.velocity}</span>
                          </div>
                          <div>
                            <span className="text-[9px] block text-slate-500 font-bold uppercase tracking-wider">Actual</span>
                            <span className="text-xs font-extrabold text-slate-200">{sprint.actualVelocity || 0}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              window.location.href = `/insights?sprintId=${sprint.id}`;
                            }}
                            className="rounded-lg bg-indigo-950/40 border border-indigo-800/30 text-indigo-400 px-2.5 py-1.5 text-[10px] font-bold hover:bg-indigo-900/30 hover:text-indigo-300 flex items-center space-x-1"
                          >
                            <span>AI Retro</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteSprint(sprint.id)}
                              className="text-slate-600 hover:text-rose-400 transition-colors p-1"
                              title="Delete Sprint"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-slate-900/60 rounded-xl text-slate-500 text-xs">
                  No completed sprints yet.
                </div>
              )}
            </div>

          </div>

          {/* Velocity Charts (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl backdrop-blur-xl space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-200">Velocity Trends</h3>
                <p className="text-[10px] text-slate-500 font-bold tracking-wide uppercase mt-0.5">
                  Target vs Actual (Merged PRs)
                </p>
              </div>

              <div className="h-64 w-full">
                {chartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">
                    No completed sprints to visualize trends.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.15)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="rgb(100, 116, 139)"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        dy={8}
                      />
                      <YAxis
                        stroke="rgb(100, 116, 139)"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        dx={-8}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgb(15, 23, 42)',
                          borderColor: 'rgb(30, 41, 59)',
                          borderRadius: '12px',
                          color: 'rgb(241, 245, 249)',
                          fontSize: '10px',
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                      />
                      <Bar name="Actual Shipped" dataKey="Actual" fill="rgb(34, 211, 238)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Line name="Target Velocity" type="monotone" dataKey="Target" stroke="rgb(99, 102, 241)" strokeWidth={2} activeDot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* AI Integration Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-cyan-500/5 blur-[40px] pointer-events-none" />
              <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold tracking-widest uppercase mb-2">
                <Sparkles className="h-4 w-4" />
                <span>AI retrospective</span>
              </div>
              <h4 className="text-xs font-black text-slate-200 tracking-wider">How Velocity Drives AI Retros</h4>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed font-semibold">
                Drevlo analyzes completed sprints by parsing velocity variance, blocker notes from standup logs, and shipped commit patterns. Make sure team standups are populated daily for richer retrospective reports in the AI Insights Hub.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* Create Sprint Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-200 flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-cyan-400" />
                Create New Sprint
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sprint Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sprint 3 — Core Features"
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Target Velocity (Merged PR count)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={targetVelocity}
                  onChange={(e) => setTargetVelocity(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </div>

              {formError && (
                <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-3 text-xs text-red-400 flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={formSubmitting || !sprintName || !startDate || !endDate}
                className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 px-4 py-2.5 text-xs font-bold shadow-lg shadow-cyan-500/10 transition-all duration-200 active:scale-[0.99] disabled:opacity-50"
              >
                {formSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                ) : null}
                <span>{formSubmitting ? 'CREATING SPRINT...' : 'CREATE SPRINT'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
