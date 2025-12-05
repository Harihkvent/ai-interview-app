import { useState, useEffect } from 'react';
import { uploadResume, startRound, submitAnswer, getNextRound, downloadReport } from './api';
import './index.css';
import React from 'react';

type InterviewStage = 'upload' | 'round' | 'question' | 'evaluation' | 'transition' | 'complete';
type RoundType = 'aptitude' | 'technical' | 'hr';

interface Question {
    id: number;
    text: string;
    number: number;
}

interface EvaluationResult {
    evaluation: string;
    score: number;
    next_question: Question | null;
    round_complete: boolean;
    interview_complete: boolean;
}

function App() {
    const [stage, setStage] = useState<InterviewStage>('upload');
    const [sessionId, setSessionId] = useState<number | null>(null);
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
            setStage('round');
            await loadNextRound(data.session_id);
        } catch (error) {
            console.error('Error uploading resume:', error);
            alert('Failed to upload resume. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const loadNextRound = async (sid: number) => {
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

    const handleStartRound = async () => {
        if (!sessionId || !currentRound) return;

        setIsLoading(true);
        try {
            const data = await startRound(sessionId, currentRound);
            setCurrentQuestion(data.current_question);
            setTotalQuestions(data.total_questions);
            setStage('question');
            setTimer(0);
            setIsTimerRunning(true);
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
            a.download = `interview_report_${sessionId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading report:', error);
            alert('Failed to download report. Please try again.');
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

    // ============= UPLOAD STAGE =============
    if (stage === 'upload') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
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
                                <p className="text-lg text-gray-300 mb-2">
                                    Drag and drop your resume here
                                </p>
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
                                    <p className="text-sm text-gray-400">
                                        {(resumeFile.size / 1024).toFixed(2)} KB
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setResumeFile(null)}
                                className="text-red-400 hover:text-red-300"
                            >
                                Remove
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleUploadResume}
                        disabled={!resumeFile || isLoading}
                        className="btn-primary w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Uploading...' : 'Start Interview'}
                    </button>

                    <div className="bg-white/5 rounded-xl p-6 space-y-3">
                        <h3 className="font-semibold text-primary-300">Interview Structure:</h3>
                        <div className="space-y-2 text-sm text-gray-300">
                            <p>🧠 <strong>Aptitude Round:</strong> 5 logical reasoning questions</p>
                            <p>💻 <strong>Technical Round:</strong> 8 skill-based questions</p>
                            <p>👥 <strong>HR Round:</strong> 5 behavioral questions</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ============= ROUND INTRO STAGE =============
    if (stage === 'round' && currentRound) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-12 max-w-2xl w-full text-center space-y-8">
                    <div className="text-8xl mb-4">{getRoundIcon(currentRound)}</div>
                    <h1 className={`text-5xl font-bold bg-gradient-to-r ${getRoundColor(currentRound)} bg-clip-text text-transparent`}>
                        {currentRound.charAt(0).toUpperCase() + currentRound.slice(1)} Round
                    </h1>
                    <p className="text-xl text-gray-300">
                        Get ready to answer questions tailored to your resume
                    </p>
                    <button
                        onClick={handleStartRound}
                        disabled={isLoading}
                        className="btn-primary w-full text-lg"
                    >
                        {isLoading ? 'Loading Questions...' : 'Begin Round'}
                    </button>
                </div>
            </div>
        );
    }

    // ============= QUESTION STAGE =============
    if (stage === 'question' && currentQuestion && currentRound) {
        return (
            <div className="min-h-screen flex flex-col p-4">
                {/* Header */}
                <header className="glass-card p-4 mb-4">
                    <div className="flex items-center justify-between max-w-4xl mx-auto">
                        <div className="flex items-center gap-4">
                            <span className="text-2xl">{getRoundIcon(currentRound)}</span>
                            <div>
                                <h2 className={`text-xl font-bold bg-gradient-to-r ${getRoundColor(currentRound)} bg-clip-text text-transparent`}>
                                    {currentRound.charAt(0).toUpperCase() + currentRound.slice(1)} Round
                                </h2>
                                <p className="text-sm text-gray-400">
                                    Question {currentQuestion.number} of {totalQuestions}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-mono font-bold text-primary-400">
                                {formatTime(timer)}
                            </div>
                            <p className="text-xs text-gray-400">Time Elapsed</p>
                        </div>
                    </div>
                </header>

                {/* Question */}
                <main className="flex-1 flex items-center justify-center">
                    <div className="glass-card p-8 max-w-4xl w-full space-y-6">
                        <div className="bg-white/5 rounded-xl p-6">
                            <p className="text-2xl text-gray-100 leading-relaxed">
                                {currentQuestion.text}
                            </p>
                        </div>

                        <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Type your answer here..."
                            rows={8}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-5 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        />

                        <button
                            onClick={handleSubmitAnswer}
                            disabled={!answer.trim() || isLoading}
                            className="btn-primary w-full text-lg disabled:opacity-50"
                        >
                            {isLoading ? 'Evaluating...' : 'Submit Answer'}
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // ============= EVALUATION STAGE =============
    if (stage === 'evaluation' && evaluation && currentQuestion && currentRound) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-8 max-w-4xl w-full space-y-6">
                    <div className="text-center">
                        <div className="text-6xl mb-4">
                            {evaluation.score >= 8 ? '🌟' : evaluation.score >= 6 ? '👍' : '💪'}
                        </div>
                        <h2 className="text-3xl font-bold mb-2">Answer Evaluated</h2>
                        <div className="flex items-center justify-center gap-4">
                            <div className="text-5xl font-bold text-primary-400">
                                {evaluation.score.toFixed(1)}/10
                            </div>
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

                    <button
                        onClick={handleNextQuestion}
                        className="btn-primary w-full text-lg"
                    >
                        {evaluation.interview_complete
                            ? 'View Results'
                            : evaluation.round_complete
                                ? 'Next Round'
                                : 'Next Question'}
                    </button>
                </div>
            </div>
        );
    }

    // ============= TRANSITION STAGE =============
    if (stage === 'transition' && currentRound) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-12 max-w-2xl w-full text-center space-y-8">
                    <div className="text-6xl mb-4">✅</div>
                    <h1 className="text-4xl font-bold">
                        {currentRound.charAt(0).toUpperCase() + currentRound.slice(1)} Round Complete!
                    </h1>
                    <p className="text-xl text-gray-300">
                        Great job! Ready for the next round?
                    </p>
                    <button
                        onClick={handleNextRound}
                        className="btn-primary w-full text-lg"
                    >
                        Continue to Next Round
                    </button>
                </div>
            </div>
        );
    }

    // ============= COMPLETE STAGE =============
    if (stage === 'complete') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-12 max-w-2xl w-full text-center space-y-8">
                    <div className="text-8xl mb-4">🎉</div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                        Interview Complete!
                    </h1>
                    <p className="text-xl text-gray-300">
                        Congratulations on completing all rounds. Your performance report is ready.
                    </p>
                    <div className="bg-white/5 rounded-xl p-6">
                        <p className="text-gray-300 mb-4">
                            Download your comprehensive interview report with:
                        </p>
                        <ul className="text-left space-y-2 text-gray-300">
                            <li>✓ Detailed performance analysis</li>
                            <li>✓ Question-by-question evaluation</li>
                            <li>✓ Strengths and areas for improvement</li>
                            <li>✓ Time management insights</li>
                        </ul>
                    </div>
                    <button
                        onClick={handleDownloadReport}
                        className="btn-primary w-full text-lg"
                    >
                        📥 Download Report (PDF)
                    </button>
                </div>
            </div>
        );
    }

    return null;
}

export default App;
