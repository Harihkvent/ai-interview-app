import React, { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { getJobMatches, generateRoadmap, analyzeSavedResume, analyzeResume } from '../api';
import { cacheService } from '../services/cacheService';
import { ResumePicker } from './ResumePicker';
import { 
    Search, 
    RefreshCcw, 
    ChevronRight, 
    Target, 
    Briefcase, 
    TrendingUp, 
    Zap,
    ArrowLeft,
    CheckCircle2,
    X
} from 'lucide-react';

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
    const [selectedResumeId, setSelectedResumeId] = useState<string | undefined>();
    const [isCached, setIsCached] = useState(false);
    const [detailsModal, setDetailsModal] = useState<JobMatch | null>(null);

    const activeSessionId = propSessionId || internalSessionId;

    useEffect(() => {
        if (propSessionId) {
            setInternalSessionId(propSessionId.toString());
            loadMatches(propSessionId.toString());
        }
    }, [propSessionId]);

    const loadMatches = async (sid: string) => {
        try {
            setLoading(true);
            setIsCached(false);
            
            // Check cache first
            const cached = cacheService.get<{ matches: JobMatch[] }>('jobMatches', sid);
            if (cached) {
                setMatches((cached.matches || []).filter((m: any) => !m.is_live));
                setIsCached(true);
                setStage('results');
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

    const handleFindMatches = async () => {
        if (!selectedResumeId) {
            showToast('Please select or upload a resume first', 'warning');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            // 1. Create job_match session
            const data = await analyzeSavedResume(selectedResumeId, 'job_match', 'Job Matching');
            const sid = data.session_id;
            setInternalSessionId(sid);
            if (onSessionIdChange) onSessionIdChange(sid);
            
            // 2. Trigger analysis
            await analyzeResume(sid);
            
            // 3. Load matches
            await loadMatches(sid);
        } catch (err: any) {
            console.error('Job matching flow failed:', err);
            setError('Analysis failed. Our AI might be busy, please try again.');
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
            showToast('Failed to generate roadmap', 'error');
        } finally {
            setGenerating(false);
            setSelectedJob(null);
        }
    };

    if (stage === 'upload') {
        return (
            <div className="min-h-screen bg-black p-6 flex items-center justify-center">
                <div className="max-w-xl w-full space-y-8">
                    <div className="text-center space-y-4">
                        <div className="inline-flex p-4 rounded-3xl bg-zinc-900 border border-white/5 shadow-2xl mb-4">
                            <Target className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-5xl font-black text-white tracking-tight">AI Job <span className="text-primary-400">Match</span></h1>
                        <p className="text-zinc-500 text-lg">Select a resume to find your top career matches and skill gaps.</p>
                    </div>

                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl">
                        <ResumePicker 
                            selectedId={selectedResumeId}
                            onSelect={setSelectedResumeId}
                            title="Experience Vault"
                            description="Which version of your experience should we use?"
                        />

                        <div className="mt-8">
                            <button
                                onClick={handleFindMatches}
                                disabled={loading || !selectedResumeId}
                                className={`
                                    w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-2xl
                                    ${loading || !selectedResumeId
                                        ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                                        : 'bg-white text-black hover:scale-[1.02] active:scale-[0.98] shadow-white/10'}
                                `}
                            >
                                {loading ? (
                                    <>
                                        <RefreshCcw className="w-6 h-6 animate-spin" />
                                        <span>ANALYZING...</span>
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-6 h-6 fill-current" />
                                        <span>FIND MY MATCHES</span>
                                        <ChevronRight className="w-6 h-6" />
                                    </>
                                )}
                            </button>
                            
                            {error && (
                                <p className="text-red-400 text-sm text-center mt-4 font-medium animate-pulse">{error}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black p-6 space-y-8">
            {/* Results Header */}
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-zinc-800">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => setStage('upload')}
                        className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition-all"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-black text-white">Career Intelligence</h1>
                        <p className="text-zinc-500 font-medium tracking-wide">MATCHES BASED ON AI ANALYSIS</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center gap-4">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <Briefcase className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <div className="text-white font-black text-xl leading-none">{matches.length}</div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Matches</div>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center gap-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-white font-black text-xl leading-none">
                                {matches.length > 0 ? `${Math.round(matches.reduce((acc, m) => acc + m.match_percentage, 0) / matches.length)}%` : '0%'}
                            </div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Avg Fit</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                {matches.map((match, idx) => (
                    <div 
                        key={idx}
                        className="group relative bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 rounded-[2.5rem] p-8 transition-all hover:bg-zinc-900 shadow-2xl"
                    >
                        <div className="flex items-start justify-between mb-8">
                            <div className="flex items-start gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center font-black text-black text-3xl shadow-white/10 group-hover:scale-105 transition-transform">
                                    {idx + 1}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-white group-hover:text-primary-400 transition-colors uppercase tracking-tight">
                                        {match.job_title}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-32 bg-zinc-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-primary-400 to-purple-400 transition-all duration-1000"
                                                style={{ width: `${match.match_percentage}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-black text-white">{match.match_percentage}% Match</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setDetailsModal(match)}
                                className="p-3 rounded-2xl bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors"
                            >
                                <Zap className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Skills Preview */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Strengths</p>
                                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                                    {match.matched_skills.slice(0, 3).map((s, i) => (
                                        <span key={i} className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full border border-green-500/20">{s}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Growth Areas</p>
                                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                                    {match.missing_skills.slice(0, 3).map((s, i) => (
                                        <span key={i} className="px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20">{s}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <button
                            onClick={() => handleGenerateRoadmap(match.job_title)}
                            disabled={generating}
                            className={`
                                w-full py-5 rounded-[1.5rem] font-black tracking-widest text-sm transition-all flex items-center justify-center gap-3
                                ${generating && selectedJob === match.job_title
                                    ? 'bg-zinc-800 text-zinc-500'
                                    : 'bg-white text-black hover:bg-zinc-200 active:scale-95 shadow-white/5'}
                            `}
                        >
                            {generating && selectedJob === match.job_title ? (
                                <>
                                    <RefreshCcw className="w-5 h-5 animate-spin" />
                                    <span>GENERATING ROADMAP...</span>
                                </>
                            ) : (
                                <>
                                    <span>EVOLVE CAREER</span>
                                    <ChevronRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {detailsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-3xl">
                    <div className="max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-[3rem] p-12 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-400 to-purple-400" />
                        
                        <button 
                            onClick={() => setDetailsModal(null)}
                            className="absolute top-8 right-8 p-2 text-zinc-500 hover:text-white transition-colors"
                        >
                            <X className="w-8 h-8" />
                        </button>

                        <div className="space-y-8">
                            <div className="space-y-2">
                                <div className="inline-block px-4 py-1.5 rounded-full bg-primary-500/10 text-primary-400 text-xs font-black tracking-widest mb-2">
                                    MATCH ANALYSIS
                                </div>
                                <h2 className="text-4xl font-black text-white uppercase tracking-tight leading-none">
                                    {detailsModal.job_title}
                                </h2>
                            </div>

                            <div className="space-y-2">
                                <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em]">Responsibility Overview</p>
                                <div className="p-6 bg-black rounded-3xl border border-zinc-800 text-zinc-400 text-sm leading-relaxed max-h-48 overflow-y-auto custom-scrollbar">
                                    {detailsModal.job_description || "Detailed AI matching analysis in progress..."}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                        <p className="font-black text-white text-xs tracking-widest">MATCHED</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {detailsModal.matched_skills.map((s, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-xl text-[10px] font-bold">{s}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-orange-400" />
                                        <p className="font-black text-white text-xs tracking-widest">SKILL GAPS</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {detailsModal.missing_skills.map((s, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-orange-500/10 text-orange-400 rounded-xl text-[10px] font-bold">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    handleGenerateRoadmap(detailsModal.job_title);
                                    setDetailsModal(null);
                                }}
                                className="w-full py-6 bg-white text-black rounded-[2rem] font-black text-lg hover:scale-[1.02] transition-all shadow-2xl shadow-white/5 flex items-center justify-center gap-3"
                            >
                                <TrendingUp className="w-6 h-6" />
                                START ROADMAP
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
