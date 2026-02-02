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
            alert(err.response?.data?.detail || 'Failed to generate roadmap');
        } finally {
            setGenerating(false);
            setSelectedJob(null);
        }
    };

    // Job Details Modal Component
    const JobDetailsModal = ({ job, onClose }: { job: JobMatch; onClose: () => void }) => {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
                <div 
                    className="glass-card p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-white/20 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-primary-500 text-white w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg">
                                #{job.rank}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">{job.job_title}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-primary-400 font-bold">{job.match_percentage}%</span>
                                    <span className="text-gray-400 text-sm">Match Accuracy</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Match Bar */}
                    <div className="mb-6">
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500" 
                                style={{ width: `${job.match_percentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Skills Section */}
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                            <h3 className="text-sm font-bold text-green-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <span className="text-lg">✓</span> Your Matching Skills
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
                                <span className="text-lg">📚</span> Skills to Learn
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
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <span className="text-lg">📋</span> Job Description
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
                            className="flex-1 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <span>🗺️</span>
                            {generating && selectedJob === job.job_title ? 'Generating...' : 'Generate Career Roadmap'}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold border border-white/10 transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (stage === 'upload') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-12 max-w-2xl w-full text-center space-y-8">
                    <div className="text-7xl mb-4">🎯</div>
                    <div>
                        <h1 className="text-4xl font-bold text-primary-400 mb-2">AI Job Matcher</h1>
                        <p className="text-gray-300">Choose a saved resume or upload a new one to find your perfect job matches</p>
                    </div>

                    <div className="flex flex-col items-center gap-6">
                        {savedResumes.length > 0 && (
                            <div className="w-full space-y-3">
                                <h3 className="text-left text-sm font-semibold text-gray-400 uppercase tracking-wider">Your Resumes</h3>
                                <div className="grid gap-3">
                                    {savedResumes.slice(0, 3).map(resume => (
                                        <button
                                            key={resume.id}
                                            onClick={() => handleSavedResumeSelect(resume.id)}
                                            disabled={loading}
                                            className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-left group"
                                        >
                                            <span className="text-2xl group-hover:scale-110 transition-transform">📄</span>
                                            <div className="flex-1">
                                                <div className="font-semibold text-white">{resume.name}</div>
                                                <div className="text-xs text-gray-400">Uploaded {new Date(resume.uploaded_at).toLocaleDateString()}</div>
                                            </div>
                                            <span className="text-primary-400 opacity-0 group-hover:opacity-100 transition-all">Match →</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="w-full flex items-center gap-4 py-2">
                            <div className="h-px flex-1 bg-white/10"></div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">or</span>
                            <div className="h-px flex-1 bg-white/10"></div>
                        </div>

                        <label className="w-full flex flex-col items-center px-4 py-8 bg-black/20 text-blue rounded-2xl border-2 border-dashed border-primary-500/30 cursor-pointer hover:bg-primary-500/5 hover:border-primary-500 transition-all group">
                            <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">📤</span>
                            <span className="text-lg font-semibold text-text-secondary">Upload New Resume (PDF/DOCX)</span>
                            <input type='file' className="hidden" onChange={handleFileUpload} accept=".pdf,.docx" disabled={loading} />
                        </label>
                        
                        {loading && (
                            <div className="space-y-4 w-full">
                                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary-500 animate-progress"></div>
                                </div>
                                <p className="text-sm text-primary-400 animate-pulse font-medium">Analyzing skills & matching roles...</p>
                            </div>
                        )}
                        
                        {error && <div className="text-error-500 bg-error-500/10 p-4 rounded-xl border border-error-500/20 w-full">{error}</div>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 pb-20">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="glass-card p-8 text-center bg-gradient-to-br from-primary-900/20 to-transparent">
                    <div className="text-6xl mb-4">✨</div>
                    <h1 className="text-4xl font-bold text-primary-400 mb-2">Your Top AI Matches {isCached && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded ml-2">📦 Cached</span>}</h1>
                    <p className="text-gray-300 max-w-2xl mx-auto">We've identified these roles as the best fit for your unique skill set.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {matches.slice(0, 10).map((match) => (
                        <div key={match.rank} className="glass-card p-6 border border-white/10 hover:border-primary-500/50 hover:scale-[1.01] transition-all">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="bg-primary-500 text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold">
                                    #{match.rank}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white">{match.job_title}</h3>
                                    <div className="h-1.5 w-full bg-white/10 rounded-full mt-2 overflow-hidden">
                                        <div className="h-full bg-primary-400" style={{ width: `${match.match_percentage}%` }}></div>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-xs text-gray-400">Match Accuracy</span>
                                        <span className="text-xs font-bold text-primary-400">{match.match_percentage}%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-green-500 mb-1.5">Top Skills Match</div>
                                    <div className="flex flex-wrap gap-1">
                                        {match.matched_skills.slice(0, 4).map(s => (
                                            <span key={s} className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-[10px]">{s}</span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-orange-400 mb-1.5">Recommended focus</div>
                                    <div className="flex flex-wrap gap-1">
                                        {match.missing_skills.slice(0, 4).map(s => (
                                            <span key={s} className="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded text-[10px]">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleGenerateRoadmap(match.job_title)}
                                    disabled={generating}
                                    className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-bold transition-all disabled:opacity-50"
                                >
                                    {generating && selectedJob === match.job_title ? 'Generating...' : 'Career Roadmap'}
                                </button>
                                <button
                                    onClick={() => setDetailsModal(match)}
                                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold border border-white/10 transition-all"
                                >
                                    Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                
                <button 
                    onClick={() => setStage('upload')}
                    className="mx-auto block text-primary-400 hover:text-primary-300 font-medium py-4 px-8"
                >
                    ← Upload different resume
                </button>
            </div>

            {/* Job Details Modal */}
            {detailsModal && (
                <JobDetailsModal job={detailsModal} onClose={() => setDetailsModal(null)} />
            )}
        </div>
    );
};
