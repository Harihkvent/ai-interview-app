import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadResume, getSavedResumes, analyzeSavedResume } from '../api';
import { 
  FileText, 
  FolderOpen, 
  Upload, 
  Check, 
  ArrowLeft, 
  ArrowRight,
  Loader2
} from 'lucide-react';

interface SavedResume {
    id: string;
    name: string;
    filename: string;
    uploaded_at: string;
    candidate_name?: string;
}

export const InterviewStart: React.FC = () => {
    const navigate = useNavigate();
    const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingResumes, setLoadingResumes] = useState(true);

    useEffect(() => {
        loadSavedResumes();
    }, []);

    const loadSavedResumes = async () => {
        try {
            const resumes = await getSavedResumes();
            setSavedResumes(resumes || []);
        } catch (error) {
            console.error('Error loading saved resumes:', error);
        } finally {
            setLoadingResumes(false);
        }
    };

    const handleFileSelect = (file: File) => {
        if (file && (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
            setResumeFile(file);
        } else {
            alert('Please upload a PDF or DOCX file');
        }
    };

    const handleUploadResume = async () => {
        if (!resumeFile) return;

        setIsLoading(true);
        try {
            const data = await uploadResume(resumeFile);
            navigate(`/interview/${data.session_id}`);
        } catch (error) {
            console.error('Error uploading resume:', error);
            alert('Failed to upload resume. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectSavedResume = async (resumeId: string) => {
        setIsLoading(true);
        try {
            const data = await analyzeSavedResume(resumeId, 'interview', 'General Interview');
            navigate(`/interview/${data.session_id}`);
        } catch (error) {
            console.error('Error starting interview with saved resume:', error);
            alert('Failed to start interview. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4">
            <div className="max-w-7xl mx-auto mb-6">
                <div className="glass-card p-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <ArrowLeft size={18} />
                        <span>Back to Dashboard</span>
                    </button>
                    <h2 className="text-lg font-semibold">New Interview</h2>
                    <div className="w-32"></div>
                </div>
            </div>

            <div className="flex items-center justify-center">
                <div className="glass-card p-12 max-w-2xl w-full space-y-8">
                    <div className="text-center space-y-4">
                        <h1 className="text-6xl font-bold bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                            AI Interview System
                        </h1>
                        <p className="text-xl text-gray-300">
                            Select an existing resume or upload a new one to begin
                        </p>
                    </div>

                    {/* Saved Resumes Section */}
                    {loadingResumes ? (
                        <div className="text-center py-4">
                            <Loader2 size={32} className="animate-spin text-primary-500" />
                            <p className="text-gray-400 text-sm">Loading your resumes...</p>
                        </div>
                    ) : savedResumes.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                                <FolderOpen size={16} className="inline mr-1" /> Your Saved Resumes
                            </h3>
                            <div className="grid gap-3 max-h-60 overflow-y-auto">
                                {savedResumes.slice(0, 5).map(resume => (
                                    <button
                                        key={resume.id}
                                        onClick={() => handleSelectSavedResume(resume.id)}
                                        disabled={isLoading}
                                        className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary-500/50 rounded-xl transition-all text-left group disabled:opacity-50"
                                    >
                                        <FileText size={24} className="text-primary-400 group-hover:scale-110 transition-transform" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-white truncate">
                                                {resume.candidate_name || resume.name || resume.filename}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {resume.filename} • Uploaded {new Date(resume.uploaded_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <span className="text-primary-400 opacity-0 group-hover:opacity-100 transition-all font-medium">
                                            Start <ArrowRight size={16} className="inline" />
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Divider */}
                    {savedResumes.length > 0 && (
                        <div className="flex items-center gap-4">
                            <div className="h-px flex-1 bg-white/10"></div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">or upload new</span>
                            <div className="h-px flex-1 bg-white/10"></div>
                        </div>
                    )}

                    {/* Upload Area */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; handleFileSelect(file); }}
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragging
                            ? 'border-primary-400 bg-primary-400/10'
                            : 'border-gray-600 hover:border-primary-400'
                            }`}
                    >
                        <div className="space-y-4">
                            <Upload size={48} className="text-gray-400" />
                            <div>
                                <p className="text-lg text-gray-300 mb-2">Drag and drop your resume here</p>
                                <p className="text-sm text-gray-400 mb-4">or</p>
                                <label className="btn-primary cursor-pointer inline-block">
                                    Browse Files
                                    <input
                                        type="file"
                                        accept=".pdf,.docx"
                                        onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            <p className="text-xs text-gray-500">Supported formats: PDF, DOCX (Max 5MB)</p>
                        </div>
                    </div>

                    {/* Selected File Display */}
                    {resumeFile && (
                        <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Check size={24} className="text-green-500" />
                                <div>
                                    <p className="font-medium">{resumeFile.name}</p>
                                    <p className="text-sm text-gray-400">{(resumeFile.size / 1024).toFixed(2)} KB</p>
                                </div>
                            </div>
                            <button onClick={() => setResumeFile(null)} className="text-red-400 hover:text-red-300">Remove</button>
                        </div>
                    )}

                    {/* Upload Button - only shown when file is selected */}
                    {resumeFile && (
                        <button
                            onClick={handleUploadResume}
                            disabled={isLoading}
                            className="btn-primary w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Starting Interview...' : 'Start Interview with New Resume'}
                        </button>
                    )}

                    {/* Loading Overlay */}
                    {isLoading && (
                        <div className="text-center py-4">
                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-primary-500 animate-progress"></div>
                            </div>
                            <p className="text-sm text-primary-400 animate-pulse mt-2 font-medium">
                                Preparing your personalized interview...
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
