import React, { useEffect, useState } from 'react';
import { getJobMatches, generateRoadmap, uploadResume, analyzeResume } from '../api';
import { cacheService } from '../services/cacheService';

interface JobMatch {
    rank: number;
    job_title: string;
    match_percentage: number;
    matched_skills: string[];
    missing_skills: string[];
    job_description: string;
}

interface JobMatcherProps {
    sessionId?: string | number | null;
    onSessionIdChange?: (id: string | number | null) => void;
    onRoadmapGenerated: () => void;
}

export const JobMatcher: React.FC<JobMatcherProps> = ({ sessionId: propSessionId, onSessionIdChange, onRoadmapGenerated }) => {
    const [matches, setMatches] = useState<JobMatch[]>([]);
    const [loading, setLoading] = useState(false);
    const [stage, setStage] = useState<'upload' | 'results'>('upload');
    const [generating, setGenerating] = useState(false);
    const [selectedJob, setSelectedJob] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [internalSessionId, setInternalSessionId] = useState<string | null>(null);
    const [isCached, setIsCached] = useState(false);
    const [savedResumes, setSavedResumes] = useState<any[]>([]);

    // Use prop sessionId if provided, otherwise use internal
    const activeSessionId = propSessionId || internalSessionId;

    useEffect(() => {
        if (propSessionId) {
            setInternalSessionId(propSessionId.toString());
            loadMatches(propSessionId.toString());
        }
        fetchSavedResumes();
    }, [propSessionId]);

    const fetchSavedResumes = async () => {
        try {
            const data = await import('../api').then(m => m.getSavedResumes());
            setSavedResumes(data);
        } catch (err) {
            console.error('Failed to fetch saved resumes:', err);
        }
    };

    const loadMatches = async (sid: string) => {
        try {
            setLoading(true);
            setIsCached(false);
            
            // Check cache first
            const cached = cacheService.get<{ matches: JobMatch[] }>('jobMatches', sid);
            if (cached) {
                console.log('📦 Using cached job matches');
                setMatches((cached.matches || []).filter((m: any) => !m.is_live));
                setIsCached(true);
                setStage('results');
                setLoading(false);
                return;
            }
            
            const data = await getJobMatches(sid);
            setMatches((data.matches || []).filter((m: any) => !m.is_live));
            setIsCached(data.from_cache || false);
            setStage('results');
        } catch (err: any) {
            console.error('Failed to load matches:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setLoading(true);
            setError(null);
            
            // 1. Upload
            const uploadData = await uploadResume(file, 'job_match', 'Job Matching');
            const newSessionId = uploadData.session_id;
            setInternalSessionId(newSessionId);
            if (onSessionIdChange) onSessionIdChange(newSessionId);
            
            // 2. Analyze
            await analyzeResume(newSessionId);
            
            // 3. Load Matches
            const data = await getJobMatches(newSessionId);
            setMatches((data.matches || []).filter((m: any) => !m.is_live));
            setStage('results');
            fetchSavedResumes(); // Refresh list
        } catch (err: any) {
            console.error('Upload/Analysis failed:', err);
            setError(err.response?.data?.detail || 'Failed to process resume');
        } finally {
            setLoading(false);
        }
    };

    const handleSavedResumeSelect = async (resumeId: string) => {
        try {
            setLoading(true);
            setError(null);
            
            // 1. Create session from saved resume
            const data = await import('../api').then(m => m.analyzeSavedResume(resumeId, 'job_match', 'Job Matching'));
            const newSessionId = data.session_id;
            setInternalSessionId(newSessionId);
            if (onSessionIdChange) onSessionIdChange(newSessionId);
            
            // 2. Analyze
            await analyzeResume(newSessionId);
            
            // 3. Load Matches
            await loadMatches(newSessionId);
        } catch (err: any) {
            console.error('Saved resume analysis failed:', err);
            setError(err.response?.data?.detail || 'Failed to process saved resume');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateRoadmap = async (jobTitle: string) => {
        if (!activeSessionId) return;
        setGenerating(true);
        setSelectedJob(jobTitle);
        try {
            await generateRoadmap(activeSessionId.toString(), jobTitle);
            onRoadmapGenerated();
        } catch (err: any) {
            console.error('Failed to generate roadmap:', err);
            alert(err.response?.data?.detail || 'Failed to generate roadmap');
        } finally {
            setGenerating(false);
            setSelectedJob(null);
        }
    };

    if (stage === 'upload') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black relative overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
                    <div className="absolute bottom-20 right-20 w-80 h-80 bg-white/3 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '1s' }} />
                </div>

                <div className="relative min-h-screen flex items-center justify-center p-6">
                    <div className="w-full max-w-6xl">
                        {/* Header */}
                        <div className="text-center mb-12 space-y-6">
                            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-4">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-sm font-semibold text-green-400">AI-POWERED MATCHING</span>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-bold">
                                <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                                    Find Your Perfect Role
                                </span>
                            </h1>
                            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                                Upload your resume or select a saved one to get AI-matched with roles that fit your skills perfectly
                            </p>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* Left Column - Saved Resumes */}
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                                    </svg>
                                    Your Saved Resumes
                                </h3>
                                
                                {savedResumes.length > 0 ? (
                                    <div className="space-y-4">
                                        {savedResumes.slice(0, 3).map((resume, idx) => (
                                            <button
                                                key={resume.id}
                                                onClick={() => handleSavedResumeSelect(resume.id)}
                                                disabled={loading}
                                                className="group relative w-full backdrop-blur-xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800 hover:border-zinc-700 rounded-3xl p-6 transition-all hover:scale-[1.02] text-left disabled:opacity-50"
                                                style={{ animationDelay: `${idx * 100}ms` }}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-white mb-1 truncate">{resume.name}</h4>
                                                        <p className="text-sm text-gray-400">Uploaded {new Date(resume.uploaded_at).toLocaleDateString()}</p>
                                                    </div>
                                                    <svg className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                    </svg>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 text-center">
                                        <div className="text-5xl mb-3 opacity-30">📭</div>
                                        <p className="text-gray-400">No saved resumes yet</p>
                                    </div>
                                )}
                            </div>

                            {/* Right Column - Upload Area */}
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    Upload New Resume
                                </h3>

                                <label className={`group relative block backdrop-blur-xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border-2 border-dashed rounded-3xl p-12 cursor-pointer transition-all ${loading ? 'opacity-50 pointer-events-none' : 'border-zinc-700 hover:border-white/30 hover:bg-zinc-900/60'}`}>
                                    <input type='file' className="hidden" onChange={handleFileUpload} accept=".pdf,.docx" disabled={loading} />
                                    <div className="text-center space-y-4">
                                        <div className="inline-flex w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 items-center justify-center group-hover:scale-110 transition-transform mb-2">
                                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-white mb-2">
                                                Drop your resume here or click to browse
                                            </p>
                                            <p className="text-sm text-gray-400">
                                                Supports PDF and DOCX • Max 10MB
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-center gap-2 pt-4">
                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            <span className="text-xs text-gray-500">Secure & Private</span>
                                        </div>
                                    </div>
                                </label>

                                {loading && (
                                    <div className="backdrop-blur-xl bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                            <span className="text-sm font-semibold text-blue-400">Processing your resume...</span>
                                        </div>
                                        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-progress"></div>
                                        </div>
                                        <p className="text-xs text-gray-400">Analyzing skills & finding best matches</p>
                                    </div>
                                )}

                                {error && (
                                    <div className="backdrop-blur-xl bg-red-500/10 border border-red-500/30 rounded-3xl p-4">
                                        <div className="flex items-start gap-3">
                                            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="text-sm text-red-400">{error}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '7s' }} />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-white/3 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '9s', animationDelay: '1.5s' }} />
            </div>

            <div className="relative max-w-7xl mx-auto p-6 space-y-8">
                {/* Enhanced Header */}
                <div className="text-center py-8">
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full mb-6">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-semibold text-green-400">AI ANALYSIS COMPLETE</span>
                        {isCached && (
                            <>
                                <span className="text-green-500">•</span>
                                <span className="text-sm font-semibold text-blue-400">CACHED RESULTS</span>
                            </>
                        )}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                            Your Top Job Matches
                        </span>
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        We've analyzed your profile and identified these roles as the best fit for your unique skill set
                    </p>

                    {/* Stats Bar */}
                    <div className="flex flex-wrap justify-center gap-8 mt-8">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-white">{matches.length}</div>
                            <div className="text-sm text-gray-400 mt-1">Matches Found</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-400">
                                {Math.round(matches.reduce((acc, m) => acc + m.match_percentage, 0) / matches.length)}%
                            </div>
                            <div className="text-sm text-gray-400 mt-1">Avg Match Rate</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-400">
                                {matches.reduce((acc, m) => acc + m.matched_skills.length, 0)}
                            </div>
                            <div className="text-sm text-gray-400 mt-1">Skills Analyzed</div>
                        </div>
                    </div>
                </div>

                {/* Job Matches Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    {matches.slice(0, 10).map((match, index) => (
                        <div
                            key={match.rank}
                            className="group relative backdrop-blur-xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800 hover:border-zinc-700 rounded-3xl p-8 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-white/5"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            {/* Rank Badge */}
                            <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-white to-gray-300 rounded-2xl flex items-center justify-center font-bold text-black text-lg shadow-lg group-hover:scale-110 transition-transform">
                                #{match.rank}
                            </div>

                            {/* Match Percentage Circle */}
                            <div className="absolute -top-4 -right-4">
                                <div className="relative w-20 h-20">
                                    <svg className="w-20 h-20 transform -rotate-90">
                                        <circle cx="40" cy="40" r="36" stroke="#27272a" strokeWidth="6" fill="none" />
                                        <circle 
                                            cx="40" 
                                            cy="40" 
                                            r="36" 
                                            stroke="white" 
                                            strokeWidth="6" 
                                            fill="none"
                                            strokeDasharray={`${2 * Math.PI * 36}`}
                                            strokeDashoffset={`${2 * Math.PI * 36 * (1 - match.match_percentage / 100)}`}
                                            className="transition-all duration-1000"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-sm font-bold text-white">{match.match_percentage}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Job Title */}
                            <h3 className="text-2xl font-bold text-white mb-6 mt-4 pr-12 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 group-hover:bg-clip-text transition-all">
                                {match.job_title}
                            </h3>

                            {/* Skills Section */}
                            <div className="space-y-4 mb-6">
                                {/* Matched Skills */}
                                {match.matched_skills.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-xs font-bold text-green-400 uppercase tracking-wider">You Have ({match.matched_skills.length})</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {match.matched_skills.slice(0, 6).map(skill => (
                                                <span key={skill} className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-xs font-semibold">
                                                    {skill}
                                                </span>
                                            ))}
                                            {match.matched_skills.length > 6 && (
                                                <span className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-xs font-semibold">
                                                    +{match.matched_skills.length - 6} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Missing Skills */}
                                {match.missing_skills.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Skills to Learn ({match.missing_skills.length})</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {match.missing_skills.slice(0, 6).map(skill => (
                                                <span key={skill} className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-lg text-xs font-semibold">
                                                    {skill}
                                                </span>
                                            ))}
                                            {match.missing_skills.length > 6 && (
                                                <span className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-lg text-xs font-semibold">
                                                    +{match.missing_skills.length - 6} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleGenerateRoadmap(match.job_title)}
                                    disabled={generating}
                                    className="flex-1 px-6 py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group/btn"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                    </svg>
                                    {generating && selectedJob === match.job_title ? 'Building...' : 'Career Roadmap'}
                                </button>
                                <button className="px-6 py-3.5 bg-zinc-800 border border-zinc-700 text-white rounded-xl font-semibold hover:bg-zinc-700 hover:border-zinc-600 transition-all">
                                    Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Bottom Actions */}
                <div className="text-center pt-8">
                    <button 
                        onClick={() => setStage('upload')}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 text-white rounded-3xl font-semibold hover:bg-white/10 transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Upload Different Resume
                    </button>
                </div>
            </div>
        </div>
    );
};
