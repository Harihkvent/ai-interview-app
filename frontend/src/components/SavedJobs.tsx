import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSavedJobs, saveJob, generateRoadmap, prepareForJob, uploadResume } from '../api';

interface JobMatch {
    id: string;
    job_id?: string;
    job_title: string;
    job_description?: string;
    match_percentage: number;
    matched_skills: string[];
    missing_skills: string[];
    company_name?: string;
    location?: string;
    thumbnail?: string;
    via?: string;
    apply_link?: string;
}

export const SavedJobs: React.FC = () => {
    const [savedJobs, setSavedJobs] = useState<JobMatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [selectedJob, setSelectedJob] = useState<JobMatch | null>(null);
    const [uploadingResume, setUploadingResume] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchSavedJobs();
    }, []);

    const fetchSavedJobs = async () => {
        try {
            setLoading(true);
            const data = await getSavedJobs();
            const rawJobs = data.jobs || data.matches || [];
            const formatted = rawJobs.map((j: any) => {
                const id = j.id || j._id || j.job_id;
                if (!id) console.warn("⚠️ Saved job missing ID:", j);
                return { ...j, id: id || `missing-${Math.random().toString(36).substr(2, 9)}` };
            }) as JobMatch[];
            setSavedJobs(formatted);
        } catch (err) {
            setError('Failed to fetch saved jobs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUnsave = async (jobId: string) => {
        try {
            await saveJob(jobId);
            setSavedJobs(prev => prev.filter(j => j.id !== jobId));
        } catch (err) {
            console.error('Failed to unsave job:', err);
        }
    };

    const handleCreateRoadmap = async (job: JobMatch) => {
        try {
            setActionLoading(job.id);
            const sessionId = (job as any).session_id || 'placeholder-session';
            
            await generateRoadmap(sessionId, job.job_title);
            navigate('/roadmaps');
        } catch (err: any) {
            console.error('Failed to generate roadmap:', err);
            
            if (err.response?.status === 404 || err.response?.status === 500) {
                setSelectedJob(job);
                setShowUploadDialog(true);
            } else {
                alert('Failed to generate roadmap. Please try again.');
            }
        } finally {
            setActionLoading(null);
        }
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedJob) return;

        try {
            setUploadingResume(true);
            await uploadResume(file, 'job_match', 'Job Matching');
            const sessionId = (selectedJob as any).session_id || 'placeholder-session';
            await generateRoadmap(sessionId, selectedJob.job_title);
            setShowUploadDialog(false);
            setSelectedJob(null);
            navigate('/roadmaps');
        } catch (err) {
            console.error('Failed to upload resume or generate roadmap:', err);
            alert('Failed to process. Please try again.');
        } finally {
            setUploadingResume(false);
        }
    };

    const handlePrepare = async (job: JobMatch) => {
        try {
            setActionLoading(job.id);
            const data = await prepareForJob(job.id);
            if (data.session_id) {
                navigate(`/interview/${data.session_id}`);
            }
        } catch (err) {
            console.error('Failed to start preparation:', err);
            alert('Failed to start interview preparation.');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                    </div>
                    <p className="text-gray-400">Loading saved jobs...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <p className="text-red-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                    <div className="flex items-start gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-zinc-400 flex items-center justify-center flex-shrink-0">
                            <svg className="w-9 h-9 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-white mb-2">Saved Opportunities</h1>
                            <p className="text-gray-400">Manage jobs you've bookmarked and prepare for interviews.</p>
                        </div>
                        <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                            <span className="text-2xl font-bold text-white">{savedJobs.length}</span>
                            <span className="ml-2 text-gray-400 text-sm">saved</span>
                        </div>
                    </div>
                </div>

                {/* Empty State */}
                {savedJobs.length === 0 ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
                        <div className="text-6xl mb-4">📂</div>
                        <h2 className="text-2xl font-bold text-white mb-2">No saved jobs yet</h2>
                        <p className="text-gray-400 mb-6">Scan your resume in Live Jobs to find and save opportunities.</p>
                        <button 
                            onClick={() => navigate('/live-jobs')}
                            className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition-all"
                        >
                            Find Live Jobs
                        </button>
                    </div>
                ) : (
                    /* Job Cards */
                    <div className="space-y-4">
                        {savedJobs.map((job) => (
                            <div key={job.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all">
                                <div className="flex items-start gap-6">
                                    {/* Company Logo */}
                                    <div className="w-16 h-16 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {job.thumbnail ? (
                                            <img src={job.thumbnail} alt={job.company_name} className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        )}
                                    </div>

                                    {/* Job Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl font-bold text-white mb-1">{job.job_title}</h3>
                                        <p className="text-gray-400 mb-3">{job.company_name} • {job.location}</p>
                                        
                                        {/* Skills */}
                                        <div className="flex flex-wrap gap-2">
                                            {job.matched_skills.slice(0, 5).map(skill => (
                                                <span key={skill} className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400 font-medium">
                                                    ✓ {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Match Score */}
                                    <div className="text-right">
                                        <div className="text-3xl font-bold text-white">{job.match_percentage}%</div>
                                        <div className="text-xs text-gray-500 uppercase">Match</div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="mt-6 pt-6 border-t border-zinc-800 flex flex-wrap gap-3">
                                    <button 
                                        onClick={() => handleCreateRoadmap(job)}
                                        disabled={!!actionLoading}
                                        className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg font-medium hover:bg-zinc-700 transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                        </svg>
                                        {actionLoading === job.id ? 'Creating...' : 'Roadmap'}
                                    </button>
                                    <button 
                                        onClick={() => handlePrepare(job)}
                                        disabled={!!actionLoading}
                                        className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg font-medium hover:bg-zinc-700 transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                        {actionLoading === job.id ? 'Starting...' : 'Prepare'}
                                    </button>
                                    {job.apply_link ? (
                                        <a 
                                            href={job.apply_link} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-all flex items-center gap-2"
                                        >
                                            Apply Now
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    ) : (
                                        <button 
                                            disabled
                                            className="px-4 py-2 bg-zinc-800/50 text-gray-500 rounded-lg font-medium cursor-not-allowed"
                                        >
                                            No Link
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleUnsave(job.id)}
                                        className="ml-auto p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                        title="Remove from saved"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Resume Upload Dialog */}
            {showUploadDialog && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-white mb-4">Upload Resume</h2>
                        <p className="text-gray-400 mb-6">
                            To generate a personalized roadmap for <span className="text-white font-semibold">{selectedJob?.job_title}</span>, 
                            please upload your resume first.
                        </p>
                        
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingResume}
                                className="flex-1 px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
                            >
                                {uploadingResume ? 'Processing...' : 'Choose File'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowUploadDialog(false);
                                    setSelectedJob(null);
                                }}
                                disabled={uploadingResume}
                                className="px-6 py-3 bg-zinc-800 border border-zinc-700 text-white font-semibold rounded-xl hover:bg-zinc-700 transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-4">
                            Supported formats: PDF, DOC, DOCX
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
