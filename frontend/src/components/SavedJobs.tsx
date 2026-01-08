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
            
            // Check if error is due to missing resume
            if (err.response?.status === 404 || err.response?.status === 500) {
                // Show upload dialog
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
            
            // Upload resume
            await uploadResume(file, 'job_match', 'Job Matching');
            
            // Now generate roadmap
            const sessionId = (selectedJob as any).session_id || 'placeholder-session';
            await generateRoadmap(sessionId, selectedJob.job_title);
            
            // Close dialog and navigate
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

    if (loading) return (
        <div className="p-8 flex justify-center">
            <div className="animate-spin text-4xl">⏳</div>
        </div>
    );

    if (error) return <div className="p-8 text-error-500">{error}</div>;

    return (
        <div className="min-h-screen p-4 pb-20">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="glass-card p-8 bg-gradient-to-br from-red-900/10 to-transparent">
                    <h1 className="text-4xl font-bold text-white mb-2">Saved Opportunities</h1>
                    <p className="text-gray-400">Manage the jobs you've tagged for later and prepare for interviews.</p>
                </div>

                {savedJobs.length === 0 ? (
                    <div className="glass-card p-12 text-center text-gray-400">
                        <div className="text-6xl mb-4">📂</div>
                        <p className="text-xl">No saved jobs yet.</p>
                        <p className="mt-2">Scan your resume in Live Jobs to find and save opportunities.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {savedJobs.map((job) => (
                            <div key={job.id} className="glass-card p-6 border border-white/10 flex flex-col md:flex-row gap-6 items-center">
                                {job.thumbnail && (
                                    <img src={job.thumbnail} alt={job.company_name} className="w-16 h-16 rounded-lg bg-white p-2 object-contain" />
                                )}
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-xl font-bold text-white">{job.job_title}</h3>
                                    <p className="text-secondary-300">{job.company_name} • {job.location}</p>
                                    <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start text-xs">
                                        {job.matched_skills.slice(0, 5).map(s => (
                                            <span key={s} className="px-2 py-1 bg-green-500/10 text-green-400 rounded">✓ {s}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    <button 
                                        onClick={() => handleCreateRoadmap(job)}
                                        disabled={!!actionLoading}
                                        className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all text-sm font-medium disabled:opacity-50"
                                    >
                                        {actionLoading === job.id ? 'Creating...' : '🗺️ Roadmap'}
                                    </button>
                                    <button 
                                        onClick={() => handlePrepare(job)}
                                        disabled={!!actionLoading}
                                        className="px-4 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 transition-all text-sm font-medium disabled:opacity-50"
                                    >
                                        {actionLoading === job.id ? 'Starting...' : '🎓 Prepare'}
                                    </button>
                                    {job.apply_link ? (
                                        <a 
                                            href={job.apply_link} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-secondary-600 hover:bg-secondary-500 rounded-lg text-white font-bold transition-all text-sm flex items-center gap-2"
                                        >
                                            Apply Now ↗
                                        </a>
                                    ) : (
                                        <button 
                                            disabled
                                            className="px-4 py-2 bg-gray-600/50 text-gray-400 rounded-lg font-bold text-sm cursor-not-allowed border border-white/5"
                                            title="No application link available"
                                        >
                                            No Link
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleUnsave(job.id)}
                                        className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all border border-red-500/20"
                                        title="Remove from saved"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Resume Upload Dialog */}
            {showUploadDialog && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-8 max-w-md w-full border border-white/20">
                        <h2 className="text-2xl font-bold text-white mb-4">📄 Upload Resume</h2>
                        <p className="text-gray-300 mb-6">
                            To generate a personalized roadmap for <span className="text-blue-400 font-semibold">{selectedJob?.job_title}</span>, 
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
                                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploadingResume ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="animate-spin">⏳</div>
                                        Processing...
                                    </span>
                                ) : (
                                    '📁 Choose File'
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    setShowUploadDialog(false);
                                    setSelectedJob(null);
                                }}
                                disabled={uploadingResume}
                                className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                        
                        <p className="text-xs text-gray-400 mt-4">
                            Supported formats: PDF, DOC, DOCX
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
