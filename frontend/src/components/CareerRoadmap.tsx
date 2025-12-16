import React, { useEffect, useState } from 'react';
import { getRoadmap } from '../api';

interface Milestone {
    phase: string;
    duration: string;
    goals: string[];
    resources: string[];
    success_criteria?: string[];
}

interface SkillsGap {
    matched_skills: string[];
    missing_skills: string[];
    match_percentage: number;
}

interface RoadmapData {
    roadmap_id: string;
    target_role: string;
    skills_gap: SkillsGap;
    milestones: Milestone[];
    estimated_timeline: string;
}

interface CareerRoadmapProps {
    sessionId: string;
    onProceedToInterview: () => void;
}

export const CareerRoadmap: React.FC<CareerRoadmapProps> = ({ sessionId, onProceedToInterview }) => {
    const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadRoadmap();
    }, [sessionId]);

    const loadRoadmap = async () => {
        try {
            setLoading(true);
            const data = await getRoadmap(sessionId);
            setRoadmap(data);
            setError(null);
        } catch (err: any) {
            console.error('Failed to load roadmap:', err);
            setError(err.response?.data?.detail || 'Failed to load career roadmap');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-12 max-w-2xl w-full text-center space-y-6">
                    <div className="text-6xl animate-pulse">🗺️</div>
                    <h2 className="text-3xl font-bold">Generating Your Career Roadmap...</h2>
                    <p className="text-gray-300">
                        AI is creating a personalized learning path for you
                    </p>
                    <div className="flex justify-center gap-2">
                        <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !roadmap) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-12 max-w-2xl w-full text-center space-y-6">
                    <div className="text-6xl">⚠️</div>
                    <h2 className="text-3xl font-bold text-red-400">Error Loading Roadmap</h2>
                    <p className="text-gray-300">{error || 'No roadmap data available'}</p>
                    <button onClick={loadRoadmap} className="btn-primary">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 pb-20">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="glass-card p-8 text-center">
                    <div className="text-6xl mb-4">🎯</div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
                        Your Career Roadmap
                    </h1>
                    <h2 className="text-2xl font-semibold text-white mb-4">
                        {roadmap.target_role}
                    </h2>
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        <div className="bg-purple-500/20 px-6 py-2 rounded-full">
                            <span className="text-purple-300 font-semibold">
                                ⏱️ {roadmap.estimated_timeline}
                            </span>
                        </div>
                        <div className="bg-green-500/20 px-6 py-2 rounded-full">
                            <span className="text-green-300 font-semibold">
                                ✓ {roadmap.skills_gap.match_percentage.toFixed(0)}% Skills Match
                            </span>
                        </div>
                    </div>
                </div>

                {/* Skills Gap Analysis */}
                <div className="glass-card p-6">
                    <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <span>📊</span> Skills Analysis
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Matched Skills */}
                        <div>
                            <h4 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                                <span>✓</span> Your Strengths ({roadmap.skills_gap.matched_skills.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {roadmap.skills_gap.matched_skills.map((skill) => (
                                    <span
                                        key={skill}
                                        className="px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg text-sm font-medium"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Missing Skills */}
                        <div>
                            <h4 className="text-lg font-semibold text-orange-400 mb-3 flex items-center gap-2">
                                <span>📚</span> Skills to Acquire ({roadmap.skills_gap.missing_skills.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {roadmap.skills_gap.missing_skills.map((skill) => (
                                    <span
                                        key={skill}
                                        className="px-3 py-1.5 bg-orange-500/20 text-orange-300 rounded-lg text-sm font-medium"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Learning Milestones */}
                <div className="glass-card p-6">
                    <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <span>🎓</span> Learning Milestones
                    </h3>
                    <div className="space-y-6">
                        {roadmap.milestones.map((milestone, index) => (
                            <div
                                key={index}
                                className="relative pl-8 pb-6 border-l-2 border-purple-500/30 last:border-l-0 last:pb-0"
                            >
                                {/* Timeline Dot */}
                                <div className="absolute left-[-9px] top-0 w-4 h-4 bg-purple-500 rounded-full border-4 border-gray-900"></div>

                                {/* Milestone Content */}
                                <div className="bg-white/5 rounded-xl p-6 hover:bg-white/10 transition-colors">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h4 className="text-xl font-bold text-purple-300">
                                                {milestone.phase}
                                            </h4>
                                            <p className="text-sm text-gray-400">
                                                Duration: {milestone.duration}
                                            </p>
                                        </div>
                                        <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-semibold">
                                            Phase {index + 1}
                                        </span>
                                    </div>

                                    {/* Goals */}
                                    <div className="mb-4">
                                        <h5 className="text-sm font-semibold text-gray-300 mb-2">🎯 Goals:</h5>
                                        <ul className="space-y-1.5">
                                            {milestone.goals.map((goal, i) => (
                                                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                                    <span className="text-purple-400 mt-0.5">•</span>
                                                    <span>{goal}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Resources */}
                                    <div className="mb-4">
                                        <h5 className="text-sm font-semibold text-gray-300 mb-2">📚 Resources:</h5>
                                        <ul className="space-y-1.5">
                                            {milestone.resources.map((resource, i) => (
                                                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                                    <span className="text-green-400 mt-0.5">•</span>
                                                    <span>{resource}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Success Criteria */}
                                    {milestone.success_criteria && milestone.success_criteria.length > 0 && (
                                        <div>
                                            <h5 className="text-sm font-semibold text-gray-300 mb-2">✅ Success Criteria:</h5>
                                            <ul className="space-y-1.5">
                                                {milestone.success_criteria.map((criteria, i) => (
                                                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                                        <span className="text-blue-400 mt-0.5">•</span>
                                                        <span>{criteria}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="glass-card p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30">
                    <div className="text-center space-y-4">
                        <h3 className="text-xl font-bold text-white">
                            Ready to Test Your Skills?
                        </h3>
                        <p className="text-gray-300">
                            Now that you have your career roadmap, let's assess your current abilities with our AI-powered interview
                        </p>
                        <button
                            onClick={onProceedToInterview}
                            className="btn-primary text-lg px-8 py-4"
                        >
                            <span className="flex items-center justify-center gap-2">
                                <span>🎤</span>
                                Start AI Interview
                            </span>
                        </button>
                    </div>
                </div>

                {/* Info Card */}
                <div className="glass-card p-6 bg-blue-500/10 border border-blue-500/30">
                    <h3 className="font-semibold text-blue-300 mb-2 flex items-center gap-2">
                        <span>💡</span> Pro Tip
                    </h3>
                    <p className="text-sm text-gray-300">
                        Save this roadmap! After the interview, you'll receive a comprehensive PDF report
                        including your roadmap, interview performance, and personalized recommendations.
                    </p>
                </div>
            </div>
        </div>
    );
};
