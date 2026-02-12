import React, { useEffect, useState } from 'react';
import { getRoadmapById } from '../api';
import { useParams } from 'react-router-dom';
import { MapIcon, Target, Clock, Star, BarChart3, BookOpen, GraduationCap, CheckCircle, Calendar, ArrowLeft, AlertTriangle, Check } from 'lucide-react';

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
    id: string;
    target_role: string;
    current_role?: string;
    skills_gap: SkillsGap;
    milestones: Milestone[];
    estimated_timeline: string;
    is_saved: boolean;
    created_at: string;
}

interface RoadmapViewerProps {
    roadmapId?: string;
    onBack: () => void;
}

export const RoadmapViewer: React.FC<RoadmapViewerProps> = ({ roadmapId: propsRoadmapId, onBack }) => {
    const { id: paramRoadmapId } = useParams<{ id: string }>();
    const roadmapId = propsRoadmapId || paramRoadmapId;
    const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (roadmapId) {
            loadRoadmap();
        }
    }, [roadmapId]);

    const loadRoadmap = async () => {
        if (!roadmapId) return;
        try {
            setLoading(true);
            const data = await getRoadmapById(roadmapId);
            console.log('📊 Roadmap data:', data);
            console.log('🎯 Milestones:', data.milestones);
            if (data.milestones && data.milestones.length > 0) {
                console.log('First milestone:', data.milestones[0]);
            }
            setRoadmap(data);
            setError(null);
        } catch (err: any) {
            console.error('Failed to load roadmap:', err);
            setError(err.response?.data?.detail || 'Failed to load roadmap');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-12 max-w-2xl w-full text-center space-y-6">
                    <div className="flex justify-center"><MapIcon size={64} className="text-primary-500 animate-pulse" /></div>
                    <h2 className="text-3xl font-bold">Loading Roadmap...</h2>
                </div>
            </div>
        );
    }

    if (error || !roadmap) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-12 max-w-2xl w-full text-center space-y-6">
                    <div className="flex justify-center"><AlertTriangle size={64} className="text-red-400" /></div>
                    <h2 className="text-3xl font-bold text-red-400">Error Loading Roadmap</h2>
                    <p className="text-gray-300">{error || 'Roadmap not found'}</p>
                    <button onClick={onBack} className="btn-primary">
                        Back to My Roadmaps
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 pb-20">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Back Button */}
                <button
                    onClick={onBack}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
                >
                    <ArrowLeft size={18} />
                    <span>Back to My Roadmaps</span>
                </button>

                {/* Header */}
                <div className="glass-card p-8 text-center">
                    <div className="flex justify-center mb-4"><Target size={64} className="text-purple-400" /></div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
                        Career Roadmap
                    </h1>
                    <h2 className="text-2xl font-semibold text-white mb-4">
                        {roadmap.target_role}
                    </h2>
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        <div className="bg-purple-500/20 px-6 py-2 rounded-full">
                            <span className="text-purple-300 font-semibold">
                                <Clock size={16} className="inline mr-1" /> {roadmap.estimated_timeline}
                            </span>
                        </div>
                        <div className="bg-green-500/20 px-6 py-2 rounded-full">
                            <span className="text-green-300 font-semibold">
                                <Check size={16} className="inline mr-1" /> {roadmap.skills_gap?.match_percentage?.toFixed(0) || 0}% Skills Match
                            </span>
                        </div>
                        {roadmap.is_saved && (
                            <div className="bg-yellow-500/20 px-6 py-2 rounded-full">
                                <span className="text-yellow-300 font-semibold">
                                    <Star size={16} className="inline mr-1" /> Saved
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Skills Gap Analysis */}
                <div className="glass-card p-6">
                    <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <BarChart3 size={20} className="inline mr-1" /> Skills Analysis
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Matched Skills */}
                        <div>
                            <h4 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                                <Check size={16} /> Your Strengths ({roadmap.skills_gap?.matched_skills?.length || 0})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {(roadmap.skills_gap.matched_skills || []).map((skill) => (
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
                                <BookOpen size={16} /> Skills to Acquire ({roadmap.skills_gap?.missing_skills?.length || 0})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {(roadmap.skills_gap.missing_skills || []).map((skill) => (
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
                        <GraduationCap size={20} className="inline mr-1" /> Learning Milestones
                    </h3>
                    <div className="space-y-6">
                        {(roadmap.milestones || []).map((milestone, index) => (
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
                                        <h5 className="text-sm font-semibold text-gray-300 mb-2"><Target size={14} className="inline mr-1" /> Goals:</h5>
                                        <ul className="space-y-1.5">
                                            {(milestone.goals || []).map((goal, i) => (
                                                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                                    <span className="text-purple-400 mt-0.5">•</span>
                                                    <span>{goal}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Resources */}
                                    <div className="mb-4">
                                        <h5 className="text-sm font-semibold text-gray-300 mb-2"><BookOpen size={14} className="inline mr-1" /> Resources:</h5>
                                        <ul className="space-y-1.5">
                                            {(milestone.resources || []).map((resource, i) => (
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
                                            <h5 className="text-sm font-semibold text-gray-300 mb-2"><CheckCircle size={14} className="inline mr-1" /> Success Criteria:</h5>
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

                {/* Info */}
                <div className="glass-card p-6 bg-blue-500/10 border border-blue-500/30">
                    <p className="text-sm text-gray-300 text-center">
                        <Calendar size={14} className="inline mr-1" /> Created on {new Date(roadmap.created_at).toLocaleDateString()}
                    </p>
                </div>
            </div>
        </div>
    );
};
