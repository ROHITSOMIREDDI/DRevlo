'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  GitCommit,
  GitPullRequest,
  Calendar,
  Users,
  Settings,
  Sparkles,
  LogOut,
  Menu,
  X,
  Building,
  Plus,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react';

interface TeamMembership {
  teamId: string;
  role: string;
  teamName: string;
  teamSlug: string;
  githubOrg: string | null;
}

interface UserSession {
  id: string;
  email: string;
  name: string | null;
  githubId: string;
  plan: string;
  memberships: TeamMembership[];
}

interface DashboardContextType {
  user: UserSession | null;
  activeTeam: TeamMembership | null;
  setActiveTeam: (team: TeamMembership) => void;
  refreshSession: () => Promise<void>;
  isLoading: boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [activeTeam, setActiveTeamState] = useState<TeamMembership | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const refreshSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);

        // Retrieve saved active workspace from local storage if available
        const savedTeamId = localStorage.getItem('activeTeamId');
        const memberships = data.user.memberships || [];

        if (memberships.length > 0) {
          const selected =
            memberships.find((m: TeamMembership) => m.teamId === savedTeamId) ||
            memberships[0];
          setActiveTeamState(selected);
          localStorage.setItem('activeTeamId', selected.teamId);
        } else {
          setActiveTeamState(null);
        }
      } else {
        router.push('/login');
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const setActiveTeam = (team: TeamMembership) => {
    setActiveTeamState(team);
    localStorage.setItem('activeTeamId', team.teamId);
    setIsWorkspaceDropdownOpen(false);
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const navLinks = [
    { name: 'Overview', href: '/', icon: LayoutDashboard },
    { name: 'Commit Analytics', href: '/commits', icon: GitCommit },
    { name: 'PR Analytics', href: '/prs', icon: GitPullRequest },
    { name: 'Standup Tracker', href: '/standups', icon: Calendar },
    { name: 'Sprint Management', href: '/sprints', icon: Users },
    { name: 'AI Insights Hub', href: '/insights', icon: Sparkles },
    { name: 'Team Management', href: '/team', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 font-sans text-slate-100 antialiased">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent shadow-lg shadow-cyan-500/20" />
          <p className="text-sm font-semibold tracking-wider text-slate-400">Loading Drevlo workspace...</p>
        </div>
      </div>
    );
  }

  // If user has no workspace, force onboarding page view
  const hasNoWorkspace = !user?.memberships || user.memberships.length === 0;

  return (
    <DashboardContext.Provider value={{ user, activeTeam, setActiveTeam, refreshSession, isLoading }}>
      <div className="flex min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-cyan-500 selection:text-slate-900">
        {/* Background ambient glow */}
        <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-cyan-950/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-indigo-950/5 blur-[120px] pointer-events-none" />

        {/* Sidebar - Desktop */}
        <aside
          className={`relative z-20 hidden md:flex flex-col border-r border-slate-900 bg-slate-900/20 backdrop-blur-xl transition-all duration-300 ${
            isSidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Logo / Header */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-slate-900">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-md">
                <span className="text-sm font-bold text-slate-950">D</span>
              </div>
              {!isSidebarCollapsed && (
                <span className="text-lg font-extrabold tracking-wider bg-gradient-to-r from-slate-100 to-cyan-100 bg-clip-text text-transparent group-hover:text-cyan-400 transition-colors">
                  DREVLO
                </span>
              )}
            </Link>
          </div>

          {/* Workspace Selector */}
          {!hasNoWorkspace && !isSidebarCollapsed && (
            <div className="px-4 py-4 border-b border-slate-900 relative">
              <button
                onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors"
              >
                <div className="flex items-center space-x-2 text-left truncate">
                  <Building className="h-4 w-4 shrink-0 text-cyan-400" />
                  <span className="truncate">{activeTeam?.teamName}</span>
                </div>
                <ChevronLeft className={`h-4 w-4 transform transition-transform ${isWorkspaceDropdownOpen ? '-rotate-90' : 'rotate-0'}`} />
              </button>

              {/* Workspace Selector Dropdown */}
              {isWorkspaceDropdownOpen && (
                <div className="absolute left-4 right-4 mt-2 z-30 rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-2xl">
                  <p className="px-3 py-1.5 text-[10px] font-bold tracking-widest text-slate-500 uppercase">Workspaces</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {user?.memberships.map((membership) => (
                      <button
                        key={membership.teamId}
                        onClick={() => setActiveTeam(membership)}
                        className={`flex w-full items-center px-3 py-2 text-xs rounded-lg transition-colors text-left truncate ${
                          activeTeam?.teamId === membership.teamId
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                        }`}
                      >
                        <Building className="h-3.5 w-3.5 mr-2 shrink-0" />
                        <span className="truncate">{membership.teamName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.name}
                  href={hasNoWorkspace ? '#' : link.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    hasNoWorkspace
                      ? 'pointer-events-none opacity-40'
                      : isActive
                      ? 'bg-gradient-to-r from-cyan-950/40 to-indigo-950/20 text-cyan-400 border-l-2 border-cyan-400 shadow-inner'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/50'
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-100'}`} />
                  {!isSidebarCollapsed && <span>{link.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User profile / Footer */}
          <div className="p-4 border-t border-slate-900 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 truncate">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 border border-slate-700">
                  <UserIcon className="h-4 w-4 text-slate-300" />
                </div>
                {!isSidebarCollapsed && (
                  <div className="text-left truncate">
                    <p className="text-xs font-bold text-slate-200 truncate">{user?.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={`flex w-full items-center justify-center space-x-2 rounded-xl border border-slate-800/80 bg-slate-900/20 hover:bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-red-400 transition-colors border-dashed`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>

          {/* Collapse Toggle Trigger */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute top-1/2 -right-3 z-30 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 shadow-md transition-colors"
          >
            {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </aside>

        {/* Mobile Header and Menu Drawer */}
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex h-16 items-center justify-between px-6 border-b border-slate-900 bg-slate-950/20 backdrop-blur-xl md:hidden">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500">
                <span className="text-xs font-bold text-slate-950">D</span>
              </div>
              <span className="text-md font-extrabold tracking-wider bg-gradient-to-r from-slate-100 to-cyan-100 bg-clip-text text-transparent">
                DREVLO
              </span>
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-slate-200"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </header>

          {/* Mobile Navigation Drawer */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 md:hidden pt-16">
              <nav className="flex-1 px-6 py-6 space-y-2 overflow-y-auto">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;

                  return (
                    <Link
                      key={link.name}
                      href={hasNoWorkspace ? '#' : link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-semibold transition-colors ${
                        hasNoWorkspace
                          ? 'pointer-events-none opacity-40'
                          : isActive
                          ? 'bg-slate-900 text-cyan-400 border-l-2 border-cyan-400'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/50'
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{link.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-6 border-t border-slate-900 flex flex-col space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 border border-slate-700">
                    <UserIcon className="h-5 w-5 text-slate-300" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-200">{user?.name}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center space-x-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-400 hover:text-red-400 transition-colors"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}

          {/* Workspace Onboarding Selector Overlay (If User has no workspaces) */}
          {hasNoWorkspace ? (
            <main className="flex-1 flex items-center justify-center p-6 md:p-12 relative z-10">
              {children}
            </main>
          ) : (
            <main className="flex-1 overflow-y-auto p-6 md:p-10 relative z-10">
              {children}
            </main>
          )}
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
