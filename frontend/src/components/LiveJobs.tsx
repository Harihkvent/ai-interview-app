import React, { useEffect, useState } from 'react';
import { getJobMatches, uploadResume, analyzeResumeLive } from '../api';

interface JobMatch {
    rank: number;
    job_title: string;
    match_percentage: number;
    matched_skills: string[];
    missing_skills: string[];
    company_name?: string;
    location?: string;
    thumbnail?: string;
    via?: string;
}

export const LiveJobs: React.FC = () => {
    const [matches, setMatches] = useState<JobMatch[]>([]);
    const [loading, setLoading] = useState(false);
    const [stage, setStage] = useState<'upload' | 'results'>('upload');
    const [error, setError] = useState<string | null>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setLoading(true);
            setError(null);
            
            const uploadData = await uploadResume(file);
            await analyzeResumeLive(uploadData.session_id, 'India');
            
            const data = await getJobMatches(uploadData.session_id);
            setMatches((data.matches || []).filter((m: any) => m.is_live));
            setStage('results');
        } catch (err: any) {
            console.error('Live search failed:', err);
            setError(err.response?.data?.detail || 'Failed to search live jobs');
        } finally {
            setLoading(false);
        }
    };

    if (stage === 'upload') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-12 max-w-2xl w-full text-center space-y-8">
                    <div className="text-7xl mb-4 text-secondary-400">🌐</div>
                    <div>
                        <h1 className="text-4xl font-bold text-secondary-400 mb-2">Live Job Search</h1>
                        <p className="text-gray-300">Match your profile against thousands of real-time openings from Google Jobs</p>
                    </div>

                    <div className="flex flex-col items-center gap-6">
                        <label className="w-full max-w-md flex flex-col items-center px-4 py-8 bg-black/20 text-blue rounded-2xl border-2 border-dashed border-secondary-500/30 cursor-pointer hover:bg-secondary-500/5 hover:border-secondary-500 transition-all group">
                            <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">📄</span>
                            <span className="text-lg font-semibold text-text-secondary">Scan Resume & Find Jobs</span>
                            <input type='file' className="hidden" onChange={handleFileUpload} accept=".pdf,.docx" disabled={loading} />
                        </label>
                        
                        {loading && (
                            <div className="space-y-4 w-full max-w-md">
                                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-secondary-500 animate-progress"></div>
                                </div>
                                <p className="text-sm text-secondary-400 animate-pulse font-medium">Querying SerpApi for global openings...</p>
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
                <div className="glass-card p-8 text-center bg-gradient-to-br from-secondary-900/20 to-transparent">
                    <div className="text-6xl mb-4">🚀</div>
                    <h1 className="text-4xl font-bold text-secondary-400 mb-2">Live Opportunities</h1>
                    <p className="text-gray-300 max-w-2xl mx-auto">Real-time vacancies from top companies that match your experience.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-1">
                    {matches.map((match, idx) => (
                        <div key={idx} className="glass-card p-6 border border-white/10 hover:border-secondary-500/50 flex flex-col md:flex-row gap-6 items-center">
                            {match.thumbnail && (
                                <img src={match.thumbnail} alt={match.company_name} className="w-20 h-20 rounded-xl bg-white p-2 object-contain shadow-xl" />
                            )}
                            <div className="flex-1 text-center md:text-left">
                                <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                                    <h3 className="text-xl font-bold text-white">{match.job_title}</h3>
                                    <span className="px-2 py-0.5 bg-secondary-400/20 text-secondary-300 rounded-full text-[10px] font-bold uppercase tracking-wider">Live</span>
                                </div>
                                <p className="text-secondary-300 font-medium">{match.company_name} • {match.location}</p>
                                <p className="text-xs text-text-tertiary mt-1 italic">via {match.via}</p>
                                
                                <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                                    {match.matched_skills.map(s => (
                                        <span key={s} className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-[10px] border border-green-500/20">✓ {s}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <div className="text-2xl font-black text-secondary-400">{match.match_percentage}%</div>
                                <div className="text-[10px] text-gray-400 uppercase font-bold">Match Score</div>
                                <button className="mt-2 px-6 py-2 bg-secondary-600 hover:bg-secondary-500 rounded-lg text-white font-bold transition-all text-sm">
                                    Quick Apply
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                
                <button 
                    onClick={() => setStage('upload')}
                    className="mx-auto block text-secondary-400 hover:text-secondary-300 font-medium py-4 px-8"
                >
                    ← Search again
                </button>
            </div>
        </div>
    );
};
