import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

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
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartNewInterview, onViewRoadmaps }) => {
  const { token, logout } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
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
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                Welcome back, {data.user.full_name || data.user.username}! 👋
              </h1>
              <p className="text-gray-400">{data.user.email}</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🎤</div>
              <div>
                <div className="text-3xl font-bold text-primary-400">
                  {data.stats.total_interviews}
                </div>
                <div className="text-sm text-gray-400">Total Interviews</div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">✅</div>
              <div>
                <div className="text-3xl font-bold text-green-400">
                  {data.stats.completed_interviews}
                </div>
                <div className="text-sm text-gray-400">Completed</div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🗺️</div>
              <div>
                <div className="text-3xl font-bold text-purple-400">
                  {data.stats.saved_roadmaps}
                </div>
                <div className="text-sm text-gray-400">Saved Roadmaps</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={onStartNewInterview}
              className="btn-primary text-lg py-4"
            >
              <span className="flex items-center justify-center gap-2">
                <span>🚀</span>
                Start New Interview
              </span>
            </button>
            <button
              onClick={onViewRoadmaps}
              className="px-6 py-4 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors text-lg font-semibold"
            >
              <span className="flex items-center justify-center gap-2">
                <span>📚</span>
                View Saved Roadmaps
              </span>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Interviews */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold mb-4">Recent Interviews</h2>
            {data.recent_interviews.length > 0 ? (
              <div className="space-y-3">
                {data.recent_interviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        interview.status === 'completed'
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {interview.status}
                      </span>
                      <span className="text-sm text-gray-400">
                        {new Date(interview.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-lg font-semibold text-white">
                      Score: {interview.total_score.toFixed(1)}/10
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No interviews yet</p>
            )}
          </div>

          {/* Recent Roadmaps */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold mb-4">Recent Roadmaps</h2>
            {data.recent_roadmaps.length > 0 ? (
              <div className="space-y-3">
                {data.recent_roadmaps.map((roadmap) => (
                  <div
                    key={roadmap.id}
                    className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">
                        {new Date(roadmap.created_at).toLocaleDateString()}
                      </span>
                      {roadmap.is_saved && (
                        <span className="text-yellow-400">⭐</span>
                      )}
                    </div>
                    <div className="text-lg font-semibold text-white">
                      {roadmap.target_role}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No roadmaps yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
