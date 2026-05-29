'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  GitCommit,
  GitPullRequest,
  Calendar,
  TrendingUp,
  ArrowRight,
  Shield,
  Zap,
  ArrowUpRight,
  Code2,
  CheckCircle2,
} from 'lucide-react';

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

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Call the check auth endpoint to see if user session is active
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) {
          setIsLoggedIn(true);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-cyan-500 selection:text-slate-900 overflow-x-hidden relative">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-cyan-950/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-[20%] left-0 h-[600px] w-[600px] rounded-full bg-indigo-950/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-[10%] h-[500px] w-[500px] rounded-full bg-cyan-950/5 blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative z-10 border-b border-slate-900/60 bg-slate-950/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-lg shadow-cyan-500/10">
              <span className="text-base font-extrabold text-slate-950">D</span>
            </div>
            <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-slate-100 to-cyan-100 bg-clip-text text-transparent group-hover:text-cyan-400 transition-colors">
              DREVLO
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-transparent" />
            ) : isLoggedIn ? (
              <Link
                href="/dashboard"
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 px-4 py-2.5 text-xs font-black tracking-wider shadow-lg shadow-cyan-500/10 flex items-center space-x-1.5 transition-all duration-200 active:scale-[0.98]"
              >
                <span>ENTER DASHBOARD</span>
                <ArrowRight className="h-3.5 w-3.5 stroke-[3.5]" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 px-4 py-2.5 text-xs font-black tracking-wider shadow-lg shadow-cyan-500/10 transition-all duration-200 active:scale-[0.98]"
              >
                GET STARTED
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-28 text-center space-y-8">
        <div className="inline-flex items-center space-x-2 rounded-full border border-cyan-500/20 bg-cyan-950/10 px-3.5 py-1.5 text-xs font-bold text-cyan-400">
          <Sparkles className="h-4 w-4" />
          <span>Ingest raw activity. Process insights. Ship faster.</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-100 leading-[1.1] max-w-4xl mx-auto">
          Your team. <br className="sm:hidden" />
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
            Your velocity.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
          Drevlo turns raw GitHub commits, pull requests, and review latency metrics into real-time developer productivity intelligence, powered by Google Gemini 2.5 Flash.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href={isLoggedIn ? '/dashboard' : '/login'}
            className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 px-8 py-3.5 text-sm font-black tracking-wider shadow-xl shadow-cyan-500/15 flex items-center justify-center space-x-2 transition-all duration-200 active:scale-[0.98]"
          >
            <span>{isLoggedIn ? 'ENTER DASHBOARD' : 'CONNECT GITHUB TO LOG IN'}</span>
            <GitHubIcon className="h-4 w-4 fill-slate-950 stroke-0" />
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-slate-200 px-8 py-3.5 text-sm font-bold flex items-center justify-center space-x-1.5 transition-colors"
          >
            <span>Explore Features</span>
          </a>
        </div>

        {/* Dashboard Mockup Preview */}
        <div className="pt-12 max-w-5xl mx-auto">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/10 p-2 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 to-indigo-500/5 pointer-events-none" />
            <div className="rounded-xl border border-slate-900 bg-slate-950/70 p-6 flex flex-col space-y-6 text-left relative">
              
              {/* Fake UI Header */}
              <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <div className="h-3 w-3 rounded-full bg-green-500/80" />
                </div>
                <div className="rounded-lg bg-slate-900 border border-slate-800/80 px-4 py-1 text-[10px] font-bold text-slate-500 tracking-wider">
                  DASHBOARD OVERVIEW
                </div>
              </div>

              {/* Fake UI Main Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-900 bg-slate-900/30 p-4 space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Active Sprint</span>
                  <span className="text-xl font-black text-slate-200 block">Sprint 3 - Core AI</span>
                  <span className="text-[10px] text-cyan-400 font-bold">12 / 15 PRs Merged</span>
                </div>
                <div className="rounded-xl border border-slate-900 bg-slate-900/30 p-4 space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">PR Turnaround (p50)</span>
                  <span className="text-xl font-black text-slate-200 block">14.6 Hours</span>
                  <span className="text-[10px] text-emerald-400 font-bold">↓ 4.2 Hours this week</span>
                </div>
                <div className="rounded-xl border border-slate-900 bg-slate-900/30 p-4 space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Team Health Index</span>
                  <span className="text-xl font-black text-slate-200 block">86 / 100</span>
                  <span className="text-[10px] text-indigo-400 font-bold">Excellent Velocity</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-900/60 space-y-16">
        <div className="text-center space-y-3">
          <h2 className="text-xs font-black tracking-widest text-cyan-400 uppercase">Built for Modern Teams</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
            Stop Guessing. Measure Velocity.
          </h3>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Drevlo integrates seamlessly with your GitHub org to sync commits and PR events, calculations, and AI feedback.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 space-y-4 shadow-lg hover:border-slate-800 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-cyan-950/40 border border-cyan-800/30 text-cyan-400 flex items-center justify-center">
              <GitCommit className="h-5 w-5" />
            </div>
            <h4 className="text-lg font-extrabold text-slate-200">Commit heatmaps</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Track developer commit distributions and activity densities over custom ranges. Map individual schedules and detect burnout.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 space-y-4 shadow-lg hover:border-slate-800 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-indigo-950/40 border border-indigo-800/30 text-indigo-400 flex items-center justify-center">
              <GitPullRequest className="h-5 w-5" />
            </div>
            <h4 className="text-lg font-extrabold text-slate-200">PR Cycle Time</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Measure exactly how long PRs sit in review. Identify latency bottlenecks, reviewer response rates, and review densities.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 space-y-4 shadow-lg hover:border-slate-800 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-cyan-950/40 border border-cyan-800/30 text-cyan-400 flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <h4 className="text-lg font-extrabold text-slate-200">Daily Standup Tracker</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Log daily updates with strict duplicate submission validation. View structured feeds and timelines customized to your workspace timezone.
            </p>
          </div>
        </div>

        {/* AI Showcase Grid */}
        <div className="rounded-2xl border border-slate-900 bg-gradient-to-r from-slate-900/60 to-indigo-950/15 p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center shadow-xl">
          <div className="space-y-4 text-left">
            <div className="inline-flex items-center space-x-1.5 text-indigo-400 text-xs font-bold tracking-widest uppercase">
              <Zap className="h-4 w-4" />
              <span>Gemini 2.5 Flash Layer</span>
            </div>
            <h4 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight leading-tight">
              Actionable AI Insights on Autopilot
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              We feed raw GitHub sync patterns, PR cycle times, and standup blockers to Google Gemini. Drevlo aggregates these data models to generate Team Health Indexes and detailed Sprint Retrospectives on demand.
            </p>
            <ul className="space-y-2 text-xs text-slate-300 font-semibold">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Automated standup summaries every morning</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>On-demand Team Health Scores (0-100)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>End-of-sprint retrospective recommendations</span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-900 bg-slate-950 p-6 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">AI RECOMMENDATIONS</span>
              <Sparkles className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="space-y-3 font-medium">
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-cyan-400">Review Turnaround:</strong> PR review latency averages 18 hours. Recommend assigning primary/secondary reviewers during sprint planning to distribute review load.
              </p>
              <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-900 pt-3">
                <strong className="text-indigo-400">Scope Stability:</strong> 3 commits were pushed directly to production. Ensure branch protection rule checks are active on release branches.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-t border-slate-900/60 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-xs font-black tracking-widest text-indigo-400 uppercase">PRICING TIERS</h2>
          <h3 className="text-3xl font-extrabold text-slate-100 tracking-tight">Flexible plans for any team size</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Tier */}
          <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <h4 className="text-base font-extrabold text-slate-300">Free tier</h4>
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-black text-slate-100">$0</span>
                <span className="text-xs text-slate-500 font-bold">/ forever</span>
              </div>
              <p className="text-xs text-slate-400">Perfect for small open-source teams or personal evaluations.</p>
            </div>
            <ul className="space-y-2 text-xs text-slate-300 font-semibold border-t border-slate-900 pt-4">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-slate-500 shrink-0" />
                <span>Max 4 team members</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-slate-500 shrink-0" />
                <span>Max 3 connected repositories</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-slate-500 shrink-0" />
                <span>Daily automated standup crons</span>
              </li>
            </ul>
            <Link
              href="/login"
              className="rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-slate-900 text-center py-2.5 text-xs font-bold text-slate-300 transition-colors"
            >
              Sign Up Free
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-slate-950 p-8 flex flex-col justify-between space-y-6 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-cyan-500/5 blur-[30px] pointer-events-none" />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-extrabold text-cyan-400">Drevlo Pro</h4>
                <span className="rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] px-2 py-0.5 font-bold">
                  RECOMMENDED
                </span>
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-black text-slate-100">$9</span>
                <span className="text-xs text-slate-500 font-bold">/ dev / month</span>
              </div>
              <p className="text-xs text-slate-400">Scale velocity tracking, unlock team insights, and remove restrictions.</p>
            </div>
            <ul className="space-y-2 text-xs text-slate-300 font-semibold border-t border-slate-900 pt-4">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Unlimited team members</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Unlimited connected repositories</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>On-demand AI Retrospectives</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>On-demand AI Health Score regeneration</span>
              </li>
            </ul>
            <Link
              href="/login"
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 text-center py-2.5 text-xs font-black tracking-wider shadow-lg shadow-cyan-500/10 transition-all duration-200 active:scale-[0.98]"
            >
              Upgrade Workspace
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-900/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] font-black text-slate-400">D</span>
          </div>
          <span>&copy; {new Date().getFullYear()} Drevlo Inc. All rights reserved.</span>
        </div>
        <div className="flex space-x-6">
          <Link href="/login" className="hover:text-slate-300">Auth Portal</Link>
          <a href="https://github.com" target="_blank" className="hover:text-slate-300 flex items-center">
            GitHub <ArrowUpRight className="h-3 w-3 ml-0.5" />
          </a>
        </div>
      </footer>
    </div>
  );
}
