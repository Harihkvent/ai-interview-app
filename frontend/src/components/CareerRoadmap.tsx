import React, { useEffect, useState } from 'react';
import { getRoadmap, saveRoadmap } from '../api';

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
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

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

    const handleSaveRoadmap = async () => {
        if (!roadmap?.roadmap_id) return;
        setSaving(true);
        try {
            await saveRoadmap(roadmap.roadmap_id);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            console.error('Failed to save roadmap:', err);
            alert('Failed to save roadmap. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 max-w-2xl w-full text-center space-y-6">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-white to-zinc-400 flex items-center justify-center">
                        <svg className="w-9 h-9 text-black animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-white">Generating Your Career Roadmap...</h2>
                    <p className="text-gray-400">AI is creating a personalized learning path for you</p>
                    <div className="flex justify-center gap-2">
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !roadmap) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 max-w-2xl w-full text-center space-y-6">
                    <div className="text-6xl">⚠️</div>
                    <h2 className="text-3xl font-bold text-red-400">Error Loading Roadmap</h2>
                    <p className="text-gray-400">{error || 'No roadmap data available'}</p>
                    <button 
                        onClick={loadRoadmap} 
                        className="px-8 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                    <div className="flex items-start gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-zinc-400 flex items-center justify-center flex-shrink-0">
                            <svg className="w-9 h-9 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-white mb-2">Career Roadmap</h1>
                            <p className="text-lg text-gray-400 mb-4">{roadmap.target_role}</p>
                            <div className="flex flex-wrap gap-3">
                                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                                    <span className="text-xs text-gray-500">Duration:</span>
                                    <span className="ml-2 font-semibold text-white">{roadmap.estimated_timeline}</span>
                                </div>
                                <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <span className="text-xs text-green-500">Difficulty:</span>
                                    <span className="ml-2 font-semibold text-green-400">Intermediate</span>
                                </div>
                                <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                    <span className="text-xs text-blue-500">Match:</span>
                                    <span className="ml-2 font-semibold text-blue-400">{roadmap.skills_gap.match_percentage.toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Roadmap Timeline */}
                <div className="relative">
                    {/* Connecting Line */}
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-white via-gray-500 to-white"></div>

                    {/* Milestones */}
                    <div className="space-y-6">
                        {roadmap.milestones.map((milestone, i) => (
                            <div key={i} className="relative pl-20">
                                {/* Node */}
                                <div className={`absolute left-0 w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg ${
                                    i === 0 ? 'bg-white text-black' :
                                    i === roadmap.milestones.length - 1 ? 'bg-green-500 text-white' :
                                    'bg-zinc-800 border-2 border-white text-white'
                                }`}>
                                    {i === 0 ? '🏁' : i === roadmap.milestones.length - 1 ? '🎯' : i}
                                </div>

                                {/* Content */}
                                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-bold text-white">{milestone.phase}</h3>
                                        <span className="text-sm text-gray-500">{milestone.duration}</span>
                                    </div>
                                    <ul className="space-y-2">
                                        {milestone.goals.map((goal, j) => (
                                            <li key={j} className="flex items-start gap-3">
                                                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-gray-300">{goal}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    
                                    {/* Resources - compact list */}
                                    {milestone.resources.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-zinc-800">
                                            <div className="flex flex-wrap gap-2">
                                                {milestone.resources.slice(0, 3).map((resource, j) => (
                                                    <span key={j} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400">
                                                        📚 {resource.length > 30 ? resource.substring(0, 30) + '...' : resource}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Success Message */}
                {saved && (
                    <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 text-center">
                        <p className="text-green-400 font-semibold flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Roadmap saved successfully!
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-4">
                    <button 
                        onClick={onProceedToInterview}
                        className="flex-1 py-4 bg-white text-black rounded-xl font-semibold text-lg hover:bg-gray-200 transition-all"
                    >
                        Start Interview Prep
                    </button>
                    <button 
                        onClick={handleSaveRoadmap}
                        disabled={saving || saved}
                        className={`px-8 py-4 rounded-xl font-semibold transition-all ${
                            saved 
                                ? 'bg-green-500/20 border border-green-500/50 text-green-400' 
                                : 'bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800'
                        } disabled:opacity-50`}
                    >
                        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Roadmap'}
                    </button>
                    <button className="px-8 py-4 bg-zinc-900 border border-zinc-800 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all">
                        Export PDF
                    </button>
                </div>
            </div>
        </div>
    );
};
