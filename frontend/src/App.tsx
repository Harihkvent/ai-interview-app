import React, { useState } from 'react';
import { uploadResume } from './api';
import { CareerRoadmap } from './components/CareerRoadmap';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { Navbar } from './components/Navbar';
import { SavedRoadmaps } from './components/SavedRoadmaps';
import { RoadmapViewer } from './components/RoadmapViewer';
import { JobMatcher } from './components/JobMatcher';
import { LiveJobs } from './components/LiveJobs';
import { QuestionGenerator } from './components/QuestionGenerator';
import { InterviewSession } from './components/InterviewSession';
import { useAuth } from './contexts/AuthContext';
import './index.css';

type InterviewStage = 'dashboard' | 'upload' | 'analyzing' | 'jobMatches' | 'roadmap' | 'savedRoadmaps' | 'interview_session' | 'liveJobs' | 'questionGen';

function App() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [stage, setStage] = useState<InterviewStage>('dashboard');
    const [sessionId, setSessionId] = useState<string | number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [viewRoadmapId, setViewRoadmapId] = useState<string | null>(null);

    const handleFileSelect = (file: File) => {
        if (file && (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
            setResumeFile(file);
        } else {
            alert('Please upload a PDF or DOCX file');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    };

    const handleUploadResume = async () => {
        if (!resumeFile) return;

        setIsLoading(true);
        try {
            const data = await uploadResume(resumeFile);
            setSessionId(data.session_id);
            // Switch to the new Interview Session component
            setStage('interview_session');
        } catch (error) {
            console.error('Error uploading resume:', error);
            alert('Failed to upload resume. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNavigation = (page: string, params?: any) => {
        // Handle direct navigation to specific items/sessions
        if (params?.resumeSessionId) {
            setSessionId(params.resumeSessionId);
            setStage('interview_session'); 
            return;
        }

        if (params?.selectedId) {
            setViewRoadmapId(params.selectedId);
            setStage('roadmap');
            return;
        }

        switch (page) {
            case 'dashboard':
                setStage('dashboard');
                break;
            case 'interview':
                setStage('upload');
                break;
            case 'jobs':
                setStage('jobMatches');
                break;
            case 'live_jobs':
                setStage('liveJobs');
                break;
            case 'roadmaps':
                setStage('savedRoadmaps');
                break;
            case 'question_gen':
                setStage('questionGen');
                break;
        }
    };

    // ============= AUTH PROTECTION =============
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl animate-pulse mb-4">🔐</div>
                    <p className="text-xl text-gray-300">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <AuthPage onSuccess={() => setStage('dashboard')} />;
    }

    const renderStageContent = () => {
        switch (stage) {
            case 'dashboard':
                return (
                    <Dashboard
                        onStartNewInterview={() => setStage('upload')}
                        onViewRoadmaps={() => handleNavigation('roadmaps')}
                        onNavigate={handleNavigation}
                    />
                );
            case 'upload':
                return (
                    <div className="p-4">
                        <div className="max-w-7xl mx-auto mb-6">
                            <div className="glass-card p-4 flex items-center justify-between">
                                <button
                                    onClick={() => setStage('dashboard')}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <span>←</span>
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
                                        Upload your resume to begin your personalized interview
                                    </p>
                                </div>

                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${isDragging
                                        ? 'border-primary-400 bg-primary-400/10'
                                        : 'border-gray-600 hover:border-primary-400'
                                        }`}
                                >
                                    <div className="space-y-4">
                                        <div className="text-6xl">📄</div>
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

                                {resumeFile && (
                                    <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">✓</span>
                                            <div>
                                                <p className="font-medium">{resumeFile.name}</p>
                                                <p className="text-sm text-gray-400">{(resumeFile.size / 1024).toFixed(2)} KB</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setResumeFile(null)} className="text-red-400 hover:text-red-300">Remove</button>
                                    </div>
                                )}

                                <button
                                    onClick={handleUploadResume}
                                    disabled={!resumeFile || isLoading}
                                    className="btn-primary w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Uploading...' : 'Start Interview'}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case 'analyzing':
                return (
                    <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
                        <div className="glass-card p-12 max-w-2xl w-full text-center space-y-6">
                            <div className="text-6xl animate-pulse">🔍</div>
                            <h2 className="text-3xl font-bold">Analyzing Your Resume...</h2>
                            <p className="text-gray-300">Our AI is matching your skills with 63,000+ job roles using advanced ML</p>
                            <div className="flex justify-center gap-2">
                                <div className="w-3 h-3 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-3 h-3 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-3 h-3 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                );
            case 'jobMatches':
                return (
                    <JobMatcher 
                        sessionId={sessionId}
                        onSessionIdChange={setSessionId}
                        onRoadmapGenerated={() => setStage('roadmap')} 
                    />
                );
            case 'roadmap':
                if (viewRoadmapId) {
                    return (
                        <RoadmapViewer
                            roadmapId={viewRoadmapId}
                            onBack={() => {
                                setViewRoadmapId(null);
                                setStage('savedRoadmaps');
                            }}
                        />
                    );
                }
                return sessionId ? (
                    <CareerRoadmap
                        sessionId={sessionId.toString()}
                        onProceedToInterview={async () => {
                            setStage('interview_session');
                        }}
                    />
                ) : null;
            case 'savedRoadmaps':
                return <SavedRoadmaps onViewRoadmap={(id) => { setViewRoadmapId(id); setStage('roadmap'); }} />;
            case 'interview_session':
                return sessionId ? (
                    <InterviewSession 
                        sessionId={sessionId.toString()} 
                        onComplete={() => setStage('dashboard')}
                        onExit={() => setStage('dashboard')}
                    />
                ) : (
                    <div className="p-12 text-center text-error-400">Session ID missing</div>
                );
            case 'liveJobs':
                return <LiveJobs />;
            case 'questionGen':
                return (
                    <QuestionGenerator 
                        onSessionCreated={(sid) => {
                            setSessionId(sid);
                            setStage('interview_session');
                        }}
                    />
                );
            default:
                return (
                    <div className="flex items-center justify-center p-12 text-center h-[calc(100vh-80px)]">
                        <div className="glass-card p-12 max-w-lg">
                            <div className="text-6xl mb-6">🔄</div>
                            <h2 className="text-2xl font-bold mb-4">Initializing...</h2>
                            <button onClick={() => setStage('dashboard')} className="btn-primary">Go to Dashboard</button>
                        </div>
                    </div>
                );
        }
    };

    const getNavbarPage = () => {
        switch (stage) {
            case 'dashboard': return 'dashboard';
            case 'upload': 
            case 'interview_session':
                return 'interview';
            case 'jobMatches': return 'jobs';
            case 'liveJobs': return 'live_jobs';
            case 'questionGen': return 'question_gen';
            case 'roadmap': 
            case 'savedRoadmaps': return 'roadmaps';
            default: return 'dashboard';
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar currentPage={getNavbarPage()} onNavigate={handleNavigation} />
            <div className="flex-1 overflow-auto">
                {renderStageContent()}
            </div>
        </div>
    );
}

export default App;
