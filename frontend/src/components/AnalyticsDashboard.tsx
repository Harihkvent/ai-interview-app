import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAnalyticsDashboard } from '../api';

interface AnalyticsData {
    overview: {
        total_interviews: number;
        total_completed: number;
        avg_score: number;
        total_time_spent_seconds: number;
        best_round?: string;
        worst_round?: string;
    };
    trends: {
        period_days: number;
        total_interviews: number;
        trend_data: any[];
        avg_score: number;
    };
    round_performance: {
        [key: string]: {
            avg_score: number;
            count: number;
            total_questions: number;
            avg_time: number;
        };
    };
    improvement_trend: any[];
}

export const AnalyticsDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const data = await getAnalyticsDashboard();
            setAnalytics(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load analytics');
            console.error('Error loading analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    const getRoundIcon = (roundType: string) => {
        const icons: { [key: string]: string } = {
            aptitude: '🧮',
            technical: '💻',
            hr: '👔'
        };
        return icons[roundType] || '📊';
    };

    const calculateTrend = () => {
        if (!analytics || analytics.improvement_trend.length < 2) return 'stable';
        const recent = analytics.improvement_trend.slice(-5);
        const older = analytics.improvement_trend.slice(0, Math.min(5, analytics.improvement_trend.length - 5));
        
        if (older.length === 0) return 'stable';
        
        const recentAvg = recent.reduce((sum: number, item: any) => sum + item.score, 0) / recent.length;
        const olderAvg = older.reduce((sum: number, item: any) => sum + item.score, 0) / older.length;
        
        if (recentAvg > olderAvg + 0.5) return 'improving';
        if (recentAvg < olderAvg - 0.5) return 'declining';
        return 'stable';
    };

    const getTrendIcon = (trend: string) => {
        if (trend === 'improving') return '📈';
        if (trend === 'declining') return '📉';
        return '➡️';
    };

    if (loading) {
        return (
            <div className="p-4">
                <div className="max-w-7xl mx-auto">
                    <div className="glass-card p-8 text-center">
                        <div className="text-6xl mb-4 animate-pulse">📊</div>
                        <p className="text-xl text-gray-300">Loading analytics...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4">
                <div className="max-w-7xl mx-auto">
                    <div className="glass-card p-8 text-center">
                        <div className="text-6xl mb-4">⚠️</div>
                        <p className="text-xl text-red-400 mb-4">{error}</p>
                        <button onClick={loadAnalytics} className="btn-primary">
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!analytics) return null;

    const totalTimeMinutes = Math.floor(analytics.overview.total_time_spent_seconds / 60);
    const completionRate = analytics.overview.total_interviews > 0 
        ? analytics.overview.total_completed / analytics.overview.total_interviews 
        : 0;
    const scoreTrend = calculateTrend();

    return (
        <div className="p-4">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="glass-card p-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <span>←</span>
                        <span>Back to Dashboard</span>
                    </button>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                        📊 Performance Analytics
                    </h2>
                    <div className="w-32"></div>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="glass-card p-6 hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">Total Interviews</span>
                            <span className="text-2xl">🎤</span>
                        </div>
                        <div className="text-3xl font-bold text-white">
                            {analytics.overview.total_interviews}
                        </div>
                    </div>

                    <div className="glass-card p-6 hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">Average Score</span>
                            <span className="text-2xl">⭐</span>
                        </div>
                        <div className="text-3xl font-bold text-primary-400">
                            {analytics.overview.avg_score.toFixed(1)}/10
                        </div>
                    </div>

                    <div className="glass-card p-6 hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">Total Time</span>
                            <span className="text-2xl">⏱️</span>
                        </div>
                        <div className="text-3xl font-bold text-purple-400">
                            {Math.floor(totalTimeMinutes / 60)}h {totalTimeMinutes % 60}m
                        </div>
                    </div>

                    <div className="glass-card p-6 hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">Completion Rate</span>
                            <span className="text-2xl">✅</span>
                        </div>
                        <div className="text-3xl font-bold text-green-400">
                            {(completionRate * 100).toFixed(0)}%
                        </div>
                    </div>
                </div>

                {/* Performance Trend */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <span>{getTrendIcon(scoreTrend)}</span>
                            <span>Performance Trend</span>
                        </h3>
                        <div className="px-4 py-2 bg-white/5 rounded-lg">
                            <span className="text-sm text-gray-400">Status: </span>
                            <span className={`font-bold ${
                                scoreTrend === 'improving' ? 'text-green-400' :
                                scoreTrend === 'declining' ? 'text-red-400' :
                                'text-yellow-400'
                            }`}>
                                {scoreTrend.charAt(0).toUpperCase() + scoreTrend.slice(1)}
                            </span>
                        </div>
                    </div>
                    <p className="text-gray-300">
                        {scoreTrend === 'improving' 
                            ? "Great job! Your performance is improving over time. Keep up the excellent work!" 
                            : scoreTrend === 'declining'
                            ? "Your scores have been declining. Consider reviewing your weak areas and practicing more."
                            : "Your performance has been consistent. Try challenging yourself with harder questions."}
                    </p>
                </div>

                {/* Round Performance Breakdown */}
                <div className="glass-card p-6">
                    <h3 className="text-xl font-bold mb-6">Round-wise Performance</h3>
                    {Object.keys(analytics.round_performance).length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <p>No round data available yet. Complete some interviews to see your performance breakdown!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Object.entries(analytics.round_performance).map(([roundType, data]) => (
                                <div key={roundType} className="bg-white/5 rounded-xl p-6 border border-white/10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-4xl">{getRoundIcon(roundType)}</span>
                                        <div>
                                            <h4 className="font-bold text-lg capitalize">{roundType}</h4>
                                            <p className="text-sm text-gray-400">{data.count} sessions</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400 text-sm">Average Score</span>
                                            <span className="font-bold text-xl text-primary-400">
                                                {data.avg_score.toFixed(1)}/10
                                            </span>
                                        </div>
                                        <div className="w-full bg-white/10 rounded-full h-2">
                                            <div 
                                                className="bg-gradient-to-r from-primary-500 to-purple-500 h-2 rounded-full transition-all"
                                                style={{ width: `${(data.avg_score / 10) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Improvement Suggestions */}
                <div className="glass-card p-6">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span>💡</span>
                        <span>Recommendations</span>
                    </h3>
                    <div className="space-y-3">
                        {analytics.overview.avg_score < 5 && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                                <p className="text-red-300">
                                    <strong>Focus on fundamentals:</strong> Your average score is below 5. Consider reviewing basic concepts and practicing more before attempting advanced topics.
                                </p>
                            </div>
                        )}
                        {analytics.overview.avg_score >= 5 && analytics.overview.avg_score < 7 && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                                <p className="text-yellow-300">
                                    <strong>Good progress:</strong> You're doing well! Focus on your weak areas to push your score above 7.
                                </p>
                            </div>
                        )}
                        {analytics.overview.avg_score >= 7 && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                                <p className="text-green-300">
                                    <strong>Excellent performance:</strong> You're doing great! Consider taking more challenging interviews or exploring new topics.
                                </p>
                            </div>
                        )}
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                            <p className="text-blue-300">
                                <strong>Tip:</strong> Regular practice is key. Try to complete at least 2-3 interviews per week to maintain consistency.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="glass-card p-6">
                    <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            onClick={() => navigate('/upload')}
                            className="btn-primary flex items-center justify-center gap-2"
                        >
                            <span>🎤</span>
                            <span>Start New Interview</span>
                        </button>
                        <button
                            onClick={() => navigate('/skill-tests')}
                            className="px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <span>📝</span>
                            <span>Take Skill Test</span>
                        </button>
                        <button
                            onClick={() => navigate('/roadmaps')}
                            className="px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <span>🗺️</span>
                            <span>View Roadmaps</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
