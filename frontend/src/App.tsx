import { useState, useEffect } from 'react';
import { uploadResume, startRound, submitAnswer, getNextRound, downloadReport, switchRound, getRoundsStatus } from './api';
import { CareerRoadmap } from './components/CareerRoadmap';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { Navbar } from './components/Navbar';
import { SavedRoadmaps } from './components/SavedRoadmaps';
import { RoadmapViewer } from './components/RoadmapViewer';
import { JobMatcher } from './components/JobMatcher';
import { LiveJobs } from './components/LiveJobs';
import { QuestionGenerator } from './components/QuestionGenerator';
import { useAuth } from './contexts/AuthContext';
import './index.css';
import React from 'react';

type InterviewStage = 'dashboard' | 'upload' | 'analyzing' | 'jobMatches' | 'roadmap' | 'savedRoadmaps' | 'round' | 'question' | 'evaluation' | 'transition' | 'complete' | 'liveJobs' | 'questionGen';
type RoundType = 'aptitude' | 'technical' | 'hr';

interface Question {
    id: number;
    text: string;
    number: number;
    type?: 'mcq' | 'descriptive';
    options?: string[];
}

interface EvaluationResult {
    evaluation: string;
    score: number;
    next_question: Question | null;
    round_complete: boolean;
    interview_complete: boolean;
}

function App() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [stage, setStage] = useState<InterviewStage>('dashboard');
    const [sessionId, setSessionId] = useState<string | number | null>(null);
    const [currentRound, setCurrentRound] = useState<RoundType | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [answer, setAnswer] = useState('');
    const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [timer, setTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [viewRoadmapId, setViewRoadmapId] = useState<string | null>(null);
    const [roundsStatus, setRoundsStatus] = useState<any[]>([]);
    const [showRoundSelector, setShowRoundSelector] = useState(false);

    // Timer effect
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTimerRunning]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

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
            
            // Start the interview process directly
            await loadNextRound(data.session_id);
            setStage('round');
        } catch (error) {
            console.error('Error uploading resume:', error);
            alert('Failed to upload resume. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const loadNextRound = async (sid: string | number) => {
        try {
            const data = await getNextRound(sid);
            if (data.round_type) {
                setCurrentRound(data.round_type);
            } else {
                setStage('complete');
            }
        } catch (error) {
            console.error('Error loading next round:', error);
        }
    };

    const loadRoundsStatus = async (sid: string | number) => {
        try {
            const data = await getRoundsStatus(sid);
            setRoundsStatus(data.rounds || []);
        } catch (error) {
            console.error('Error loading rounds status:', error);
        }
    };

    const handleSwitchRound = async (roundType: RoundType) => {
        if (!sessionId) return;
        setIsLoading(true);
        try {
            const data = await switchRound(sessionId, roundType);
            setCurrentRound(roundType);
            if (data.current_question) {
                setCurrentQuestion(data.current_question);
                setTotalQuestions(data.total_questions);
                setStage('question');
                setTimer(0);
                setIsTimerRunning(true);
            } else {
                setStage('round');
            }
            await loadRoundsStatus(sessionId);
            setShowRoundSelector(false);
        } catch (error) {
            console.error('Error switching round:', error);
            alert('Failed to switch round.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (sessionId && stage !== 'upload') {
            loadRoundsStatus(sessionId);
        }
    }, [sessionId, stage]);

    const handleStartRound = async () => {
        if (!sessionId || !currentRound) return;

        setIsLoading(true);
        try {
            const data = await startRound(sessionId, currentRound);
            if (data.current_question) {
                setCurrentQuestion(data.current_question);
                setTotalQuestions(data.total_questions);
                setStage('question');
                setTimer(0);
                setIsTimerRunning(true);
            } else {
                alert('No questions were generated for this round. Please try switching to a different round or restarting.');
            }
        } catch (error) {
            console.error('Error starting round:', error);
            alert('Failed to start round. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitAnswer = async () => {
        if (!currentQuestion || !answer.trim()) return;

        setIsLoading(true);
        setIsTimerRunning(false);

        try {
            const data = await submitAnswer(currentQuestion.id, answer.trim(), timer);
            setEvaluation(data);
            setStage('evaluation');
            setAnswer('');
        } catch (error) {
            console.error('Error submitting answer:', error);
            alert('Failed to submit answer. Please try again.');
            setIsTimerRunning(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNextQuestion = () => {
        if (!evaluation) return;

        if (evaluation.interview_complete) {
            setStage('complete');
        } else if (evaluation.round_complete) {
            setStage('transition');
        } else if (evaluation.next_question) {
            setCurrentQuestion(evaluation.next_question);
            setEvaluation(null);
            setStage('question');
            setTimer(0);
            setIsTimerRunning(true);
        }
    };

    const handleNextRound = async () => {
        if (!sessionId) return;
        await loadNextRound(sessionId);
        setStage('round');
    };

    const handleDownloadReport = async () => {
        if (!sessionId) return;

        try {
            const blob = await downloadReport(sessionId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `interview-report-${sessionId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading report:', error);
            alert('Failed to download report. Please try again.');
        }
    };

    const handleNavigation = (page: string, params?: any) => {
        
        // Handle direct navigation to specific items/sessions
        if (params?.resumeSessionId) {
            setSessionId(params.resumeSessionId);
            // Must load state for existing session
            loadRoundsStatus(params.resumeSessionId);
            loadNextRound(params.resumeSessionId);
            setStage('round'); 
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

    const getRoundColor = (round: RoundType) => {
        const colors = {
            aptitude: 'from-blue-500 to-cyan-500',
            technical: 'from-purple-500 to-pink-500',
            hr: 'from-green-500 to-emerald-500'
        };
        return colors[round];
    };

    const getRoundIcon = (round: RoundType) => {
        const icons = {
            aptitude: '🧠',
            technical: '💻',
            hr: '👥'
        };
        return icons[round];
    };

    const getRoundStatusBadge = (status: string) => {
        const badges = {
            pending: { text: 'Not Started', color: 'bg-gray-500/20 text-gray-300' },
            active: { text: 'In Progress', color: 'bg-blue-500/20 text-blue-300' },
            completed: { text: 'Completed', color: 'bg-green-500/20 text-green-300' }
        };
        return badges[status as keyof typeof badges] || badges.pending;
    };

    const RoundSelector = () => (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRoundSelector(false)}>
            <div className="glass-card p-8 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Select Round</h2>
                    <button onClick={() => setShowRoundSelector(false)} className="text-gray-400 hover:text-white text-2xl">
                        ×
                    </button>
                </div>
                <div className="space-y-4">
                    {roundsStatus.map((round) => {
                        const badge = getRoundStatusBadge(round.status);
                        const isCurrentRound = round.is_current;
                        return (
                            <button
                                key={round.round_type}
                                onClick={() => handleSwitchRound(round.round_type as RoundType)}
                                disabled={isLoading}
                                className={`w-full p-6 rounded-xl border-2 transition-all text-left ${isCurrentRound ? 'border-primary-400 bg-primary-400/10' : 'border-white/20 hover:border-primary-400 bg-white/5'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className="text-4xl">{getRoundIcon(round.round_type as RoundType)}</span>
                                        <div>
                                            <h3 className={`text-xl font-bold bg-gradient-to-r ${getRoundColor(round.round_type as RoundType)} bg-clip-text text-transparent`}>
                                                {round.round_type.charAt(0).toUpperCase() + round.round_type.slice(1)} Round
                                            </h3>
                                            <p className="text-sm text-gray-400">
                                                {round.answered_questions} / {round.total_questions} questions answered
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
                                            {badge.text}
                                        </span>
                                        {isCurrentRound && <span className="text-xs text-primary-400 font-semibold">Current</span>}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    // ============= AUTH PROTECTION =============
    // Show loading while checking auth
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

    // Show login page if not authenticated
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
                            await loadNextRound(sessionId);
                            setStage('round');
                        }}
                    />
                ) : null;
            case 'savedRoadmaps':
                return <SavedRoadmaps onViewRoadmap={(id) => { setViewRoadmapId(id); setStage('roadmap'); }} />;
            case 'round':
                return currentRound ? (
                    <div className="flex items-center justify-center p-4 h-[calc(100vh-80px)]">
                        <div className="glass-card p-12 max-w-2xl w-full text-center space-y-8">
                            <div className="text-8xl mb-4">{getRoundIcon(currentRound)}</div>
                            <h1 className={`text-5xl font-bold bg-gradient-to-r ${getRoundColor(currentRound)} bg-clip-text text-transparent`}>
                                {currentRound.charAt(0).toUpperCase() + currentRound.slice(1)} Round
                            </h1>
                            <p className="text-xl text-gray-300">Get ready to answer questions tailored to your resume</p>
                            <button
                                onClick={handleStartRound}
                                disabled={isLoading}
                                className="btn-primary w-full text-lg"
                            >
                                {isLoading ? 'Loading Questions...' : 'Begin Round'}
                            </button>
                        </div>
                    </div>
                ) : null;
            case 'question':
                if (!currentQuestion || !currentRound) return null;
                const isVoiceMode = currentRound === 'hr';
                return (
                    <div className="flex-1 flex flex-col p-4">
                        {showRoundSelector && <RoundSelector />}
                        <header className="glass-card p-4 mb-4">
                            <div className="flex items-center justify-between max-w-4xl mx-auto">
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl">{getRoundIcon(currentRound)}</span>
                                    <div>
                                        <h2 className={`text-xl font-bold bg-gradient-to-r ${getRoundColor(currentRound)} bg-clip-text text-transparent`}>
                                            {currentRound.charAt(0).toUpperCase() + currentRound.slice(1)} Round
                                        </h2>
                                        <p className="text-sm text-gray-400">Question {currentQuestion.number} of {totalQuestions}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-3xl font-mono font-bold text-primary-400">{formatTime(timer)}</div>
                                        <p className="text-xs text-gray-400">Time Elapsed</p>
                                    </div>
                                    <button onClick={() => setShowRoundSelector(true)} className="px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 rounded-lg transition-colors text-sm">Switch Round</button>
                                    <button onClick={() => setStage('dashboard')} className="px-4 py-2 bg-warning-500/20 hover:bg-warning-500/30 text-warning-300 rounded-lg transition-colors text-sm">Pause</button>
                                    <button onClick={() => setStage('complete')} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors text-sm">End Interview</button>
                                </div>
                            </div>
                        </header>
                        <main className="flex-1 flex items-center justify-center">
                            <div className="glass-card p-8 max-w-4xl w-full space-y-6">
                                <div className="bg-white/5 rounded-xl p-6">
                                    <p className="text-2xl text-gray-100 leading-relaxed">{currentQuestion.text}</p>
                                </div>
                                {currentQuestion.type === 'mcq' ? (
                                    <div className="grid gap-3">
                                        {currentQuestion.options?.map((option, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setAnswer(option)}
                                                className={`p-4 text-left rounded-xl border-2 transition-all ${answer === option ? 'border-primary-500 bg-primary-500/10 text-white' : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/30'}`}
                                            >
                                                <span className="inline-block w-8 font-bold text-primary-400">{String.fromCharCode(65 + idx)}.</span>
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <textarea
                                            value={answer}
                                            onChange={(e) => setAnswer(e.target.value)}
                                            placeholder={isVoiceMode ? "Your spoken answer will appear here..." : "Type your answer here..."}
                                            rows={8}
                                            className="w-full bg-white/10 border border-white/20 rounded-xl px-5 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                        />
                                        {isVoiceMode && (
                                            <div className="flex justify-center">
                                                <button onClick={() => {
                                                    const recognition = new (window as any).webkitSpeechRecognition();
                                                    recognition.onresult = (event: any) => setAnswer(event.results[0][0].transcript);
                                                    recognition.start();
                                                }} className="flex items-center gap-2 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-full border border-red-500/30 transition-all font-bold">
                                                    🎤 Speak Answer
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <button onClick={handleSubmitAnswer} disabled={!answer.trim() || isLoading} className="btn-primary w-full text-lg disabled:opacity-50">
                                    {isLoading ? 'Evaluating...' : 'Submit Answer'}
                                </button>
                            </div>
                        </main>
                    </div>
                );
            case 'evaluation':
                if (!evaluation || !currentQuestion || !currentRound) return null;
                return (
                    <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
                        <div className="glass-card p-8 max-w-4xl w-full space-y-6">
                            <div className="text-center">
                                <div className="text-6xl mb-4">{evaluation.score >= 8 ? '🌟' : evaluation.score >= 6 ? '👍' : '💪'}</div>
                                <h2 className="text-3xl font-bold mb-2">Answer Evaluated</h2>
                                <div className="flex items-center justify-center gap-4">
                                    <div className="text-5xl font-bold text-primary-400">{evaluation.score.toFixed(1)}/10</div>
                                    <div className="text-left text-sm text-gray-400">
                                        <p>Time taken: {formatTime(timer)}</p>
                                        <p>Question {currentQuestion.number} of {totalQuestions}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-6">
                                <h3 className="font-semibold text-primary-300 mb-3">Feedback:</h3>
                                <p className="text-gray-200 leading-relaxed">{evaluation.evaluation}</p>
                            </div>
                            <button onClick={handleNextQuestion} className="btn-primary w-full text-lg">
                                {evaluation.interview_complete ? 'View Results' : evaluation.round_complete ? 'Next Round' : 'Next Question'}
                            </button>
                        </div>
                    </div>
                );
            case 'transition':
                return currentRound ? (
                    <div className="flex items-center justify-center p-4 h-[calc(100vh-80px)]">
                        <div className="glass-card p-12 max-w-2xl w-full text-center space-y-8">
                            <div className="text-6xl mb-4">✅</div>
                            <h1 className="text-4xl font-bold">{currentRound.charAt(0).toUpperCase() + currentRound.slice(1)} Round Complete!</h1>
                            <p className="text-xl text-gray-300">Great job! Ready for the next round?</p>
                            <button onClick={handleNextRound} className="btn-primary w-full text-lg">Continue to Next Round</button>
                        </div>
                    </div>
                ) : null;
            case 'complete':
                return (
                    <div className="flex items-center justify-center p-4 h-[calc(100vh-80px)]">
                        <div className="glass-card p-12 max-w-2xl w-full text-center space-y-8">
                            <div className="text-8xl mb-4">🎉</div>
                            <h1 className="text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Interview Complete!</h1>
                            <p className="text-xl text-gray-300">Congratulations on completing all rounds. Your performance report is ready.</p>
                            <div className="bg-white/5 rounded-xl p-6">
                                <p className="text-gray-300 mb-4">Download your comprehensive interview report with:</p>
                                <ul className="text-left space-y-2 text-gray-300">
                                    <li>✓ Detailed performance analysis</li>
                                    <li>✓ Question-by-question evaluation</li>
                                    <li>✓ Strengths and areas for improvement</li>
                                    <li>✓ Time management insights</li>
                                </ul>
                            </div>
                            <button onClick={handleDownloadReport} className="btn-primary w-full text-lg">📥 Download Report (PDF)</button>
                        </div>
                    </div>
                );
            case 'liveJobs':
                return <LiveJobs />;
            case 'questionGen':
                return <QuestionGenerator />;
            default:
                return (
                    <div className="flex items-center justify-center p-12 text-center h-[calc(100vh-80px)]">
                        <div className="glass-card p-12 max-w-lg">
                            <div className="text-6xl mb-6">🔄</div>
                            <h2 className="text-2xl font-bold mb-4">Initializing Your Experience</h2>
                            <p className="text-gray-400 mb-8">We're setting up your practice session. If this takes too long, please try refreshing.</p>
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
            case 'round': 
            case 'question': 
            case 'evaluation': 
            case 'transition': 
            case 'complete': return 'interview';
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
