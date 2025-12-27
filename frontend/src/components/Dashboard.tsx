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
    job_title?: string;
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
        <div className="text-center animate-pulse">
          <div className="text-8xl mb-4">📊</div>
          <p className="text-xl font-bold opacity-50">Syncing your progress...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-12 text-center">
          <p className="text-xl text-red-400 font-bold mb-4">Connection Failed</p>
          <button onClick={loadDashboard} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <section className="glass-card p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl rotate-12">👋</div>
          <div className="relative z-10">
            <h1 className="text-5xl font-black tracking-tight mb-2">
              Welcome, <span className="text-gradient">{data.user.full_name || data.user.username}</span>!
            </h1>
            <p className="text-lg opacity-60 font-medium">{data.user.email}</p>
          </div>
        </section>

        {/* Active Session Notification */}
        {activeSession && (
          <div className="bg-primary-500/10 border-2 border-primary-500/30 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-primary-500/10 mb-8 border-dashed">
             <div className="flex items-center gap-6">
                <div className="text-5xl animate-bounce">🎭</div>
                <div>
                   <h3 className="text-2xl font-black text-primary-500">Resume Your Journey</h3>
                   <p className="opacity-70 font-medium">You have an interview waiting for you. Don't let opportunity wait!</p>
                </div>
             </div>
             <button 
                onClick={() => onNavigate('interview', { resumeSessionId: activeSession })}
                className="btn-primary px-10 py-4 text-lg"
             >
                Continue Now →
             </button>
          </div>
        )}

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Interviews', value: data.stats.total_interviews, icon: '🎤', color: 'primary' },
            { label: 'Completed Rounds', value: data.stats.completed_interviews, icon: '🏆', color: 'green' },
            { label: 'Saved Roadmaps', value: data.stats.saved_roadmaps, icon: '🗺️', color: 'orange' }
          ].map((stat, i) => (
            <div key={i} className="glass-card p-8 group hover:scale-[1.02] transition-all cursor-default">
              <div className="flex items-center gap-6">
                <div className={`text-5xl p-4 bg-primary-500/10 rounded-2xl group-hover:rotate-12 transition-transform`}>
                  {stat.icon}
                </div>
                <div>
                  <div className="text-4xl font-black">
                    {stat.value}
                  </div>
                  <div className="text-sm font-bold uppercase tracking-widest opacity-40">{stat.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Action Center - 2/3 width */}
          <div className="lg:col-span-2 glass-card p-10 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black flex items-center gap-3">
                 <span className="w-12 h-12 bg-primary-500/10 text-primary-500 flex items-center justify-center rounded-2xl text-2xl">🚀</span>
                 Quick Actions
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <button
                onClick={onStartNewInterview}
                className="flex flex-col items-center justify-center p-10 bg-primary-500 hover:bg-primary-600 text-white rounded-[2rem] transition-all shadow-xl shadow-primary-500/30 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="text-6xl mb-4 group-hover:scale-110 transition-transform">🎤</span>
                <span className="font-black text-2xl">Start Interview</span>
                <span className="text-sm opacity-80 mt-2">Full simulation (Aptitude + Tech + HR)</span>
              </button>

              <button
                onClick={() => onNavigate('question_gen')}
                className="flex flex-col items-center justify-center p-10 bg-white/5 hover:bg-white/10 rounded-[2rem] border-2 border-dashed border-white/10 transition-all group"
              >
                <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">⚡</span>
                <span className="font-black text-xl">Quick Practice</span>
                <span className="text-sm opacity-40 mt-1 text-center">Random AI question generator</span>
              </button>

              <button
                onClick={() => onNavigate('jobs')}
                className="flex flex-col items-center justify-center p-8 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/10 transition-all group"
              >
                <span className="text-4xl mb-3 group-hover:rotate-12 transition-transform">🎯</span>
                <span className="font-bold text-lg">Predict Career</span>
                <span className="text-xs opacity-40 text-center">Skill-based job matching</span>
              </button>

              <button
                 onClick={() => onNavigate('live-jobs')}
                 className="flex flex-col items-center justify-center p-8 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/10 transition-all group"
              >
                 <span className="text-4xl mb-3 group-hover:-rotate-12 transition-transform">🌐</span>
                 <span className="font-bold text-lg">Market Trends</span>
                 <span className="text-xs opacity-40 text-center">Live vacancy tracking</span>
              </button>
            </div>
          </div>

          {/* Side Panel - History & Stats */}
          <div className="space-y-8">
            {/* Roadmaps Preview */}
            <div className="glass-card p-8 flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black">Roadmaps</h3>
                <button onClick={onViewRoadmaps} className="text-xs font-bold text-primary-500 hover:underline">View All</button>
              </div>
              <div className="space-y-4 flex-1">
                {data.recent_roadmaps.length > 0 ? (
                  data.recent_roadmaps.slice(0, 4).map((roadmap) => (
                    <div 
                      key={roadmap.id} 
                      onClick={() => onNavigate('roadmaps', { selectedId: roadmap.id })}
                      className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 transition-all cursor-pointer group"
                    >
                      <div className="font-bold text-sm truncate group-hover:text-primary-500 transition-colors uppercase tracking-tight">{roadmap.target_role}</div>
                      <div className="text-[10px] opacity-40 mt-1">{new Date(roadmap.created_at).toLocaleDateString()}</div>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-30 py-10">
                    <span className="text-4xl mb-2">🗺️</span>
                    <p className="text-xs font-bold">No roadmaps generated</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* History Section */}
        <section className="glass-card p-10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black">Interview History</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.recent_interviews.length > 0 ? (
              data.recent_interviews.map((interview) => (
                <div 
                  key={interview.id} 
                  className={`rounded-3xl p-6 border transition-all group relative overflow-hidden ${
                    interview.status === 'completed'
                    ? 'bg-green-500/5 border-green-500/10 hover:border-green-500/30'
                    : 'bg-white/5 border-white/5 hover:border-primary-500/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1">
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter w-fit ${
                        interview.status === 'completed' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-primary-500/10 text-primary-500'
                      }`}>
                        {interview.status === 'completed' ? '✨ COMPLETED' : '🕒 ' + interview.status.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-bold opacity-30 pl-1">{new Date(interview.created_at).toLocaleDateString()}</span>
                    </div>
                    {interview.status === 'completed' && (
                      <div className="text-2xl">🏆</div>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-white truncate group-hover:text-primary-400 transition-colors uppercase tracking-tight">
                        {interview.job_title || 'General Interview'}
                    </h3>
                  </div>
                  
                  <div className="mb-6">
                    <div className="text-xs font-bold opacity-40 uppercase tracking-widest mb-1">
                      {interview.status === 'completed' ? 'Final Score' : 'Current Progress'}
                    </div>
                    <div className={`text-4xl font-black tracking-tight ${
                      interview.status === 'completed' ? 'text-green-400' : 'text-white'
                    }`}>
                      {interview.total_score.toFixed(1)}<span className="text-sm opacity-30">/10</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {interview.status === 'completed' ? (
                      <button 
                        onClick={() => window.open(`http://localhost:8000/report/${interview.id}`, '_blank')}
                        className="flex-1 py-3 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                      >
                        📥 VIEW REPORT
                      </button>
                    ) : (
                      <button 
                         onClick={() => onNavigate('interview', { resumeSessionId: interview.id })}
                         className="flex-1 py-3 bg-primary-500/10 hover:bg-primary-500 text-primary-500 hover:text-white rounded-xl text-xs font-black transition-all"
                      >
                         RESUME INTERVIEW
                      </button>
                    )}
                    <button 
                      onClick={(e) => handleDeleteInterview(e, interview.id)}
                      className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
                      title="Delete History"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center opacity-20">
                <div className="text-8xl mb-4">📭</div>
                <p className="text-xl font-black">YOUR HISTORY IS EMPTY</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
