'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../layout';
import { Calendar, User, Clock, CheckCircle2, AlertCircle, Plus, BookOpen, Send } from 'lucide-react';
import { format } from 'date-fns';

interface StandupEntry {
  id: string;
  date: string;
  aiSummary: string | null;
  author: {
    id: string;
    name: string;
    email: string;
  };
  yesterday: string;
  today: string;
  blockers: string;
}

export default function StandupsPage() {
  const { user, activeTeam } = useDashboard();
  const [standups, setStandups] = useState<StandupEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [yesterday, setYesterday] = useState('');
  const [today, setToday] = useState('');
  const [blockers, setBlockers] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchStandups = async () => {
    if (!activeTeam) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/standups?teamId=${activeTeam.teamId}`);
      if (res.ok) {
        const data = await res.json();
        setStandups(data.standups || []);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load standup records');
      }
    } catch (err) {
      console.error('Failed to load standups:', err);
      setError('Connection failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStandups();
  }, [activeTeam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const res = await fetch('/api/standups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: activeTeam.teamId,
          yesterday,
          today,
          blockers: blockers || 'None',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitSuccess(true);
        setYesterday('');
        setToday('');
        setBlockers('');
        await fetchStandups(); // Refresh logs feed
      } else {
        setSubmitError(data.error || 'Failed to submit standup entry');
      }
    } catch (err) {
      console.error('Standup submission failed:', err);
      setSubmitError('Failed to establish server connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if current user has already submitted a standup for today
  const hasSubmittedToday = standups.some((s) => {
    if (s.author.id !== user?.id) return false;
    
    // Check if the standup date matches today's calendar date
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const standupDateStr = format(new Date(s.date), 'yyyy-MM-dd');
    return todayStr === standupDateStr;
  });

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header section */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">Daily Standups</h1>
        <p className="text-sm text-slate-400">Log yesterday's achievements, today's targets, and identify blockers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left columns: Standup Logs Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl backdrop-blur-xl">
            <h3 className="text-base font-bold text-slate-100 mb-6 flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-cyan-400" />
              <span>Team Updates Feed</span>
            </h3>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-900 bg-slate-950/20 animate-pulse space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-32 bg-slate-800 rounded" />
                      <div className="h-3 w-16 bg-slate-900 rounded" />
                    </div>
                    <div className="h-3 w-full bg-slate-800 rounded" />
                    <div className="h-3 w-3/4 bg-slate-800 rounded" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-4 text-xs text-red-400 flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            ) : standups.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No standup entries logged in this workspace yet.
              </div>
            ) : (
              <div className="space-y-6">
                {standups.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-5 rounded-xl border border-slate-900 bg-slate-950/40 space-y-4 hover:border-slate-800/80 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-6 w-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300">
                          {entry.author.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-slate-200">{entry.author.name}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        {format(new Date(entry.date), 'MMM d, yyyy')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Yesterday</span>
                        <p className="text-slate-300 bg-slate-900/50 p-2.5 rounded-lg border border-slate-900/40 leading-relaxed">
                          {entry.yesterday}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Today</span>
                        <p className="text-slate-300 bg-slate-900/50 p-2.5 rounded-lg border border-slate-900/40 leading-relaxed">
                          {entry.today}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Blockers</span>
                        <p className={`p-2.5 rounded-lg border leading-relaxed ${
                          entry.blockers.toLowerCase() !== 'none'
                            ? 'text-red-400 bg-red-950/5 border-red-900/20'
                            : 'text-slate-400 bg-slate-900/50 border-slate-900/40'
                        }`}>
                          {entry.blockers}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Standup Form */}
        <div>
          {hasSubmittedToday ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/10 p-6 text-center space-y-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-300">Standup Submitted</h3>
                <p className="text-xs text-slate-500">
                  You have already logged your standup report for today. See the feed for your update!
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl backdrop-blur-xl space-y-6">
              <h3 className="text-base font-bold text-slate-100 flex items-center">
                <Plus className="h-5 w-5 mr-2 text-cyan-400" />
                <span>Submit Standup</span>
              </h3>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    What did you do yesterday?
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Worked on JWT session middleware verification and added auth routes"
                    value={yesterday}
                    onChange={(e) => setYesterday(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none transition-colors resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    What will you do today?
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Set up Recharts graphics for cycle times and leaderboard sorting"
                    value={today}
                    onChange={(e) => setToday(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none transition-colors resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Blockers (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Waiting on GitHub App client credential registration keys"
                    value={blockers}
                    onChange={(e) => setBlockers(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none transition-colors resize-none"
                  />
                </div>

                {submitError && (
                  <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-3 text-xs text-red-400 flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{submitError}</span>
                  </div>
                )}

                {submitSuccess && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-emerald-400 flex items-start space-x-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>Standup logged successfully!</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !yesterday || !today}
                  className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 px-4 py-2.5 text-xs font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Entry'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
