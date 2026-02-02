import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { InterviewStart } from './components/InterviewStart';
import { CareerRoadmap } from './components/CareerRoadmap';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { Layout } from './components/Layout';
import { SavedRoadmaps } from './components/SavedRoadmaps';

import { RoadmapViewer } from './components/RoadmapViewer';
import { JobMatcher } from './components/JobMatcher';
import { LiveJobs } from './components/LiveJobs';
import { SavedJobs } from './components/SavedJobs';
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
                <Route path="/upload" element={<InterviewStart />} />
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
