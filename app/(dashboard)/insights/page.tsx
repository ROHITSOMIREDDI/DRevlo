'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../layout';
import { useSearchParams } from 'next/navigation';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Code2,
  Calendar,
  Lock,
  ChevronRight,
  TrendingUp,
  FileText,
  Clock,
  Zap,
} from 'lucide-react';

interface HealthReport {
  score: number;
  explanation: string;
  risks: string[];
  metrics?: {
    avgCycleTimeHours: number;
    commitsPerDevPerDay: number;
    avgReviewHours: number;
    standupCompletionRate: number;
    prsMerged: number;
  };
  cached?: boolean;
  generatedAt?: string;
}

interface ReviewInsight {
  id: string;
  type: string;
  generatedAt: string;
  parsedContent: {
    prId: string;
    prTitle: string;
    prNumber: number;
    insight: string;
    filesChanged: number;
    linesAdded: number;
    linesRemoved: number;
  };
}

export default function InsightsPage() {
  const { activeTeam, user } = useDashboard();

  // Health Score state
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Search params reader
  const searchParams = useSearchParams();

  // Retro state
  const [retroText, setRetroText] = useState<string | null>(null);
  const [retroLoading, setRetroLoading] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState('last_14_days');
  const [sprints, setSprints] = useState<any[]>([]);

  // Fetch Sprints list
  const fetchSprintsList = async () => {
    if (!activeTeam) return;
    try {
      const res = await fetch(`/api/sprints?teamId=${activeTeam.teamId}`);
      if (res.ok) {
        const data = await res.json();
        setSprints(data.sprints || []);
      }
    } catch (err) {
      console.error('Failed to load sprints list:', err);
    }
  };

  // Code Reviews state
  const [reviews, setReviews] = useState<ReviewInsight[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  // Fetch Health Score
  const getHealthScore = async (force = false) => {
    if (!activeTeam) return;
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await fetch(
        `/api/ai/health-score?teamId=${activeTeam.teamId}${force ? '&force=true' : ''}`
      );
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      } else {
        const errData = await res.json();
        setHealthError(errData.error || 'Failed to calculate health score');
      }
    } catch (err) {
      console.error(err);
      setHealthError('Failed to fetch health score from server');
    } finally {
      setHealthLoading(false);
    }
  };

  // Fetch Retro Report
  const getRetroReport = async (force = false) => {
    if (!activeTeam) return;
    setRetroLoading(true);
    try {
      const res = await fetch(
        `/api/ai/retro?teamId=${activeTeam.teamId}&sprintId=${selectedSprint}${force ? '&force=true' : ''}`
      );
      if (res.ok) {
        const data = await res.json();
        setRetroText(data.retro);
      } else {
        setRetroText('Failed to generate retro report. Please verify your team metrics.');
      }
    } catch (err) {
      console.error(err);
      setRetroText('An error occurred while connecting to the AI retro service.');
    } finally {
      setRetroLoading(false);
    }
  };

  // Fetch Historical Reports
  const getHistoricalReports = async () => {
    if (!activeTeam) return;
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/ai/reports?teamId=${activeTeam.teamId}`);
      if (res.ok) {
        const data = await res.json();
        const reportsList = data.reports || [];

        // Filter and parse review insights
        const parsedReviews: ReviewInsight[] = [];
        reportsList.forEach((r: any) => {
          if (r.type.startsWith('review_')) {
            try {
              parsedReviews.push({
                id: r.id,
                type: r.type,
                generatedAt: r.generatedAt,
                parsedContent: JSON.parse(r.content),
              });
            } catch (err) {
              console.error('Failed to parse review content:', r.content);
            }
          }
        });
        setReviews(parsedReviews);

        // Populate latest retro text if cached
        const latestRetro = reportsList.find((r: any) => r.type === `retro_${selectedSprint}`);
        if (latestRetro) {
          setRetroText(latestRetro.content);
        } else {
          setRetroText(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewsLoading(false);
    }
  };

  // Load everything on mount or workspace change
  useEffect(() => {
    if (activeTeam) {
      fetchSprintsList();
      getHealthScore(false);
    }
  }, [activeTeam]);

  // Handle URL sprintId query param
  useEffect(() => {
    const urlSprintId = searchParams.get('sprintId');
    if (urlSprintId) {
      setSelectedSprint(urlSprintId);
    }
  }, [searchParams]);

  // Load reports when activeTeam or selectedSprint changes
  useEffect(() => {
    if (activeTeam) {
      getHistoricalReports();
    }
  }, [activeTeam, selectedSprint]);

  if (!activeTeam) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-slate-400">
        <Sparkles className="h-12 w-12 text-slate-600 mb-4 animate-pulse" />
        <p className="font-semibold text-lg">No active workspace selected</p>
        <p className="text-sm text-slate-500">Please select or create a team to view AI insights.</p>
      </div>
    );
  }

  // Calculate circular stroke details
  const score = health?.score || 0;
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Determine score color classes
  let scoreColorClass = 'text-emerald-400';
  let scoreStrokeClass = 'stroke-emerald-400';
  let scoreBgGlow = 'shadow-emerald-500/20';

  if (score < 50) {
    scoreColorClass = 'text-rose-400';
    scoreStrokeClass = 'stroke-rose-400';
    scoreBgGlow = 'shadow-rose-500/20';
  } else if (score < 80) {
    scoreColorClass = 'text-amber-400';
    scoreStrokeClass = 'stroke-amber-400';
    scoreBgGlow = 'shadow-amber-500/20';
  }

  // Is the user on FREE plan?
  const isFreePlan = user?.plan !== 'PRO';

  return (
    <div className="space-y-8 pb-12">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 border-b border-slate-900 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-sm font-bold tracking-widest uppercase mb-1">
            <Sparkles className="h-4 w-4" />
            <span>Google Gemini 2.5 Flash</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            AI Insights Hub
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated code review audits, workspace health index, and sprint retrospective reflections.
          </p>
        </div>

        <button
          onClick={() => {
            getHealthScore(true);
            getHistoricalReports();
          }}
          disabled={healthLoading || reviewsLoading}
          className="flex items-center justify-center space-x-2 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${healthLoading || reviewsLoading ? 'animate-spin' : ''}`} />
          <span>Sync Insights</span>
        </button>
      </div>

      {/* Grid Layout: Health Score (Left) & Retro Gated Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Team Health Index Card (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-900 bg-slate-900/10 backdrop-blur-xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl">
          {/* Subtle decoration */}
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-cyan-500/5 blur-[50px] pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-950/40 text-cyan-400 border border-cyan-800/30">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <span className="font-extrabold tracking-tight text-slate-200">Weekly Team Health Index</span>
              </div>
              {health?.cached && (
                <span className="rounded-full bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                  Cached Report
                </span>
              )}
            </div>

            {healthLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
                <p className="text-xs text-slate-500 font-semibold">Running Gemini AI evaluation models...</p>
              </div>
            ) : healthError ? (
              <div className="rounded-xl bg-red-950/20 border border-red-900/30 p-4 text-center text-sm text-red-400">
                <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-2 animate-bounce" />
                <p>{healthError}</p>
              </div>
            ) : health ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Circular Gauge */}
                <div className="md:col-span-4 flex justify-center">
                  <div className="relative flex items-center justify-center">
                    <svg className="w-36 h-36 transform -rotate-90">
                      {/* Background track */}
                      <circle
                        cx="72"
                        cy="72"
                        r={radius}
                        className="stroke-slate-800 fill-none"
                        strokeWidth="8"
                      />
                      {/* Foreground score */}
                      <circle
                        cx="72"
                        cy="72"
                        r={radius}
                        className={`fill-none transition-all duration-1000 ease-out ${scoreStrokeClass}`}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* Inner text score */}
                    <div className="absolute text-center">
                      <span className={`text-4xl font-black tracking-tighter ${scoreColorClass}`}>
                        {score}
                      </span>
                      <span className="text-[10px] block font-bold text-slate-500 tracking-wider uppercase mt-0.5">
                        Health Score
                      </span>
                    </div>
                  </div>
                </div>

                {/* Text Explanation & Key Drivers */}
                <div className="md:col-span-8 space-y-4">
                  <p className="text-slate-300 text-sm leading-relaxed font-medium">
                    "{health.explanation}"
                  </p>

                  {/* Calculated metrics details */}
                  {health.metrics && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="rounded-lg bg-slate-900/60 border border-slate-800/60 p-2.5">
                        <span className="text-[10px] block text-slate-500 font-bold uppercase tracking-wider">PR Cycle Time</span>
                        <span className="text-sm font-extrabold text-slate-300">
                          {health.metrics.avgCycleTimeHours.toFixed(1)} hrs
                        </span>
                      </div>
                      <div className="rounded-lg bg-slate-900/60 border border-slate-800/60 p-2.5">
                        <span className="text-[10px] block text-slate-500 font-bold uppercase tracking-wider">Review Latency</span>
                        <span className="text-sm font-extrabold text-slate-300">
                          {health.metrics.avgReviewHours.toFixed(1)} hrs
                        </span>
                      </div>
                      <div className="rounded-lg bg-slate-900/60 border border-slate-800/60 p-2.5">
                        <span className="text-[10px] block text-slate-500 font-bold uppercase tracking-wider">Commits/Dev/Day</span>
                        <span className="text-sm font-extrabold text-slate-300">
                          {health.metrics.commitsPerDevPerDay.toFixed(1)}
                        </span>
                      </div>
                      <div className="rounded-lg bg-slate-900/60 border border-slate-800/60 p-2.5">
                        <span className="text-[10px] block text-slate-500 font-bold uppercase tracking-wider">Standup Submissions</span>
                        <span className="text-sm font-extrabold text-slate-300">
                          {health.metrics.standupCompletionRate}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-sm">
                No health score generated. Click "Sync Insights" to evaluate.
              </div>
            )}
          </div>

          {/* Risks section */}
          {!healthLoading && health && health.risks && health.risks.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-900/80">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block mb-2">
                Potential Team Risks
              </span>
              <ul className="space-y-1.5">
                {health.risks.map((risk, idx) => (
                  <li key={idx} className="flex items-start text-xs text-slate-400">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0 mr-2 mt-0.5" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: Sprint Retrospective Card (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-900 bg-slate-900/10 backdrop-blur-xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl">
          {/* Ambient Glow */}
          <div className="absolute top-0 left-0 h-40 w-40 rounded-full bg-indigo-500/5 blur-[50px] pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-950/40 text-indigo-400 border border-indigo-800/30">
                  <Calendar className="h-4 w-4" />
                </div>
                <span className="font-extrabold tracking-tight text-slate-200">Sprint Retrospective</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 mb-4">
              <select
                value={selectedSprint}
                onChange={(e) => setSelectedSprint(e.target.value)}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="last_14_days">Last 14 Days (Rolling Window)</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({new Date(s.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(s.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                  </option>
                ))}
              </select>

              <button
                onClick={() => getRetroReport(true)}
                disabled={retroLoading}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 px-3 py-2 text-xs font-bold hover:shadow-lg hover:shadow-cyan-500/10 transition-shadow disabled:opacity-50"
              >
                Generate
              </button>
            </div>

            {/* Free Tier Overlay Warning */}
            {isFreePlan && (
              <div className="mb-4 rounded-xl border border-amber-900/30 bg-amber-950/15 p-3.5 relative overflow-hidden flex items-start space-x-3">
                <Lock className="h-4.5 w-4.5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-300">Preview: Retrospectives are Pro features</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    Sprint management requires upgrading your workspace. Showing mock data models for preview capability.
                  </p>
                </div>
              </div>
            )}

            {retroLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
                <p className="text-[10px] text-slate-500 font-semibold">Generating retrospective summary...</p>
              </div>
            ) : retroText ? (
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-4 max-h-64 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed font-medium scrollbar-thin">
                {/* Format retro sections nicely */}
                {retroText.split('\n').map((line, idx) => {
                  if (line.startsWith('###') || line.startsWith('##') || line.match(/^\d\./)) {
                    return (
                      <p key={idx} className="font-extrabold text-slate-200 mt-3 first:mt-0 tracking-wide text-xs">
                        {line}
                      </p>
                    );
                  }
                  if (line.startsWith('*') || line.startsWith('-')) {
                    return (
                      <li key={idx} className="list-none flex items-start pl-2 text-slate-400 my-1 text-[11px]">
                        <span className="text-cyan-400 mr-2 font-bold">•</span>
                        <span>{line.replace(/^[\*\-\s]+/, '')}</span>
                      </li>
                    );
                  }
                  return <p key={idx}>{line}</p>;
                })}
              </div>
            ) : (
              <div className="text-center py-12 border border-slate-900/60 border-dashed rounded-xl text-slate-500 text-xs">
                No retro report generated yet for this sprint period.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Code Review Insights Feed Section */}
      <div className="rounded-2xl border border-slate-900 bg-slate-900/10 backdrop-blur-xl p-6 shadow-xl relative">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-indigo-500/5 blur-[50px] pointer-events-none" />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-800/30">
              <Code2 className="h-4 w-4" />
            </div>
            <span className="font-extrabold tracking-tight text-slate-200">AI Code Review Insights Feed</span>
          </div>
          <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
            Auto-Triggered on PR Merge
          </span>
        </div>

        {reviewsLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 w-full rounded-xl bg-slate-900/60 animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs text-center border border-slate-900/60 border-dashed rounded-xl">
            <Code2 className="h-8 w-8 text-slate-700 mb-2" />
            <p>No recent pull request merges tracked yet in this workspace.</p>
            <p className="text-[10px] text-slate-600 mt-1">Code review audits will automatically appear here once PRs are merged.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => {
              const isExpanded = expandedReviewId === rev.id;
              const { prTitle, prNumber, insight, filesChanged, linesAdded, linesRemoved } = rev.parsedContent;

              return (
                <div
                  key={rev.id}
                  className={`rounded-xl border border-slate-900/80 transition-all duration-300 overflow-hidden ${
                    isExpanded ? 'bg-slate-900/30' : 'bg-slate-900/10 hover:bg-slate-900/20'
                  }`}
                >
                  {/* Collapsed Header */}
                  <button
                    onClick={() => setExpandedReviewId(isExpanded ? null : rev.id)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div className="flex flex-col md:flex-row md:items-center space-y-1.5 md:space-y-0 md:space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-sm text-slate-200">PR #{prNumber}</span>
                        <span className="text-xs text-slate-400 truncate max-w-xs md:max-w-md font-semibold">
                          {prTitle}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center space-x-3 text-[10px] text-slate-500 font-bold uppercase">
                        <span className="flex items-center">
                          <FileText className="h-3 w-3 mr-1" /> {filesChanged} files
                        </span>
                        <span className="text-emerald-500">+{linesAdded}</span>
                        <span className="text-rose-500">-{linesRemoved}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-[10px] text-slate-500 font-semibold flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        {new Date(rev.generatedAt).toLocaleDateString()}
                      </span>
                      <ChevronRight
                        className={`h-4 w-4 text-slate-500 transform transition-transform duration-300 ${
                          isExpanded ? 'rotate-90 text-cyan-400' : 'rotate-0'
                        }`}
                      />
                    </div>
                  </button>

                  {/* Expanded Body */}
                  {isExpanded && (
                    <div className="border-t border-slate-900 bg-slate-950/20 px-4 py-4 space-y-4">
                      <div className="text-xs text-slate-300 leading-relaxed font-medium space-y-2 whitespace-pre-line">
                        {/* Style output sections if they start with Strength/Improvement/Recommendation */}
                        {insight.split('\n').map((line, idx) => {
                          const isStrength = line.toLowerCase().includes('* strength:') || line.toLowerCase().includes('strength:');
                          const isImprovement = line.toLowerCase().includes('* improvement:') || line.toLowerCase().includes('improvement:');
                          const isRecommendation = line.toLowerCase().includes('* recommendation:') || line.toLowerCase().includes('recommendation:');

                          if (isStrength) {
                            return (
                              <p key={idx} className="flex items-start text-emerald-400">
                                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mr-2.5 mt-0.5" />
                                <span>{line.replace(/^[\*\-\s]+/, '')}</span>
                              </p>
                            );
                          }
                          if (isImprovement) {
                            return (
                              <p key={idx} className="flex items-start text-amber-400">
                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mr-2.5 mt-0.5" />
                                <span>{line.replace(/^[\*\-\s]+/, '')}</span>
                              </p>
                            );
                          }
                          if (isRecommendation) {
                            return (
                              <p key={idx} className="flex items-start text-cyan-400">
                                <Zap className="h-4 w-4 text-cyan-400 shrink-0 mr-2.5 mt-0.5" />
                                <span>{line.replace(/^[\*\-\s]+/, '')}</span>
                              </p>
                            );
                          }
                          return <p key={idx}>{line}</p>;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
