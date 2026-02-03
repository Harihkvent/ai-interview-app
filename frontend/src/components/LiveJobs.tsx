import React, { useState } from 'react';
import { getJobMatches, uploadResume, analyzeResumeLive, saveJob, getActiveSession } from '../api';

interface JobMatch {
    id: string;
    job_id?: string;
    rank: number;
    job_title: string;
    match_percentage: number;
    matched_skills: string[];
    missing_skills: string[];
    company_name?: string;
    location?: string;
    thumbnail?: string;
    via?: string;
    apply_link?: string;
    is_saved?: boolean;
}

export const LiveJobs: React.FC = () => {
    const [matches, setMatches] = useState<JobMatch[]>([]);
    const [loading, setLoading] = useState(false);
    const [stage, setStage] = useState<'upload' | 'results'>('upload');
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    React.useEffect(() => {
        const checkActiveSession = async () => {
            try {
                setLoading(true);
                const active = await getActiveSession('live_trend');
                if (active && active.session_id) {
                    const data = await getJobMatches(active.session_id);
                    const rawMatches = data.matches || data.top_matches || [];
                    const formattedMatches = rawMatches.map((m: any) => {
                        const id = m.id || m._id || m.job_id;
                        if (!id) console.warn("⚠️ Job match missing ID:", m);
                        return { ...m, id: id || `missing-${Math.random().toString(36).substr(2, 9)}` };
                    }) as JobMatch[];
                    setMatches(formattedMatches.filter((m: any) => m.is_live));
                    setStage('results');
                }
            } catch (err) {
                console.error("Failed to restore live session:", err);
            } finally {
                setLoading(false);
            }
        };
        checkActiveSession();
    }, []);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setLoading(true);
            setError(null);
            
            const uploadData = await uploadResume(file, 'live_trend', 'Live Trend Search');
            const analysisData = await analyzeResumeLive(uploadData.session_id, 'India');
            
            // Use results from analysis if available, otherwise fallback to getJobMatches
            let jobsList = analysisData.top_matches || analysisData.matches || [];
            if (jobsList.length === 0) {
                const data = await getJobMatches(uploadData.session_id);
                jobsList = data.matches || data.top_matches || [];
            }

            const formattedMatches = jobsList.map((m: any) => {
                const id = m.id || m._id || m.job_id;
                if (!id) console.warn("⚠️ Job match missing ID during upload:", m);
                return { ...m, id: id || `missing-${Math.random().toString(36).substr(2, 9)}` };
            }) as JobMatch[];

            setMatches(formattedMatches.filter((m: any) => m.is_live));
            setStage('results');
        } catch (err: any) {
            console.error('Live search failed:', err);
            setError(err.response?.data?.detail || 'Failed to search live jobs');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveJob = async (jobId: string, currentStatus: boolean) => {
        try {
            await saveJob(jobId);
            setMatches((prev: JobMatch[]) => prev.map((m: JobMatch) => 
                m.id === jobId ? { ...m, is_saved: !currentStatus } : m
            ));
        } catch (err) {
            console.error('Failed to save job:', err);
        }
    };

    const handleApplyNow = (link?: string) => {
        if (link) {
            window.open(link, '_blank');
        } else {
            alert('Application link not available for this job.');
        }
    };

    // Filter matches based on search query
    const filteredMatches = matches.filter(m => 
        m.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.matched_skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Upload Stage
    if (stage === 'upload') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 max-w-2xl w-full text-center space-y-8">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-white to-zinc-400 rounded-2xl flex items-center justify-center">
                        <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Live Job Search</h1>
                        <p className="text-gray-400">Match your profile against thousands of real-time openings from Google Jobs</p>
                    </div>

                    <div className="flex flex-col items-center gap-6">
                        <label className="w-full flex flex-col items-center px-4 py-8 bg-zinc-800/50 rounded-2xl border-2 border-dashed border-zinc-700 cursor-pointer hover:bg-zinc-800 hover:border-zinc-600 transition-all group">
                            <div className="w-16 h-16 rounded-full bg-zinc-700 group-hover:bg-zinc-600 flex items-center justify-center mb-4 transition-colors">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <span className="text-lg font-semibold text-white mb-1">Scan Resume & Find Jobs</span>
                            <span className="text-sm text-gray-400">PDF or DOCX files accepted</span>
                            <input type='file' className="hidden" onChange={handleFileUpload} accept=".pdf,.docx" disabled={loading} />
                        </label>
                        
                        {loading && (
                            <div className="space-y-4 w-full">
                                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-white animate-pulse" style={{ width: '60%' }}></div>
                                </div>
                                <p className="text-sm text-gray-400 animate-pulse font-medium">Querying SerpApi for global openings...</p>
                            </div>
                        )}
                        
                        {error && (
                            <div className="text-red-400 bg-red-500/10 p-4 rounded-xl border border-red-500/20 w-full">
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Results Stage
    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/3 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '1s' }} />
            </div>

            <div className="relative max-w-7xl mx-auto p-6 space-y-6">
                {/* Enhanced Header */}
                <div className="backdrop-blur-xl bg-gradient-to-r from-zinc-900/80 to-zinc-900/40 border border-zinc-800 rounded-3xl p-8">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <h1 className="text-4xl md:text-5xl font-bold">
                                    <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                                        Live Opportunities
                                    </span>
                                </h1>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                                    <div className="relative">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping" />
                                    </div>
                                    <span className="text-sm text-green-400 font-bold">LIVE</span>
                                </div>
                            </div>
                            <p className="text-gray-400 text-lg max-w-2xl">
                                Fresh opportunities from top companies. Updated in real-time.
                            </p>
                        </div>

                        {/* Quick Stats */}
                        <div className="hidden lg:flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-3xl font-bold text-white">{matches.length}</div>
                                <div className="text-sm text-gray-400">Active Jobs</div>
                            </div>
                            <div className="w-px h-12 bg-zinc-700"></div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-green-400">
                                    {matches.length > 0 ? Math.round(matches.reduce((a, m) => a + m.match_percentage, 0) / matches.length) : 0}%
                                </div>
                                <div className="text-sm text-gray-400">Avg Match</div>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Filters */}
                    <div className="flex flex-wrap gap-3">
                        {/* Search */}
                        <div className="flex-1 min-w-[300px]">
                            <div className="relative">
                                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search roles, companies, skills..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-black/50 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:border-white focus:outline-none transition-colors"
                                />
                            </div>
                        </div>

                        <button 
                            onClick={() => setStage('upload')}
                            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-semibold transition-all flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh Search
                        </button>
                    </div>
                </div>

                {/* Job Listings */}
                <div className="space-y-4">
                    {filteredMatches.map((match, i) => (
                        <div
                            key={match.id || i}
                            className="group relative backdrop-blur-xl bg-gradient-to-r from-zinc-900/80 to-zinc-900/40 border border-zinc-800 hover:border-zinc-700 rounded-3xl p-6 transition-all hover:scale-[1.01] hover:shadow-2xl hover:shadow-white/5"
                        >
                            <div className="flex items-start gap-6">
                                {/* Company Logo */}
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-110 transition-transform">
                                        {match.thumbnail ? (
                                            <img src={match.thumbnail} alt={match.company_name} className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        )}
                                    </div>
                                </div>

                                {/* Job Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-2xl font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 group-hover:bg-clip-text transition-all">
                                                    {match.job_title}
                                                </h3>
                                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-bold uppercase tracking-wider border border-green-500/30">
                                                    LIVE
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 text-gray-400 mb-3">
                                                <span className="flex items-center gap-1.5 font-semibold text-gray-300">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                    {match.company_name || 'Company'}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1.5">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    {match.location || 'Remote'}
                                                </span>
                                                {match.via && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-sm italic">via {match.via}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Match Score */}
                                        <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 rounded-2xl">
                                            <div>
                                                <div className="text-3xl font-bold text-green-400">{match.match_percentage}%</div>
                                                <div className="text-xs text-green-500 font-semibold">MATCH</div>
                                            </div>
                                            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {match.matched_skills.slice(0, 5).map(tag => (
                                            <span key={tag} className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400 font-medium">
                                                ✓ {tag}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => handleApplyNow(match.apply_link)}
                                            className="flex-1 px-6 py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group/btn"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            Apply Now
                                            <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </button>
                                        <button 
                                            onClick={() => handleSaveJob(match.id, !!match.is_saved)}
                                            className={`px-6 py-3.5 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                                                match.is_saved 
                                                    ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30' 
                                                    : 'bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 hover:border-zinc-600'
                                            }`}
                                        >
                                            <svg className="w-5 h-5" fill={match.is_saved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                            </svg>
                                            {match.is_saved ? 'Saved' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredMatches.length === 0 && matches.length > 0 && (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🔍</div>
                        <p className="text-gray-400">No jobs match your search. Try different keywords.</p>
                    </div>
                )}

                {matches.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">📭</div>
                        <p className="text-gray-400">No live jobs found. Try uploading a resume to start.</p>
                    </div>
                )}

                {/* Load More */}
                <div className="text-center pt-4">
                    <button 
                        onClick={() => setStage('upload')}
                        className="px-10 py-4 bg-white/5 backdrop-blur-xl border border-white/10 text-white rounded-2xl font-semibold hover:bg-white/10 transition-all inline-flex items-center gap-3"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload Different Resume
                    </button>
                </div>
            </div>
        </div>
    );
};
