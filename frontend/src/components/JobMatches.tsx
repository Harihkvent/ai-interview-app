import React, { useEffect, useState } from 'react';
import { getJobMatches, generateRoadmap } from '../api';

interface JobMatch {
    rank: number;
    job_title: string;
    match_percentage: number;
    matched_skills: string[];
    missing_skills: string[];
    job_description: string;
}

interface JobMatchesProps {
    sessionId: string;
    onRoadmapGenerated: () => void;
}

export const JobMatches: React.FC<JobMatchesProps> = ({ sessionId, onRoadmapGenerated }) => {
    const [matches, setMatches] = useState<JobMatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [selectedJob, setSelectedJob] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadMatches();
    }, [sessionId]);

    const loadMatches = async () => {
        try {
            setLoading(true);
            const data = await getJobMatches(sessionId);
            setMatches(data.matches || []);
            setError(null);
        } catch (err: any) {
            console.error('Failed to load matches:', err);
            setError(err.response?.data?.detail || 'Failed to load job matches');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateRoadmap = async (jobTitle: string) => {
        setGenerating(true);
        setSelectedJob(jobTitle);
        try {
            await generateRoadmap(sessionId, jobTitle);
            onRoadmapGenerated();
        } catch (err: any) {
            console.error('Failed to generate roadmap:', err);
            alert(err.response?.data?.detail || 'Failed to generate roadmap');
        } finally {
            setGenerating(false);
            setSelectedJob(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-12 max-w-2xl w-full text-center space-y-6">
                    <div className="text-6xl animate-pulse">🔍</div>
                    <h2 className="text-3xl font-bold">Analyzing Your Resume...</h2>
                    <p className="text-gray-300">
                        Our AI is matching your skills with 63,000+ job roles
                    </p>
                    <div className="flex justify-center gap-2">
                        <div className="w-3 h-3 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-3 h-3 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-3 h-3 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-12 max-w-2xl w-full text-center space-y-6">
                    <div className="text-6xl">⚠️</div>
                    <h2 className="text-3xl font-bold text-red-400">Error Loading Matches</h2>
                    <p className="text-gray-300">{error}</p>
                    <button onClick={loadMatches} className="btn-primary">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 pb-20">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="glass-card p-8 text-center">
                    <div className="text-6xl mb-4">🎯</div>
                    <h1 className="heading-1 text-primary-400 mb-3">
                        Your Top Job Matches
                    </h1>
                    <p className="body-text">
                        Based on your resume, here are the best career opportunities for you
                    </p>
                    <div className="mt-4 inline-block bg-primary-500/20 px-6 py-2 rounded-full">
                        <span className="text-primary-300 font-semibold">
                            {matches.length} Matches Found
                        </span>
                    </div>
                </div>

                {/* Job Matches Grid */}
                <div className="grid gap-6 md:grid-cols-2">
                    {matches.map((match) => (
                        <div
                            key={match.rank}
                            className="glass-card p-6 hover:scale-[1.02] transition-transform"
                        >
                            {/* Rank Badge */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="bg-gradient-to-r from-primary-500 to-purple-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">
                                    #{match.rank}
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-primary-400">
                                        {match.match_percentage}%
                                    </div>
                                    <div className="text-xs text-gray-400">Match Score</div>
                                </div>
                            </div>

                            {/* Job Title */}
                            <h3 className="text-2xl font-bold mb-3 text-white">
                                {match.job_title}
                            </h3>

                            {/* Match Progress Bar */}
                            <div className="mb-4">
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all duration-1000"
                                        style={{ width: `${match.match_percentage}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Matched Skills */}
                            {match.matched_skills.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                                        <span>✓</span> Your Matching Skills
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {match.matched_skills.slice(0, 6).map((skill) => (
                                            <span
                                                key={skill}
                                                className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-medium"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                        {match.matched_skills.length > 6 && (
                                            <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs">
                                                +{match.matched_skills.length - 6} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Missing Skills */}
                            {match.missing_skills.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
                                        <span>📚</span> Skills to Learn
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {match.missing_skills.slice(0, 5).map((skill) => (
                                            <span
                                                key={skill}
                                                className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-xs font-medium"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                        {match.missing_skills.length > 5 && (
                                            <span className="px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full text-xs">
                                                +{match.missing_skills.length - 5} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Generate Roadmap Button */}
                            <button
                                onClick={() => handleGenerateRoadmap(match.job_title)}
                                disabled={generating}
                                className="w-full btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {generating && selectedJob === match.job_title ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="animate-spin">⚙️</span>
                                        Generating Roadmap...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <span>🗺️</span>
                                        Generate Career Roadmap
                                    </span>
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Info Card */}
                <div className="glass-card p-6 bg-primary-500/10 border border-primary-500/30">
                    <h3 className="font-semibold text-primary-300 mb-2 flex items-center gap-2">
                        <span>💡</span> How It Works
                    </h3>
                    <p className="text-sm text-gray-300">
                        Our AI analyzed your resume using advanced machine learning (TF-IDF + Semantic matching)
                        to find the best job matches from 63,000+ roles. Select a job to generate a personalized
                        career roadmap with learning milestones and resources!
                    </p>
                </div>
            </div>
        </div>
    );
};
