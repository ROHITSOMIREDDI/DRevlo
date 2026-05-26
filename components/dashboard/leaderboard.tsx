'use client';

import React from 'react';
import { GitCommit, GitPullRequest, Eye, Trophy, Award } from 'lucide-react';

interface LeaderboardMember {
  userId: string;
  name: string;
  avatarUrl?: string;
  commits: number;
  prs: number;
  reviews: number;
  score: number; // weighted activity score
}

interface TeamLeaderboardProps {
  members: LeaderboardMember[];
}

export default function TeamLeaderboard({ members }: TeamLeaderboardProps) {
  // Sort members by score descending
  const sortedMembers = [...members].sort((a, b) => b.score - a.score);

  // Get maximum score to calculate relative performance bars
  const maxScore = sortedMembers.length > 0 ? sortedMembers[0].score : 1;

  // Render rank badge (medal for top 3)
  const renderRank = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
          <Trophy className="h-3.5 w-3.5" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-300/10 border border-slate-300/30 text-slate-300">
          <Award className="h-3.5 w-3.5" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-700/10 border border-amber-700/30 text-amber-600">
          <Award className="h-3.5 w-3.5" />
        </div>
      );
    }
    return <span className="text-xs font-bold text-slate-500 w-6 text-center">{rank}</span>;
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl backdrop-blur-xl">
      <div className="mb-6">
        <h3 className="text-base font-bold text-slate-100">Team Leaderboard</h3>
        <p className="text-xs text-slate-400">Activity index ranked by commits, pull requests, and code reviews</p>
      </div>

      <div className="overflow-x-auto">
        {sortedMembers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No activity records found for this workspace
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-900 pb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 pl-2 w-12 text-center">Rank</th>
                <th className="py-3 pl-4">Member</th>
                <th className="py-3 px-4 text-center w-20">
                  <div className="flex items-center justify-center space-x-1 hover:text-slate-300 cursor-help" title="Total Commits">
                    <GitCommit className="h-3.5 w-3.5" />
                    <span>CM</span>
                  </div>
                </th>
                <th className="py-3 px-4 text-center w-20">
                  <div className="flex items-center justify-center space-x-1 hover:text-slate-300 cursor-help" title="Merged Pull Requests">
                    <GitPullRequest className="h-3.5 w-3.5" />
                    <span>PR</span>
                  </div>
                </th>
                <th className="py-3 px-4 text-center w-20">
                  <div className="flex items-center justify-center space-x-1 hover:text-slate-300 cursor-help" title="Submitted Reviews">
                    <Eye className="h-3.5 w-3.5" />
                    <span>RV</span>
                  </div>
                </th>
                <th className="py-3 pr-2 hidden sm:table-cell">Activity share</th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((member, index) => {
                const rank = index + 1;
                const relativeWidth = `${(member.score / maxScore) * 100}%`;

                return (
                  <tr
                    key={member.userId}
                    className="border-b border-slate-900/60 hover:bg-slate-900/10 transition-colors group"
                  >
                    <td className="py-4 pl-2 flex justify-center">{renderRank(rank)}</td>
                    <td className="py-4 pl-4 font-semibold text-slate-200">
                      <div className="flex items-center space-x-3">
                        <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[120px] sm:max-w-none">{member.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center text-slate-300 text-xs font-medium">{member.commits}</td>
                    <td className="py-4 px-4 text-center text-slate-300 text-xs font-medium">{member.prs}</td>
                    <td className="py-4 px-4 text-center text-slate-300 text-xs font-medium">{member.reviews}</td>
                    <td className="py-4 pr-2 hidden sm:table-cell w-40 md:w-60">
                      <div className="flex items-center space-x-3">
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-950/20">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                            style={{ width: relativeWidth }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 w-8">{Math.round((member.score / maxScore) * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
