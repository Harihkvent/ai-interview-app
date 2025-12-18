import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getActiveSession, deleteInterview } from '../api';

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
  }>;
  recent_roadmaps: Array<{
    id: string;
    target_role: string;
    is_saved: boolean;
    created_at: string;
  }>;
}

interface DashboardProps {
  onStartNewInterview: () => void;
  onViewRoadmaps: () => void;
  onNavigate: (page: string, params?: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartNewInterview, onViewRoadmaps, onNavigate }) => {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
    checkActiveSession();
  }, []);

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
    if (!window.confirm('Are you sure you want to delete this interview from your history?')) return;
    
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-pulse mb-4">📊</div>
          <p className="text-xl text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-400">Failed to load dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="heading-2 mb-1">
                Welcome back, {data.user.full_name || data.user.username}! 👋
              </h1>
              <p className="body-text">{data.user.email}</p>
            </div>
          </div>
        </div>

        {/* Resume Session Banner */}
        {activeSession && (
          <div className="bg-primary-500/10 border-2 border-primary-500/50 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="flex items-center gap-4">
                <div className="text-4xl animate-bounce">🎙️</div>
                <div>
                   <h3 className="text-xl font-bold text-primary-400">In-progress Interview</h3>
                   <p className="text-sm text-text-tertiary">You have an unfinished interview session. Pick up where you left off!</p>
                </div>
             </div>
             <button 
                onClick={() => onNavigate('interview', { resumeSessionId: activeSession })}
                className="btn-primary px-8 py-3 whitespace-nowrap"
             >
                Resume Interview Now
             </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-hover p-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl text-primary-400">🎤</div>
              <div>
                <div className="text-3xl font-bold text-primary-400">
                  {data.stats.total_interviews}
                </div>
                <div className="text-sm text-text-secondary">Total Interviews</div>
              </div>
            </div>
          </div>

          <div className="card-hover p-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl text-success-400">✅</div>
              <div>
                <div className="text-3xl font-bold text-success-400">
                  {data.stats.completed_interviews}
                </div>
                <div className="text-sm text-text-secondary">Completed</div>
              </div>
            </div>
          </div>

          <div className="card-hover p-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl text-warning-400">🗺️</div>
              <div>
                <div className="text-3xl font-bold text-warning-400">
                  {data.stats.saved_roadmaps}
                </div>
                <div className="text-sm text-text-secondary">Saved Roadmaps</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Center */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Interview Actions */}
          <div className="lg:col-span-2 card p-8 space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
               <span className="p-2 bg-primary-500/10 text-primary-400 rounded-xl text-xl">⚡</span>
               Action Center
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={onStartNewInterview}
                className="flex flex-col items-center justify-center p-6 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl transition-all shadow-lg hover:shadow-primary-500/20 group"
              >
                <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">🎤</span>
                <span className="font-bold text-lg">Start Full Interview</span>
                <span className="text-xs text-primary-100/70 mt-1">Aptitude + Technical + HR</span>
              </button>

              <button
                onClick={() => onNavigate('question_gen')}
                className="flex flex-col items-center justify-center p-6 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all group"
              >
                <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">⚡</span>
                <span className="font-bold text-lg">Question Generator</span>
                <span className="text-xs text-text-tertiary mt-1">Standalone questions (no interview)</span>
              </button>

              <button
                onClick={() => onNavigate('jobs')}
                className="flex flex-col items-center justify-center p-6 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all group"
              >
                <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">🎯</span>
                <span className="font-bold text-lg">AI Job Matcher</span>
                <span className="text-xs text-text-tertiary mt-1">Find your best career path</span>
              </button>

              <button
                onClick={() => onNavigate('live_jobs')}
                className="flex flex-col items-center justify-center p-6 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all group"
              >
                <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">🌐</span>
                <span className="font-bold text-lg">Live Jobs</span>
                <span className="text-xs text-text-tertiary mt-1">Real-time vacancies via SerpApi</span>
              </button>
            </div>
          </div>

          {/* User History Preview */}
          <div className="card p-6 divide-y divide-white/5 flex flex-col">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Recent Roadmaps</h3>
                <button onClick={onViewRoadmaps} className="text-xs text-primary-400 hover:underline">View All</button>
             </div>
             <div className="flex-1 space-y-3 pt-4 overflow-y-auto max-h-[300px]">
                {data.recent_roadmaps.length > 0 ? (
                  data.recent_roadmaps.map((roadmap) => (
                    <div key={roadmap.id} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all group cursor-pointer" onClick={() => onNavigate('roadmaps', { selectedId: roadmap.id })}>
                       <div className="text-sm font-bold truncate">{roadmap.target_role}</div>
                       <div className="text-[10px] text-gray-500 mt-1 flex justify-between">
                          <span>{new Date(roadmap.created_at).toLocaleDateString()}</span>
                          <span className="text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity">Resume →</span>
                       </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-center text-text-tertiary py-8">No roadmaps yet</p>
                )}
             </div>
          </div>
        </div>

        {/* Interviews History Table Preview */}
        <div className="card p-6">
            <h2 className="heading-4 mb-4">History</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.recent_interviews.length > 0 ? (
                data.recent_interviews.map((interview) => (
                  <div key={interview.id} className="bg-neutral-50 rounded-lg p-4 hover:bg-neutral-100 transition-colors border border-neutral-200 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`badge ${interview.status === 'completed' ? 'badge-success' : 'badge-primary'}`}>
                            {interview.status}
                          </span>
                          <span className="body-text-sm">{new Date(interview.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="text-lg font-bold text-text-primary">Score: {interview.total_score.toFixed(1)}/10</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {interview.status !== 'completed' && (
                        <button 
                            onClick={() => onNavigate('interview', { resumeSessionId: interview.id })}
                            className="text-xs font-bold uppercase tracking-wider text-primary-500 hover:text-primary-600 p-2 bg-primary-500/5 rounded-lg whitespace-nowrap"
                        >
                            Continue →
                        </button>
                      )}
                      <button 
                        onClick={(e) => handleDeleteInterview(e, interview.id)}
                        className="text-red-400 hover:text-red-500 p-2 hover:bg-red-500/5 rounded-lg transition-colors"
                        title="Delete History"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="body-text text-center py-8 col-span-2">No interviews yet</p>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};
