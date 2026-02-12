import React, { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
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
    const { showToast } = useToast();
    const [matches, setMatches] = useState<JobMatch[]>([]);
    const [loading, setLoading] = useState(false);
    const [stage, setStage] = useState<'upload' | 'results'>('upload');
    const [generating, setGenerating] = useState(false);
    const [selectedJob, setSelectedJob] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [internalSessionId, setInternalSessionId] = useState<string | null>(null);
    const [isCached, setIsCached] = useState(false);
    const [savedResumes, setSavedResumes] = useState<any[]>([]);
    const [detailsModal, setDetailsModal] = useState<JobMatch | null>(null);

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
            showToast(err.response?.data?.detail || 'Failed to generate roadmap', 'error');
        } finally {
            setGenerating(false);
            setSelectedJob(null);
        }
    };

    // Job Details Modal Component
    const JobDetailsModal = ({ job, onClose }: { job: JobMatch; onClose: () => void }) => {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
                <div 
                    className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white to-zinc-400 flex items-center justify-center font-bold text-black text-xl">
                                #{job.rank}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">{job.job_title}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-white font-bold">{job.match_percentage}%</span>
                                    <span className="text-gray-400 text-sm">Match</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Match Bar */}
                    <div className="mb-6">
                        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-white transition-all duration-500" 
                                style={{ width: `${job.match_percentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Skills Section */}
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                            <h3 className="text-sm font-bold text-green-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Your Matching Skills
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {job.matched_skills.length > 0 ? job.matched_skills.map(skill => (
                                    <span key={skill} className="px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg text-sm font-medium">
                                        {skill}
                                    </span>
                                )) : (
                                    <span className="text-gray-400 text-sm">No specific skills matched</span>
                                )}
                            </div>
                        </div>

                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                            <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                Skills to Learn
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {job.missing_skills.length > 0 ? job.missing_skills.map(skill => (
                                    <span key={skill} className="px-3 py-1.5 bg-orange-500/20 text-orange-300 rounded-lg text-sm font-medium">
                                        {skill}
                                    </span>
                                )) : (
                                    <span className="text-gray-400 text-sm">You have all required skills!</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Job Description */}
                    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 mb-6">
                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Job Description
                        </h3>
                        <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {job.job_description || 'No description available for this position.'}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                onClose();
                                handleGenerateRoadmap(job.job_title);
                            }}
                            disabled={generating}
                            className="flex-1 py-3.5 bg-white text-black rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-gray-200"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            {generating && selectedJob === job.job_title ? 'Generating...' : 'Generate Career Roadmap'}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-semibold border border-zinc-700 transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Upload Stage
    if (stage === 'upload') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 max-w-2xl w-full text-center space-y-8">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-white to-zinc-400 rounded-2xl flex items-center justify-center">
                        <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">AI Job Matcher</h1>
                        <p className="text-gray-400">Choose a saved resume or upload a new one to find your perfect job matches</p>
                    </div>

                    <div className="flex flex-col items-center gap-6">
                        {savedResumes.length > 0 && (
                            <div className="w-full space-y-3">
                                <h3 className="text-left text-sm font-semibold text-gray-500 uppercase tracking-wider">Your Resumes</h3>
                                <div className="grid gap-3">
                                    {savedResumes.slice(0, 3).map(resume => (
                                        <button
                                            key={resume.id}
                                            onClick={() => handleSavedResumeSelect(resume.id)}
                                            disabled={loading}
                                            className="w-full flex items-center gap-4 p-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-all text-left group disabled:opacity-50"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center group-hover:bg-zinc-600 transition-colors">
                                                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-semibold text-white">{resume.name}</div>
                                                <div className="text-xs text-gray-400">Uploaded {new Date(resume.uploaded_at).toLocaleDateString()}</div>
                                            </div>
                                            <span className="text-white opacity-0 group-hover:opacity-100 transition-all">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="w-full flex items-center gap-4 py-2">
                            <div className="h-px flex-1 bg-zinc-800"></div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">or</span>
                            <div className="h-px flex-1 bg-zinc-800"></div>
                        </div>

                        <label className="w-full flex flex-col items-center px-4 py-8 bg-zinc-800/50 rounded-2xl border-2 border-dashed border-zinc-700 cursor-pointer hover:bg-zinc-800 hover:border-zinc-600 transition-all group">
                            <div className="w-16 h-16 rounded-full bg-zinc-700 group-hover:bg-zinc-600 flex items-center justify-center mb-4 transition-colors">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <span className="text-lg font-semibold text-white mb-1">Upload New Resume</span>
                            <span className="text-sm text-gray-400">PDF or DOCX files accepted</span>
                            <input type='file' className="hidden" onChange={handleFileUpload} accept=".pdf,.docx" disabled={loading} />
                        </label>
                        
                        {loading && (
                            <div className="space-y-4 w-full">
                                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-white animate-pulse" style={{ width: '60%' }}></div>
                                </div>
                                <p className="text-sm text-gray-400 animate-pulse font-medium">Analyzing skills & matching roles...</p>
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
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-white/3 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
            </div>

            <div className="relative max-w-7xl mx-auto p-6 space-y-8">
                {/* Enhanced Header */}
                <div className="text-center py-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-full mb-6 hover:scale-105 transition-transform">
                        <div className="relative">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping" />
                        </div>
                        <span className="text-sm font-semibold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            AI Analysis Complete
                        </span>
                        {isCached && (
                            <div className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-400 font-bold">
                                📦 CACHED
                            </div>
                        )}
                    </div>

                    <h1 className="text-5xl md:text-6xl font-bold mb-4">
                        <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                            Your Perfect
                        </span>
                        <br />
                        <span className="text-white">Career Matches</span>
                    </h1>
                    
                    <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
                        Based on your unique skills and experience, we've identified the best opportunities for you
                    </p>

                    {/* Stats Bar */}
                    <div className="flex items-center justify-center gap-6 flex-wrap">
                        {[
                            { label: 'Matches Found', value: matches.length.toString(), icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                            { label: 'Avg Match Rate', value: matches.length > 0 ? `${Math.round(matches.reduce((acc, m) => acc + m.match_percentage, 0) / matches.length)}%` : '0%', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                            { label: 'Skills Analyzed', value: matches.length > 0 ? matches.reduce((acc, m) => acc + m.matched_skills.length, 0).toString() : '0', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                        ].map((stat, i) => (
                            <div key={i} className="flex items-center gap-3 px-5 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                                </svg>
                                <div className="text-left">
                                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                                    <div className="text-xs text-gray-400">{stat.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Job Matches Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    {matches.slice(0, 10).map((match, index) => (
                        <div
                            key={match.rank}
                            className="group relative bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-3xl p-8 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-white/5"
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

                            {/* Content */}
                            <div className="mt-8">
                                <h3 className="text-2xl font-bold text-white mb-6 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 group-hover:bg-clip-text transition-all">
                                    {match.job_title}
                                </h3>

                                {/* Skills Section */}
                                <div className="space-y-5 mb-6">
                                    {/* Matched Skills */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-xs uppercase font-bold text-green-500 tracking-wider">Your Strengths</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {match.matched_skills.slice(0, 4).map(skill => (
                                                <span key={skill} className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-sm border border-green-500/20 font-medium hover:bg-green-500/20 transition-colors">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Missing Skills */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-xs uppercase font-bold text-orange-400 tracking-wider">Learn Next</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {match.missing_skills.slice(0, 4).map(skill => (
                                                <span key={skill} className="px-3 py-1.5 bg-orange-500/10 text-orange-400 rounded-lg text-sm border border-orange-500/20 font-medium hover:bg-orange-500/20 transition-colors">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => handleGenerateRoadmap(match.job_title)}
                                        disabled={generating}
                                        className="flex-1 px-6 py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group/btn disabled:opacity-50"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                        </svg>
                                        {generating && selectedJob === match.job_title ? 'Generating...' : 'Career Roadmap'}
                                        <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </button>
                                    <button 
                                        onClick={() => setDetailsModal(match)}
                                        className="px-6 py-3.5 bg-zinc-800 border border-zinc-700 text-white rounded-xl font-semibold hover:bg-zinc-700 hover:border-zinc-600 transition-all flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-center gap-4 pt-8">
                    <button 
                        onClick={() => setStage('upload')}
                        className="px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 text-white rounded-xl font-semibold hover:bg-white/10 transition-all flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload Different Resume
                    </button>
                    <button 
                        onClick={() => activeSessionId && loadMatches(activeSessionId.toString())}
                        className="px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 text-white rounded-xl font-semibold hover:bg-white/10 transition-all flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh Matches
                    </button>
                </div>
            </div>

            {/* Job Details Modal */}
            {detailsModal && (
                <JobDetailsModal job={detailsModal} onClose={() => setDetailsModal(null)} />
            )}
        </div>
    );
};
