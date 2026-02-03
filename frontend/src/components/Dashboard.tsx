import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getActiveSession, deleteInterview } from '../api';
import { useConfirmDialog } from './ConfirmDialog';
import { useLocation } from 'react-router-dom';

interface DashboardData {
  user: {
    username: string;
    email: string;
    full_name?: string;
  };
  stats: {
    total_interviews: number;
    completed_interviews: number;
    saved_roadmaps: number;
    member_since: string;
  };
  recent_interviews: Array<{
    id: string;
    status: string;
    created_at: string;
    total_score: number;
    job_title?: string;
  }>;
  recent_roadmaps: Array<{
    id: string;
    target_role: string;
    is_saved: boolean;
    created_at: string;
  }>;
  active_resume?: {
    filename: string;
    summary: string;
    improvements: Record<string, string>;
    parsed_skills: string[];
  };
}

interface DashboardProps {
  onStartNewInterview: () => void;
  onViewRoadmaps: () => void;
  onNavigate: (page: string, params?: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartNewInterview, onViewRoadmaps, onNavigate }) => {
  const { token } = useAuth();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const location = useLocation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [pausedMessage, setPausedMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
    checkActiveSession();
    
    // Check for paused interview message from navigation state
    if (location.state?.message) {
      setPausedMessage(location.state.message);
      // Clear the message after 10 seconds
      setTimeout(() => setPausedMessage(null), 10000);
    }
  }, [location]);

  const loadDashboard = async () => {
    try {
      const response = await fetch('http://localhost:8000/user/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkActiveSession = async () => {
    try {
      const session = await getActiveSession();
      if (session && session.session_id) {
         setActiveSession(session.session_id);
      }
    } catch (err) {
      console.error('Failed to check active session:', err);
    }
  };

  const handleDeleteInterview = async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    const confirmed = await confirm(
      'Delete Interview History',
      'Are you sure you want to delete this interview from your history? This action cannot be undone.',
      { confirmLabel: 'Delete', variant: 'danger' }
    );
    if (!confirmed) return;
    
    try {
      await deleteInterview(sid);
      loadDashboard();
      if (activeSession === sid) {
        setActiveSession(null);
      }
    } catch (err) {
      console.error('Failed to delete interview:', err);
      alert('Failed to delete interview history');
    }
  };

  // Stats configuration
  const statsConfig = [
    { 
      title: 'Total Interviews', 
      value: data?.stats.total_interviews || 0, 
      icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z'
    },
    { 
      title: 'Completed', 
      value: data?.stats.completed_interviews || 0, 
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    { 
      title: 'Roadmaps', 
      value: data?.stats.saved_roadmaps || 0, 
      icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'
    },
    { 
      title: 'Member Since', 
      value: data?.stats.member_since ? new Date(data.stats.member_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A', 
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
  ];

  // Get thumbnail emoji based on job title
  const getThumbnail = (jobTitle?: string, status?: string) => {
    if (status === 'completed') return '🎯';
    if (status === 'in-progress' || status === 'active') return '⚡';
    if (jobTitle?.toLowerCase().includes('frontend')) return '💻';
    if (jobTitle?.toLowerCase().includes('backend')) return '🔧';
    if (jobTitle?.toLowerCase().includes('data')) return '📊';
    return '💼';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-white font-semibold mb-4">Connection Failed</p>
          <button onClick={loadDashboard} className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-900/80 border-b border-zinc-800">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Dashboard
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Welcome back, {data.user.full_name || data.user.username}! 🚀
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={onStartNewInterview}
                className="px-5 py-2.5 rounded-xl bg-white text-black font-medium hover:bg-gray-200 transition-all"
              >
                + New Interview
              </button>
              
              <div 
                onClick={() => onNavigate('profile')}
                className="w-12 h-12 rounded-xl bg-zinc-700 flex items-center justify-center cursor-pointer hover:bg-zinc-600 transition-all"
              >
                <span className="text-xl">👨‍💻</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-8 py-8">
        {/* Paused Interview Message */}
        {pausedMessage && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl flex items-center gap-4">
            <span className="text-2xl">⏸️</span>
            <div className="flex-1">
              <p className="text-yellow-400 font-medium">Interview Paused</p>
              <p className="text-gray-400 text-sm">{pausedMessage}</p>
            </div>
            <button 
              onClick={() => setPausedMessage(null)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Active Session Notification */}
        {activeSession && (
          <div className="mb-6 p-6 bg-zinc-900 border border-zinc-700 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center">
                <span className="text-2xl">🎭</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Resume Your Interview</h3>
                <p className="text-sm text-gray-400">You have an active interview session</p>
              </div>
            </div>
            <button 
              onClick={() => onNavigate('interview', { resumeSessionId: activeSession })}
              className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsConfig.map((stat, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl p-6 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:scale-105 cursor-pointer"
            >
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-zinc-800 group-hover:bg-zinc-700 transition-colors">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                    </svg>
                  </div>
                </div>
                
                <h3 className="text-gray-400 text-sm mb-1">{stat.title}</h3>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={onStartNewInterview}
              className="group p-6 rounded-2xl bg-white text-black hover:bg-gray-100 transition-all"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🎤</div>
              <div className="font-bold">Start Interview</div>
              <div className="text-xs text-gray-600 mt-1">Full simulation</div>
            </button>

            <button
              onClick={() => onNavigate('skill-tests')}
              className="group p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">✍️</div>
              <div className="font-semibold text-white">Quick Practice</div>
              <div className="text-xs text-gray-500 mt-1">Skill assessments</div>
            </button>

            <button
              onClick={() => onNavigate('jobs')}
              className="group p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all"
            >
              <div className="text-4xl mb-3 group-hover:rotate-12 transition-transform">🎯</div>
              <div className="font-semibold text-white">Predict Career</div>
              <div className="text-xs text-gray-500 mt-1">Job matching</div>
            </button>

            <button
              onClick={() => onNavigate('live-jobs')}
              className="group p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all"
            >
              <div className="text-4xl mb-3 group-hover:-rotate-12 transition-transform">🌐</div>
              <div className="font-semibold text-white">Market Trends</div>
              <div className="text-xs text-gray-500 mt-1">Live vacancies</div>
            </button>
          </div>
        </div>

        {/* AI Insights Card */}
        <div 
          onClick={() => onNavigate('insights')}
          className="mb-8 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center transition-colors">
                <span className="text-2xl">🤖</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">AI Profile Insights</h2>
                <p className="text-sm text-gray-400">
                  {data.active_resume 
                    ? "View your professional summary and skill analysis" 
                    : "Upload a resume to unlock AI feedback"}
                </p>
              </div>
            </div>
            <button className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all">
              {data.active_resume ? "View →" : "Get Started →"}
            </button>
          </div>
        </div>

        {/* Recent Interviews Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Recent Interviews</h2>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-200 transition-all">
                All
              </button>
              <button className="px-4 py-2 rounded-lg text-gray-400 text-sm font-medium hover:text-white transition-colors">
                Completed
              </button>
            </div>
          </div>

          {/* Interview Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {data.recent_interviews.length > 0 ? (
              data.recent_interviews.map((interview) => (
                <div
                  key={interview.id}
                  className="group cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-all duration-300">
                    {/* Emoji Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-6xl group-hover:scale-110 transition-transform duration-300">
                        {getThumbnail(interview.job_title, interview.status)}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
                        interview.status === 'completed'
                          ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                          : interview.status === 'in-progress' || interview.status === 'active'
                          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      }`}>
                        {interview.status === 'completed' ? 'Done' : interview.status === 'in-progress' || interview.status === 'active' ? 'Live' : 'Upcoming'}
                      </span>
                    </div>

                    {/* Score Badge (for completed) */}
                    {interview.status === 'completed' && (
                      <div className="absolute bottom-3 left-3">
                        <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-zinc-700">
                          <span className="text-sm font-bold text-white">{interview.total_score.toFixed(1)}/10</span>
                        </div>
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                      <div className="flex gap-2">
                        {interview.status === 'completed' ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`http://localhost:8000/report/${interview.id}`, '_blank');
                            }}
                            className="px-4 py-2 rounded-lg bg-white text-black font-medium text-sm hover:bg-gray-200 transition-colors"
                          >
                            View Report
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('interview', { resumeSessionId: interview.id });
                            }}
                            className="px-4 py-2 rounded-lg bg-white text-black font-medium text-sm hover:bg-gray-200 transition-colors"
                          >
                            Resume
                          </button>
                        )}
                        <button 
                          onClick={(e) => handleDeleteInterview(e, interview.id)}
                          className="px-3 py-2 rounded-lg bg-red-500/80 text-white font-medium text-sm hover:bg-red-600 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="px-1">
                    <h3 className="text-white font-semibold mb-1 group-hover:text-gray-300 transition-colors line-clamp-2">
                      {interview.job_title || 'General Interview'}
                    </h3>
                    <p className="text-gray-500 text-xs">
                      {new Date(interview.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : null}

            {/* Add New Card */}
            <div 
              onClick={onStartNewInterview}
              className="group cursor-pointer"
            >
              <div className="aspect-video rounded-2xl border-2 border-dashed border-zinc-800 group-hover:border-zinc-600 transition-all duration-300 flex items-center justify-center bg-zinc-900/50 group-hover:bg-zinc-900">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center transition-colors">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <p className="text-gray-400 font-medium group-hover:text-white transition-colors">Start New Interview</p>
                </div>
              </div>
            </div>
          </div>

          {data.recent_interviews.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-400 font-medium">No interviews yet. Start your first one!</p>
            </div>
          )}
        </div>

        {/* Roadmaps Section */}
        <div className="rounded-2xl p-8 bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Career Roadmaps</h2>
            <button 
              onClick={onViewRoadmaps}
              className="px-4 py-2 rounded-lg text-gray-400 text-sm font-medium hover:text-white transition-colors"
            >
              View All →
            </button>
          </div>
          
          {data.recent_roadmaps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.recent_roadmaps.slice(0, 4).map((roadmap) => (
                <div 
                  key={roadmap.id}
                  onClick={() => onNavigate('roadmaps', { selectedId: roadmap.id })}
                  className="p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-all cursor-pointer group"
                >
                  <div className="text-2xl mb-2">🗺️</div>
                  <div className="font-semibold text-white text-sm truncate group-hover:text-gray-300 transition-colors">
                    {roadmap.target_role}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(roadmap.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🗺️</div>
              <p className="text-gray-400 text-sm">No roadmaps generated yet</p>
              <button 
                onClick={() => onNavigate('jobs')}
                className="mt-4 px-6 py-2 bg-white text-black rounded-xl font-medium text-sm hover:bg-gray-200 transition-all"
              >
                Generate Roadmap
              </button>
            </div>
          )}
        </div>
      </main>
      <ConfirmDialogComponent />
    </div>
  );
};
