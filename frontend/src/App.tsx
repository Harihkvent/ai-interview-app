import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { uploadResume } from './api';
import { CareerRoadmap } from './components/CareerRoadmap';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { Layout } from './components/Layout';
import { SavedRoadmaps } from './components/SavedRoadmaps';

import { RoadmapViewer } from './components/RoadmapViewer';
import { JobMatcher } from './components/JobMatcher';
import { LiveJobs } from './components/LiveJobs';
import { SavedJobs } from './components/SavedJobs';
import { QuestionGenerator } from './components/QuestionGenerator';
import { InterviewSession } from './components/InterviewSession';
import { useAuth } from './contexts/AuthContext';
import { AgentOverlay } from './components/AgentOverlay';
import { AiInsightsPage } from './components/AiInsightsPage';
import { ProfilePage } from './components/ProfilePage';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ScheduleInterview } from './components/ScheduleInterview';
import { SkillTests } from './components/SkillTests';
import { SkillTestSession } from './components/SkillTestSession';
import { SkillTestResults } from './components/SkillTestResults';
import { AvatarInterviewStart } from './components/AvatarInterviewStart';
import { AvatarInterviewSession } from './components/AvatarInterviewSession';
import './index.css';

function App() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [sessionId, setSessionId] = useState<string | number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);

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
            setSessionId(data.session_id);
            navigate(`/interview/${data.session_id}`);
        } catch (error) {
            console.error('Error uploading resume:', error);
            alert('Failed to upload resume. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

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
        return <AuthPage onSuccess={() => navigate('/dashboard')} />;
    }

    return (
        <Layout>
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={
                    <Dashboard
                        onStartNewInterview={() => navigate('/upload')}
                        onViewRoadmaps={() => navigate('/roadmaps')}
                        onNavigate={(page, params) => {
                            if (params?.resumeSessionId) {
                                navigate(`/interview/${params.resumeSessionId}`);
                            } else if (params?.selectedId) {
                                navigate(`/roadmaps/${params.selectedId}`);
                            } else {
                                navigate(`/${page}`);
                            }
                        }}
                    />
                } />
                <Route path="/upload" element={
                    <div className="p-4">
                        <div className="max-w-7xl mx-auto mb-6">
                            <div className="glass-card p-4 flex items-center justify-between">
                                <button
                                    onClick={() => navigate('/dashboard')}
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
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; handleFileSelect(file); }}
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
                } />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/jobs" element={
                    <JobMatcher 
                        sessionId={sessionId?.toString()}
                        onSessionIdChange={setSessionId}
                        onRoadmapGenerated={() => navigate('/roadmap')} 
                    />
                } />
                <Route path="/roadmap" element={
                    sessionId ? (
                        <CareerRoadmap
                            sessionId={sessionId.toString()}
                            onProceedToInterview={async () => {
                                navigate(`/interview/${sessionId}`);
                            }}
                        />
                    ) : <Navigate to="/dashboard" replace />
                } />
                <Route path="/roadmaps" element={
                    <SavedRoadmaps onViewRoadmap={(id) => navigate(`/roadmaps/${id}`)} />
                } />
                <Route path="/insights" element={<AiInsightsPage />} />
                <Route path="/roadmaps/:id" element={
                    <RoadmapViewer
                        onBack={() => navigate('/roadmaps')}
                    />
                } />
                <Route path="/interview/:id" element={
                    <InterviewSession 
                        onComplete={() => navigate('/dashboard')}
                        onExit={() => navigate('/dashboard')}
                    />
                } />
                <Route path="/live-jobs" element={<LiveJobs />} />
                <Route path="/saved-jobs" element={<SavedJobs />} />
                <Route path="/question-gen" element={
                    <QuestionGenerator 
                        onSessionCreated={(sid) => navigate(`/interview/${sid}`)}
                    />
                } />
                <Route path="/analytics" element={
                    <AnalyticsDashboard />
                } />
                <Route path="/schedule" element={
                    <ScheduleInterview />
                } />
                <Route path="/skill-tests" element={
                    <SkillTests />
                } />
                <Route path="/skill-tests/results/:attemptId" element={
                    <SkillTestResults />
                } />
                <Route path="/skill-tests/:attemptId" element={
                    <SkillTestSession />
                } />
                <Route path="/avatar-interview/start" element={
                    <AvatarInterviewStart />
                } />
                <Route path="/avatar-interview/:id" element={
                    <AvatarInterviewSession />
                } />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            {isAuthenticated && <AgentOverlay />}
        </Layout>
    );

}

export default App;
