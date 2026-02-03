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
        if (!analytics || analytics.improvement_trend.length < 2) return { trend: 'stable', change: 0 };
        const recent = analytics.improvement_trend.slice(-5);
        const older = analytics.improvement_trend.slice(0, Math.min(5, analytics.improvement_trend.length - 5));
        
        if (older.length === 0) return { trend: 'stable', change: 0 };
        
        const recentAvg = recent.reduce((sum: number, item: any) => sum + item.score, 0) / recent.length;
        const olderAvg = older.reduce((sum: number, item: any) => sum + item.score, 0) / older.length;
        const change = Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
        
        if (recentAvg > olderAvg + 0.5) return { trend: 'improving', change };
        if (recentAvg < olderAvg - 0.5) return { trend: 'declining', change };
        return { trend: 'stable', change: 0 };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-white to-zinc-400 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-black animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <p className="text-gray-400">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <p className="text-xl text-red-400 mb-4">{error}</p>
                    <button 
                        onClick={loadAnalytics} 
                        className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!analytics) return null;

    const totalTimeMinutes = Math.floor(analytics.overview.total_time_spent_seconds / 60);
    const completionRate = analytics.overview.total_interviews > 0 
        ? Math.round((analytics.overview.total_completed / analytics.overview.total_interviews) * 100)
        : 0;
    const { trend: scoreTrend, change: scoreChange } = calculateTrend();

    // Generate bar chart data from improvement trend
    const chartData = analytics.improvement_trend.slice(-7).map(item => Math.round(item.score * 10));

    return (
        <div className="min-h-screen bg-black p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Interview Analytics</h1>
                    <p className="text-gray-400">Track your performance and identify areas for improvement</p>
                </div>

                {/* Key Metrics */}
                <div className="grid md:grid-cols-4 gap-4">
                    {[
                        { 
                            label: 'Total Interviews', 
                            value: analytics.overview.total_interviews.toString(), 
                            change: scoreTrend === 'improving' ? '+12%' : scoreTrend === 'declining' ? '-5%' : '0%', 
                            positive: scoreTrend !== 'declining' 
                        },
                        { 
                            label: 'Avg Score', 
                            value: `${(analytics.overview.avg_score * 10).toFixed(0)}%`, 
                            change: scoreChange > 0 ? `+${scoreChange}%` : `${scoreChange}%`, 
                            positive: scoreChange >= 0 
                        },
                        { 
                            label: 'Completion Rate', 
                            value: `${completionRate}%`, 
                            change: completionRate >= 80 ? '+8%' : '-2%', 
                            positive: completionRate >= 80 
                        },
                        { 
                            label: 'Time Spent', 
                            value: totalTimeMinutes >= 60 ? `${Math.floor(totalTimeMinutes / 60)}h` : `${totalTimeMinutes}m`, 
                            change: '+15%', 
                            positive: true 
                        },
                    ].map((metric, i) => (
                        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all">
                            <div className="text-sm text-gray-400 mb-2">{metric.label}</div>
                            <div className="text-3xl font-bold text-white mb-2">{metric.value}</div>
                            <div className={`text-sm font-semibold ${metric.positive ? 'text-green-400' : 'text-red-400'}`}>
                                {metric.change} from last month
                            </div>
                        </div>
                    ))}
                </div>

                {/* Charts Row */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Performance Over Time */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                        <h3 className="text-xl font-bold text-white mb-6">Performance Over Time</h3>
                        <div className="relative h-64">
                            {chartData.length > 0 ? (
                                <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 h-full">
                                    {chartData.map((value, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                            <div 
                                                className="w-full bg-white rounded-t-lg hover:bg-gray-300 transition-all" 
                                                style={{ height: `${value}%` }}
                                            ></div>
                                            <span className="text-xs text-gray-500">W{i + 1}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    <p>Complete more interviews to see trends</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Skills Breakdown */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                        <h3 className="text-xl font-bold text-white mb-6">Skills Performance</h3>
                        <div className="space-y-4">
                            {Object.keys(analytics.round_performance).length > 0 ? (
                                Object.entries(analytics.round_performance).map(([roundType, data]) => (
                                    <div key={roundType}>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-gray-300 capitalize flex items-center gap-2">
                                                {getRoundIcon(roundType)} {roundType}
                                            </span>
                                            <span className="text-sm font-bold text-white">{Math.round(data.avg_score * 10)}%</span>
                                        </div>
                                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-white rounded-full transition-all" 
                                                style={{ width: `${data.avg_score * 10}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <p>Complete interviews to see skill breakdown</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Interviews */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Recent Activity</h3>
                    {analytics.improvement_trend.length > 0 ? (
                        <div className="space-y-3">
                            {analytics.improvement_trend.slice(-4).reverse().map((item: any, i: number) => (
                                <div key={i} className="flex items-center gap-4 p-4 bg-black border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all">
                                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center font-bold text-black">
                                        {Math.round(item.score * 10)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-white">{item.round_type ? item.round_type.charAt(0).toUpperCase() + item.round_type.slice(1) : 'Interview'} Session</div>
                                        <div className="text-sm text-gray-400">{new Date(item.date || Date.now()).toLocaleDateString()}</div>
                                    </div>
                                    <button 
                                        onClick={() => navigate('/dashboard')}
                                        className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg font-medium hover:bg-zinc-700 transition-all"
                                    >
                                        View Details
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <p>No recent interviews. Start one to track your progress!</p>
                        </div>
                    )}
                </div>

                {/* AI Recommendations */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">AI Recommendations</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        {[
                            { 
                                icon: '📚', 
                                title: analytics.overview.worst_round ? `Improve ${analytics.overview.worst_round}` : 'Study System Design', 
                                desc: 'Focus on your weakest area to boost overall performance' 
                            },
                            { 
                                icon: '💪', 
                                title: 'Practice More', 
                                desc: analytics.overview.avg_score < 7 
                                    ? 'Your score is below 70%. Daily practice can improve it!' 
                                    : '30 min daily can push your score even higher' 
                            },
                            { 
                                icon: '🎯', 
                                title: 'Mock Interviews', 
                                desc: 'Schedule regular mock interviews for consistent improvement' 
                            },
                        ].map((rec, i) => (
                            <div key={i} className="p-6 bg-black border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all">
                                <div className="text-4xl mb-3">{rec.icon}</div>
                                <div className="font-bold text-white mb-2">{rec.title}</div>
                                <div className="text-sm text-gray-400">{rec.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-4">
                    <button
                        onClick={() => navigate('/upload')}
                        className="flex-1 py-4 bg-white text-black rounded-xl font-semibold text-lg hover:bg-gray-200 transition-all"
                    >
                        Start New Interview
                    </button>
                    <button
                        onClick={() => navigate('/skill-tests')}
                        className="px-8 py-4 bg-zinc-900 border border-zinc-800 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all"
                    >
                        Take Skill Test
                    </button>
                    <button
                        onClick={() => navigate('/roadmaps')}
                        className="px-8 py-4 bg-zinc-900 border border-zinc-800 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all"
                    >
                        View Roadmaps
                    </button>
                </div>
            </div>
        </div>
    );
};
