import React, { useEffect, useState } from 'react';
import { getJobMatches, generateRoadmap, analyzeResumeLive } from '../api';
import { useToast } from '../contexts/ToastContext';
import { cacheService } from '../services/cacheService';

interface JobMatch {
    rank: number;
    job_title: string;
    match_percentage: number;
    matched_skills: string[];
    missing_skills: string[];
    job_description: string;
    company_name?: string;
    location?: string;
    thumbnail?: string;
    via?: string;
    is_live?: boolean;
}

interface JobMatchesProps {
    sessionId: string;
    onRoadmapGenerated: () => void;
}

export const JobMatches: React.FC<JobMatchesProps> = ({ sessionId, onRoadmapGenerated }) => {
    const { showToast } = useToast();
    const [matches, setMatches] = useState<JobMatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchingLive, setSearchingLive] = useState(false);
    const [isLiveSearch, setIsLiveSearch] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [selectedJob, setSelectedJob] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isCached, setIsCached] = useState(false);

    useEffect(() => {
        loadMatches();
    }, [sessionId, isLiveSearch]);

    const loadMatches = async () => {
        try {
            setLoading(true);
            setIsCached(false);
            
            // Check cache first for non-live searches
            if (!isLiveSearch) {
                const cached = cacheService.get<{ matches: JobMatch[] }>('jobMatches', sessionId);
                if (cached) {
                    console.log('📦 Using cached job matches');
                    const filtered = (cached.matches || []).filter((m: any) => !m.is_live);
                    setMatches(filtered);
                    setIsCached(true);
                    setError(null);
                    setLoading(false);
                    return;
                }
            }
            
            const data = await getJobMatches(sessionId);
            
            // Filter based on live toggle if data exists
            const filtered = (data.matches || []).filter((m: any) => 
                isLiveSearch ? m.is_live : !m.is_live
            );

            if (filtered.length === 0 && isLiveSearch) {
                // If live search is on but no live matches yet, trigger a live analysis
                handleLiveSearch();
            } else {
                setMatches(filtered);
                setIsCached(data.from_cache || false);
            }
            setError(null);
        } catch (err: any) {
            console.error('Failed to load matches:', err);
            setError(err.response?.data?.detail || 'Failed to load job matches');
        } finally {
            setLoading(false);
        }
    };

    const handleLiveSearch = async () => {
        try {
            setSearchingLive(true);
            await analyzeResumeLive(sessionId, 'India');
            const data = await getJobMatches(sessionId);
            const liveMatches = (data.matches || []).filter((m: any) => m.is_live);
            setMatches(liveMatches);
        } catch (err: any) {
            console.error('Live search failed:', err);
            setError('Failed to fetch live jobs. Check your connection or API key.');
        } finally {
            setSearchingLive(false);
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
            showToast(err.response?.data?.detail || 'Failed to generate roadmap', 'error');
        } finally {
            setGenerating(false);
            setSelectedJob(null);
        }
    };

    if (loading && !searchingLive) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-12 max-w-2xl w-full text-center space-y-6">
                    <div className="text-6xl animate-pulse">🔍</div>
                    <h2 className="text-3xl font-bold">{isCached ? 'Loading Your Matches...' : 'Analyzing Your Resume...'}</h2>
                    <p className="text-gray-300">
                        {isCached ? 'Retrieving cached matches' : 'Our AI is matching your skills with 63,000+ job roles'}
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

    return (
        <div className="min-h-screen p-4 pb-20">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header with Live Toggle */}
                <div className="glass-card p-8 text-center relative overflow-hidden">
                    <div className="text-6xl mb-4">🎯</div>
                    <h1 className="heading-1 text-primary-400 mb-3">
                        {isLiveSearch ? 'Real-Time Job Openings' : 'Your Top Job Matches'}
                        {isCached && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded ml-2">📦 Cached</span>}
                    </h1>
                    <p className="body-text max-w-2xl mx-auto">
                        {isLiveSearch 
                            ? 'Live vacancies fetched from Google Jobs via SerpApi based on your profile.'
                            : 'Based on our 63k+ job database, here are the roles that best fit your skills.'}
                    </p>
                    
                    <div className="mt-8 flex flex-col items-center gap-4">
                        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10">
                            <button 
                                onClick={() => setIsLiveSearch(false)}
                                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${!isLiveSearch ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-gray-400 hover:text-white'}`}
                            >
                                AI Prediction
                            </button>
                            <button 
                                onClick={() => setIsLiveSearch(true)}
                                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isLiveSearch ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-gray-400 hover:text-white'}`}
                            >
                                <span>🌐</span> Live Jobs
                            </button>
                        </div>

                        {searchingLive && (
                            <div className="flex items-center gap-2 text-primary-400 animate-pulse text-sm font-medium">
                                <span className="w-2 h-2 bg-primary-400 rounded-full"></span>
                                Fetching jobs from SerpApi...
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="bg-error-500/10 border border-error-500/20 p-4 rounded-xl text-error-400 text-center text-sm font-medium">
                        {error}
                    </div>
                )}

                {/* Job Matches Grid */}
                <div className="grid gap-6 md:grid-cols-2">
                    {matches.map((match) => (
                        <div
                            key={`${match.is_live ? 'live' : 'static'}-${match.rank}`}
                            className="glass-card p-6 border border-white/10 hover:border-primary-500/50 hover:scale-[1.02] transition-all duration-300 relative group"
                        >
                            {match.is_live && (
                                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-primary-500/20 border border-primary-500/30 rounded-full">
                                    <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse"></span>
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-primary-300">Live</span>
                                </div>
                            )}

                            {/* Company & Rank */}
                            <div className="flex items-start gap-4 mb-4">
                                {match.thumbnail ? (
                                    <img src={match.thumbnail} alt={match.company_name} className="w-12 h-12 rounded-xl object-contain bg-white p-1" />
                                ) : (
                                    <div className="bg-gradient-to-br from-primary-500 to-purple-600 text-white w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg">
                                        {match.rank}
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-primary-300 transition-colors">
                                        {match.job_title}
                                    </h3>
                                    <div className="text-sm text-gray-400 font-medium">
                                        {match.company_name || 'AI Prediction'} • {match.location || 'Global'}
                                    </div>
                                </div>
                            </div>

                            {/* Score & Progress */}
                            <div className="mb-6 bg-white/5 p-4 rounded-xl border border-white/5">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-sm font-medium text-gray-400">Match Accuracy</span>
                                    <span className="text-2xl font-black text-primary-400">{match.match_percentage}%</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all duration-1000"
                                        style={{ width: `${match.match_percentage}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Skills Grid */}
                            <div className="space-y-4 mb-6">
                                {match.matched_skills.length > 0 && (
                                    <div>
                                        <div className="text-[10px] uppercase tracking-widest font-bold text-green-500 mb-2">Matched Skills</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {match.matched_skills.slice(0, 5).map((skill) => (
                                                <span key={skill} className="px-2 py-0.5 bg-green-500/10 text-green-300 border border-green-500/20 rounded-md text-[10px] font-bold">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {match.missing_skills.length > 0 && (
                                    <div>
                                        <div className="text-[10px] uppercase tracking-widest font-bold text-orange-400 mb-2">Gaps to Bridge</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {match.missing_skills.slice(0, 5).map((skill) => (
                                                <span key={skill} className="px-2 py-0.5 bg-orange-500/10 text-orange-300 border border-orange-500/20 rounded-md text-[10px] font-bold">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={() => handleGenerateRoadmap(match.job_title)}
                                disabled={generating}
                                className="w-full py-3 bg-white/5 hover:bg-primary-500 text-white rounded-xl font-bold transition-all border border-white/10 hover:border-primary-400 group/btn disabled:opacity-50"
                            >
                                {generating && selectedJob === match.job_title ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Building Roadmap...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <span>🗺️</span>
                                        {isLiveSearch ? 'Apply & Build Roadmap' : 'Generate Career Roadmap'}
                                    </span>
                                )}
                            </button>
                            
                            {match.via && (
                                <div className="mt-3 text-[10px] text-center text-gray-500 italic">
                                    Posted via {match.via}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {!searchingLive && matches.length === 0 && (
                    <div className="glass-card p-12 text-center">
                        <div className="text-4xl mb-4">📭</div>
                        <h3 className="text-xl font-bold mb-2">No Matches Found</h3>
                        <p className="text-gray-400">
                            {isLiveSearch 
                                ? 'Try refining your resume or checking back later for live openings.' 
                                : 'Try uploading a more detailed resume for better matching.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
